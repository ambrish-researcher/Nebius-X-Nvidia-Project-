import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
test.use({ trace: "off" });
test.describe.configure({ retries: 0 });
// Explicit opt-in: one billable generation, on desktop only, no automatic retry.
test("live browser prompt reaches Nebius and returns a validated 3D robot", async ({
  page,
  request,
}, info) => {
  test.skip(
    process.env.RUN_LIVE_NEBIUS !== "1" || info.project.name !== "desktop",
    "Paid live test is opt-in and runs once on desktop.",
  );
  test.setTimeout(120_000);
  const errors: string[] = [];
  const destinations: string[] = [];
  let leaked = false;
  const key = process.env.NEBIUS_API_KEY;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (req) => {
    destinations.push(req.url());
    const clientData = JSON.stringify({
      headers: req.headers(),
      body: req.postData(),
      url: req.url(),
    });
    if (key && clientData.includes(key)) leaked = true;
    if (req.headers().authorization) leaked = true;
  });
  const before = await (await request.get("/api/usage")).json();
  expect(before.limit_usd).toBe(1);
  expect(before.charged_usd + before.reserved_usd).toBeLessThan(1);
  await page.goto("/");
  await expect(page.getByText("Connecting engineering services…")).toHaveCount(
    0,
  );
  const prompt =
    "Create a compact conceptual desktop camera inspection robot named Nemotron camera study. Use exactly three box components: a base structure, a pan actuator, and a camera sensor. Use one hinge joint on the actuator and one degree of freedom. Power budget 8 W. Keep explanations brief. State it is a concept without a supported physics adapter. No extra components. Study reference: " +
    Date.now();
  await page.getByLabel("What would you like to engineer?").fill(prompt);
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith("/api/generate") && r.request().method() === "POST",
    { timeout: 95_000 },
  );
  await page
    .getByRole("button", { name: "Generate robot with NVIDIA" })
    .click();
  const response = await responsePromise;
  const data = await response.json();
  expect(
    response.status(),
    typeof data.detail === "string" ? data.detail : "Generation failed",
  ).toBe(200);
  expect(data.cached).toBe(false);
  expect(data.model).toBe("nvidia/nemotron-3-super-120b-a12b");
  expect(data.robot.provenance).toBe("nebius");
  expect(data.robot.components.length).toBeGreaterThan(1);
  await expect(
    page.getByRole("heading", { name: data.robot.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("NVIDIA MODEL · VALIDATED SCHEMA")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Explore the components" }).click();
  await page
    .getByRole("button", { name: data.robot.components[0].name, exact: true })
    .click();
  await expect(
    page.getByText(data.robot.components[0].function, { exact: true }),
  ).toBeVisible();
  const health = await (await request.get("/api/health")).json();
  const after = await (await request.get("/api/usage")).json();
  expect(health.live_inference_verified).toBe(true);
  expect(health.inference_verification.model).toBe(data.model);
  expect(after.requests - before.requests).toBe(1);
  expect(after.charged_usd).toBeGreaterThan(before.charged_usd);
  expect(after.tokens).toBeGreaterThan(before.tokens);
  expect(after.charged_usd + after.reserved_usd).toBeLessThan(1);
  expect(
    leaked,
    "Provider credential must never appear in browser traffic",
  ).toBe(false);
  expect(
    destinations.some((url) => url.includes("tokenfactory.nebius.com")),
  ).toBe(false);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "AI CONFIGURED" }).click();
  await expect(
    page.getByText("Previously verified", { exact: true }),
  ).toBeVisible();
  const evidence = {
    model: data.model,
    robot_id: data.robot.id,
    component_count: data.robot.components.length,
    health,
    cost_usd: after.charged_usd - before.charged_usd,
    tokens: after.tokens - before.tokens,
  };
  mkdirSync(".runtime", { recursive: true });
  writeFileSync(
    ".runtime/browser-inference-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
  await info.attach("live-inference-evidence", {
    body: JSON.stringify(
      {
        model: data.model,
        robot_id: data.robot.id,
        component_count: data.robot.components.length,
        health,
        cost_usd: after.charged_usd - before.charged_usd,
        tokens: after.tokens - before.tokens,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
