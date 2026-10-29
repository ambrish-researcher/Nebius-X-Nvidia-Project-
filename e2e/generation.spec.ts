import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const live = process.env.ARISE_LIVE_MATRIX === "1";
const recordPath =
  process.env.ARISE_MATRIX_PATH ||
  (live ? ".runtime/core-validation" : "e2e/fixtures/generated");
const names = ["rover", "arm", "quadruped", "manipulator", "custom"];

for (const name of names)
  test(`own keyboard prompt → ${name} design → real workspace`, async ({
    page,
    context,
    request,
  }, info) => {
    test.setTimeout(150_000);
    const recording = JSON.parse(
      readFileSync(path.join(recordPath, name + ".json"), "utf8"),
    );
    expect(recording.http_status).toBe(200);
    const key = process.env.NEBIUS_API_KEY;
    let leaked = false;
    const calls: any[] = [];
    page.on("request", (r) => {
      if (
        key &&
        JSON.stringify({
          url: r.url(),
          headers: r.headers(),
          data: r.postData(),
        }).includes(key)
      )
        leaked = true;
    });
    page.on("response", async (r) => {
      if (r.url().endsWith("/api/generate"))
        calls.push({ status: r.status(), body: await r.json() });
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (!live)
      await page.route("**/api/generate", async (route) => {
        expect(route.request().postDataJSON().prompt).toBe(recording.prompt);
        await route.fulfill({ json: recording.response });
      });
    await page.goto("/");
    if (process.env.LAB_ACCESS_TOKEN)
      await page.evaluate(
        (t) => sessionStorage.setItem("lab-access-token", t),
        process.env.LAB_ACCESS_TOKEN,
      );
    const input = page.locator("#robot-prompt");
    await input.click();
    // Native typing and selection/editing, then real clipboard paste.
    await page.keyboard.type("temporary robot description", { delay: 8 });
    await expect(input).toHaveValue("temporary robot description");
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("Delete");
    await expect(input).toHaveValue("emporary robot description");
    await page.keyboard.press("Control+A");
    await page.evaluate(
      (p) => navigator.clipboard.writeText(p),
      recording.prompt,
    );
    await page.keyboard.press("Control+V");
    await expect(input).toHaveValue(recording.prompt);
    const before = await (await request.get("/api/usage")).json();
    await page.keyboard.press("Control+Enter");
    await expect(
      page.getByRole("heading", {
        name: recording.response.robot.name,
        exact: true,
      }),
    ).toBeVisible({ timeout: 95_000 });
    await expect(page.locator("main")).toHaveClass(/in-lab/);
    await expect(
      page.getByText("3D assembly rendered", { exact: false }),
    ).toBeVisible({ timeout: 25_000 });
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].body.cached).toBe(live ? true : recording.response.cached);
    expect(calls[0].body.robot.components).toEqual(
      recording.response.robot.components,
    );
    expect(leaked).toBe(false);
    const assess = recording.response.assessment;
    if (assess.physics_valid) {
      await page.getByRole("button", { name: "Simulate", exact: true }).click();
      await expect(
        page.getByRole("button", {
          name: "Run physics experiment",
          exact: true,
        }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Run physics experiment", exact: true })
        .click();
      await expect(page.getByText(/MEASURED \/ MuJoCo/)).toBeVisible();
      await page
        .getByRole("button", { name: "Play playback", exact: true })
        .click();
      await expect
        .poll(async () =>
          Number(await page.getByLabel("Simulation timeline").inputValue()),
        )
        .toBeGreaterThan(2);
      await page
        .getByRole("button", { name: "Pause playback", exact: true })
        .click();
      await page.getByLabel("Simulation timeline").fill("15");
      await page
        .getByRole("button", { name: "Reset camera", exact: true })
        .click();
    } else {
      await expect(
        page.getByText("Conceptual-only for physics", { exact: false }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Simulate", exact: true }).click();
      await expect(
        page.getByRole("button", {
          name: "Run physics experiment",
          exact: true,
        }),
      ).toBeDisabled();
    }
    await page.screenshot({
      path: `test-results/core-${info.project.name}-${name}.png`,
      fullPage: true,
    });
    const after = await (await request.get("/api/usage")).json();
    expect(after.charged_usd).toBe(before.charged_usd);
    expect(after.reserved_usd).toBe(before.reserved_usd);
  });

test("native keyboard focus survives scene and modal interactions", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.route("**/api/generate", (r) =>
    r.fulfill({
      status: 503,
      json: {
        detail: "Explicit offline keyboard regression; no paid inference.",
      },
    }),
  );
  await page.goto("/");
  const input = page.locator("#robot-prompt");
  await input.click();
  await page.keyboard.type("A custom robotics prompt", { delay: 15 });
  await expect(input).toHaveValue("A custom robotics prompt");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Backspace");
  await expect(input).not.toHaveValue("A custom robotics prompt");
  await page.keyboard.press("Control+A");
  await page.evaluate(() =>
    navigator.clipboard.writeText("A pasted quadruped prompt"),
  );
  await page.keyboard.press("Control+V");
  await expect(input).toHaveValue("A pasted quadruped prompt");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("status")).toContainText(
    "Explicit offline keyboard",
  );
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await page.getByRole("button", { name: "New idea", exact: true }).click();
  await expect(page.locator("#new-prompt")).toBeFocused();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("A six axis arm");
  await expect(page.locator("#new-prompt")).toHaveValue("A six axis arm");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("pending generation survives reload and status recovery never repeats POST", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixture = JSON.parse(
    readFileSync("e2e/fixtures/generated/arm.json", "utf8"),
  ).response;
  let posts = 0,
    ready = false,
    id = "";
  await page.route("**/api/generate", async (route) => {
    posts++;
    id = route.request().postDataJSON().request_id;
    await route.fulfill({
      status: 202,
      json: {
        request_id: id,
        status: "pending",
        billing: "uncertain",
        retry_allowed: false,
      },
    });
  });
  await page.route("**/api/generations/*", async (route) =>
    route.fulfill({
      json: ready
        ? {
            request_id: id,
            status: "succeeded",
            result: fixture,
            billing: "known",
            retry_allowed: false,
          }
        : {
            request_id: id,
            status: "pending",
            billing: "uncertain",
            retry_allowed: false,
          },
    }),
  );
  await page.goto("/");
  await page
    .locator("#robot-prompt")
    .pressSequentially("A six axis arm with a gripper");
  await page
    .getByRole("button", { name: "Generate robot with NVIDIA" })
    .click();
  await expect(
    page.getByRole("button", { name: "Check generation status" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Check generation status" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry failed prompt (may incur cost)" }),
  ).toHaveCount(0);
  ready = true;
  await page.getByRole("button", { name: "Check generation status" }).click();
  await expect(
    page.getByRole("heading", { name: fixture.robot.name, exact: true }),
  ).toBeVisible();
  expect(posts).toBe(1);
});

test("known-charge failure only retries after explicit action with a new ID", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixture = JSON.parse(
    readFileSync("e2e/fixtures/generated/arm.json", "utf8"),
  ).response;
  const bodies: any[] = [];
  await page.route("**/api/generate", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill(
      bodies.length === 1
        ? {
            status: 502,
            json: { detail: "Recorded known-charge validation failure" },
          }
        : { json: fixture },
    );
  });
  await page.route("**/api/generations/*", (r) =>
    r.fulfill({
      json: {
        status: "failed",
        billing: "known",
        retry_allowed: true,
        error: "Output failed validation; charge known.",
      },
    }),
  );
  await page.goto("/");
  await page
    .locator("#robot-prompt")
    .pressSequentially("A six axis arm with a camera");
  await page
    .getByRole("button", { name: "Generate robot with NVIDIA" })
    .click();
  const retry = page.getByRole("button", {
    name: "Retry failed prompt (may incur cost)",
  });
  await expect(retry).toBeVisible();
  expect(bodies).toHaveLength(1);
  await retry.click();
  await expect(
    page.getByRole("heading", { name: fixture.robot.name, exact: true }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1].retry_failed).toBe(true);
  expect(bodies[1].request_id).not.toBe(bodies[0].request_id);
});

test("holding the submit shortcut cannot repeat a completed failed request", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let posts = 0;
  await page.route("**/api/generate", (r) => {
    posts++;
    return r.fulfill({
      status: 503,
      json: { detail: "Offline held-key regression" },
    });
  });
  await page.route("**/api/generations/*", (r) =>
    r.fulfill({
      json: {
        status: "failed",
        billing: "not_dispatched",
        retry_allowed: true,
      },
    }),
  );
  await page.goto("/");
  await page
    .locator("#robot-prompt")
    .pressSequentially("A robot for a held key test");
  await expect(
    page.getByRole("button", { name: "Generate robot with NVIDIA" }),
  ).toBeEnabled();
  await page.keyboard.down("Control");
  await page.keyboard.down("Enter");
  await expect(
    page.getByRole("button", { name: "Retry failed prompt (may incur cost)" }),
  ).toBeVisible();
  await page.keyboard.down("Enter");
  await page.waitForTimeout(200);
  expect(posts).toBe(1);
  await page.keyboard.up("Enter");
  await page.keyboard.up("Control");
});

test("reference fetch cannot race a keyboard generation request", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reference = await (await request.get("/api/reference/arm")).json();
  let release!: () => void;
  let posts = 0;
  await page.route("**/api/reference/arm", async (r) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await r.fulfill({ json: reference });
  });
  await page.route("**/api/generate", (r) => {
    posts++;
    return r.fulfill({
      status: 503,
      json: { detail: "Offline reference-race regression" },
    });
  });
  await page.goto("/");
  const input = page.locator("#robot-prompt");
  await input.pressSequentially("A custom robot while a reference is loading");
  await page
    .getByRole("button", { name: "Articulated arm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Generate robot with NVIDIA" }),
  ).toBeDisabled();
  await input.click();
  await page.keyboard.press("Control+Enter");
  await page.waitForTimeout(200);
  expect(posts).toBe(0);
  release();
  await expect(
    page.getByRole("heading", {
      name: "Articulated teaching arm",
      exact: true,
    }),
  ).toBeVisible();
});
