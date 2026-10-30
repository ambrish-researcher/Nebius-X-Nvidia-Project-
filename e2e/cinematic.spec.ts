import { test, expect } from "@playwright/test";

test("three robots complete the local learning journey without generation calls", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  const paid: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\/api\/(generate|ai)$/.test(r.url())) paid.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Give your ideas motion." }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByLabel("Loading ARISE")).toHaveCount(0);
  await page.screenshot({
    path: `test-results/cinematic-${info.project.name}-landing.png`,
    fullPage: true,
  });
  await page.getByLabel("Describe your robot").fill("submarine");
  await page.getByRole("button", { name: "Build robot", exact: true }).click();
  await expect(page.locator(".arise-error")).toContainText("Choose a humanoid");
  await page.getByLabel("Dismiss error").click();
  for (const [kind, tasks] of [
    ["Humanoid", ["Raise arm", "Wave", "Turn head"]],
    ["Drone", ["Take off", "Hover", "Land"]],
    ["Microduck", ["Turn head", "Nod", "Leg articulation"]],
  ] as const) {
    await page
      .getByLabel("Describe your robot")
      .fill(
        kind === "Microduck" ? "NVIDIA Microduck" : `Build a ${kind} robot`,
      );
    await page
      .getByRole("button", { name: "Build robot", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Every part has a purpose." }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator("canvas")).toHaveCount(1);
    if (kind === "Humanoid") {
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Becoming a machine." }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Every part has a purpose." }),
      ).toBeVisible({ timeout: 20000 });
    }
    const parts = page.locator(".component-pills button");
    await parts.last().click();
    await expect(parts.last()).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Explode", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Explode", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Wireframe", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Wireframe", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Wireframe", exact: true }).click();
    await page.getByRole("button", { name: "Explode", exact: true }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.screenshot({
      path: `test-results/cinematic-${info.project.name}-${kind}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Give it a task" }).click();
    await page.getByLabel("Robot task").fill("do something unsupported");
    await page.getByLabel("Run task").click();
    await expect(page.locator(".arise-error")).toContainText("Supported tasks");
    await page.getByLabel("Dismiss error").click();
    for (const task of tasks) {
      await page.getByRole("button", { name: task, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: `${task} — completed` }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Find the right compute" }).click();
    await expect(
      page.getByRole("heading", { name: "NVIDIA Jetson Orin Nano" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Understand your machine" }).click();
    const sets = page.locator(".quiz fieldset");
    for (let i = 0; i < 3; i++)
      await sets.nth(i).getByRole("radio").nth(i).check();
    await page.getByRole("button", { name: "Check answers" }).click();
    await expect(page.getByText("Score: 3 / 3")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(
      page.getByRole("button", { name: "Check answers" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByLabel("ARISE home").click();
  }
  expect(paid).toEqual([]);
  expect(errors).toEqual([]);
});

test("AI failure is disclosed and settings preserve session authorization", async ({
  page,
}) => {
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      status: 401,
      json: { detail: "A valid lab access token is required." },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Connection settings").click();
  await page.getByLabel("Lab access token").fill("test-session-token");
  await page.getByRole("button", { name: "Save for this session" }).click();
  expect(
    await page.evaluate(() => sessionStorage.getItem("lab-access-token")),
  ).toBe("test-session-token");
  await page.getByRole("button", { name: "01 Humanoid" }).click();
  await expect(
    page.getByRole("button", { name: "Give it a task" }),
  ).toBeEnabled({ timeout: 20000 });
  await page.getByRole("button", { name: "Give it a task" }).click();
  await page.getByRole("button", { name: "Wave", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Find the right compute" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Find the right compute" }).click();
  await page.getByRole("button", { name: "Understand your machine" }).click();
  await page.getByLabel("Ask a robotics question").fill("Why use a GPU?");
  await page.getByLabel("Ask ARISE", { exact: true }).click();
  await expect(
    page.getByText("LOCAL EXPLANATION · AI REQUEST DID NOT SUCCEED"),
  ).toBeVisible();
  await expect(page.locator(".tutor-reply")).toContainText(
    "A valid lab access token",
  );
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      json: {
        data: {
          answer:
            "A motor controller converts target angles into actuator commands.",
          limitations: ["Kinematic demonstration only"],
        },
        cached: false,
        model: "mocked-contract-test",
      },
    }),
  );
  await page
    .getByLabel("Ask a robotics question")
    .fill("Explain the motor controller");
  await page.getByLabel("Ask ARISE", { exact: true }).click();
  await expect(page.locator(".tutor-reply")).toContainText(
    "A motor controller converts target angles",
  );
  await expect(page.locator(".tutor-reply small")).toHaveText(
    "LIVE AI RESPONSE",
  );
});

test("WebGL unavailable keeps components and learning accessible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2") return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.goto("/");
  await expect(
    page.getByText("WebGL 2 is unavailable on this device.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "02 Drone" }).click();
  await expect(
    page.getByRole("heading", { name: "Every part has a purpose." }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Flight controller", exact: true })
    .click();
  await expect(page.locator(".part-explanation")).toContainText(
    "inertial measurements",
  );
  await expect(
    page.getByRole("button", { name: "Give it a task" }),
  ).toBeEnabled();
});
