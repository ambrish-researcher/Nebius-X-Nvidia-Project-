import { test, expect, type Page, type TestInfo } from "@playwright/test";

async function capture(page: Page, info: TestInfo, scene: string) {
  await page.screenshot({
    path: `test-results/arise-${info.project.name}-${scene}.png`,
    fullPage: scene !== "06-arise",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  if (
    info.project.name === "mobile" &&
    (await page.locator("main.in-lab").count())
  ) {
    const stage = (await page.locator(".scene-container").boundingBox())!;
    const panel = (await page.locator(".lab-panel").boundingBox())!;
    const toolbar = (await page.locator(".viewport-toolbar").boundingBox())!;
    const heading = (await page.locator(".lab-heading").boundingBox())!;
    expect(heading.y + heading.height).toBeLessThanOrEqual(stage.y);
    expect(stage.y + stage.height).toBeLessThanOrEqual(panel.y);
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(panel.y);
  }
}

test("ARISE cinematic chapters connect to engineering, compute, and contextual learning", async ({
  page,
  request,
}, info) => {
  test.setTimeout(360_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [],
    hydration: string[] = [],
    paidRoutes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (/hydrat/i.test(m.text())) hydration.push(m.text());
  });
  page.on("request", (r) => {
    if (/nebius\.com|\/api\/(ai|generate)$/.test(r.url()))
      paidRoutes.push(r.url());
  });
  // Force labeled preview in the browser; the server's independent guard is asserted below.
  await page.route("**/api/health", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: { ...(await response.json()), visual_preview: true },
    });
  });
  const before = await (await request.get("/api/usage")).json();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Autonomous rover", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("Connecting engineering services…")).toHaveCount(
    0,
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Preview intro sequence" }).click();
  await expect(
    page.getByRole("heading", { name: "ARISE", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play cinematic", exact: true }),
  ).toBeVisible();
  await capture(page, info, "01-intro");
  await page.getByLabel("Cinematic timeline").fill("4.9");
  await capture(page, info, "02-sphere-throw");
  await page.getByRole("button", { name: "Preview prompt sequence" }).click();
  await expect(page.getByRole("heading", { name: /WHAT IF/ })).toBeVisible();
  await capture(page, info, "03-tunnel");
  await page
    .getByLabel("What would you like to engineer?")
    .fill("A rover for a flat-floor engineering experiment");
  await page.getByRole("button", { name: "Preview curated assembly" }).click();
  await expect(page.locator("main")).toHaveClass(/phase-transform/);
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByLabel("Cinematic timeline").fill("3.3");
  await capture(page, info, "04-construction");
  const end = await page.getByLabel("Cinematic timeline").getAttribute("max");
  await page.getByLabel("Cinematic timeline").fill(end!);
  await capture(page, info, "05-assembled");
  await page.getByRole("button", { name: "Preview reveal sequence" }).click();
  await expect(
    page.getByText("IDEAS BECOME MACHINES.", { exact: true }),
  ).toBeVisible();
  await capture(page, info, "06-arise");
  await page
    .getByRole("button", { name: "Enter your engineering world" })
    .click();
  await expect(
    page.getByText("CURATED REFERENCE · NOT AI-GENERATED"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore the components" }).click();
  await page
    .getByRole("button", { name: "Motor controller", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Motor controller", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Transparency mode", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Transparency mode", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await capture(page, info, "07-engineering");
  await page.getByRole("button", { name: "Compute", exact: true }).click();
  await page
    .getByRole("button", { name: /Vera Rubin Data-center architecture/ })
    .click();
  await expect(
    page.getByText(/NVL72 describes a rack-scale system/),
  ).toBeVisible();
  await capture(page, info, "08-compute");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "quiz", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate a contextual quiz" })
    .click();
  const quiz = page.locator(".quiz-card").first();
  await expect(quiz.getByRole("button")).toHaveCount(4);
  await quiz.getByRole("button").nth(1).click();
  await expect(quiz.locator(".incorrect")).toHaveCount(1);
  await expect(quiz.locator("p")).toContainText("calibration");
  await capture(page, info, "09-learning");
  await page.getByRole("button", { name: "flashcards", exact: true }).click();
  await page.getByRole("button", { name: "Generate robot flashcards" }).click();
  await page.locator(".flashcard").first().getByRole("button").click();
  await expect(page.getByText("EXPLANATION", { exact: true })).toBeVisible();
  await page.locator(".flashcard").first().getByRole("checkbox").check();
  await expect(page.getByText("1 concepts reviewed")).toBeVisible();
  expect(paidRoutes).toEqual([]);
  expect(errors).toEqual([]);
  expect(hydration).toEqual([]);
  expect(await (await request.get("/api/usage")).json()).toEqual(before);
});

test("revisions preserve evidence and use actual MuJoCo with bounded controller inputs", async ({
  page,
  request,
}, info) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const usageBefore = await (await request.get("/api/usage")).json();
  // The independent paid-preview guard is exercised by backend tests; no unmocked paid POST in this suite.
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await page.getByRole("button", { name: "Improve", exact: true }).click();
  await page.getByLabel(/WHEEL VELOCITY SETPOINT/).fill("0");
  await page
    .getByLabel("PREDICT BEFORE YOU SIMULATE")
    .fill(
      "With zero wheel speed the rover should remain near its starting point.",
    );
  await page
    .getByRole("button", { name: "Run revised physics experiment" })
    .click();
  await expect(page.locator(".revision-comparison")).toContainText("0 rad/s");
  await page.getByLabel("DESIGN MASS / KG").fill("2.5");
  await page.getByRole("button", { name: "Apply component revision" }).click();
  await expect(page.locator(".decision-list")).toContainText("2.50 kg");
  await page.getByLabel(/WHEEL VELOCITY SETPOINT/).fill("4");
  await page
    .getByRole("button", { name: "Run revised physics experiment" })
    .click();
  await expect(page.locator(".revision-comparison")).toContainText("4 rad/s");
  await expect(page.locator(".knowledge-summary")).toContainText(
    "2 recorded experiments",
  );
  await capture(page, info, "10-improvement");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("robotics-current") || "{}")
            .simulation_runs?.length,
      ),
    )
    .toBe(2);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("robotics-current")!),
  );
  expect(saved.robot.components[0].mass_kg).toBe(2.5);
  expect(saved.design_changes).toHaveLength(1);
  expect(saved.simulation_runs[1].metrics.displacement_m).toBeGreaterThan(
    saved.simulation_runs[0].metrics.displacement_m + 0.1,
  );
  expect(saved.simulation_runs[1].hardware_benchmarked).toBe(false);
  expect(saved.simulation_runs[1].task_completed).toBeNull();
  expect(await (await request.get("/api/usage")).json()).toEqual(usageBefore);
});

test("WebGL fallback keeps the engineering workflow keyboard accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: any[]
    ) {
      if (type.startsWith("webgl")) return null;
      return getContext.apply(this, [type, ...args] as any);
    } as typeof getContext;
  });
  await page.goto("/");
  await expect(
    page.getByText("WebGL isn’t available", { exact: true }),
  ).toBeVisible();
  const reference = page.getByRole("button", {
    name: "Autonomous rover",
    exact: true,
  });
  await reference.focus();
  await expect(reference).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Autonomous research rover",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore the components" }).focus();
  await page.keyboard.press("Enter");
  const controller = page.getByRole("button", {
    name: "Motor controller",
    exact: true,
  });
  await controller.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Motor controller", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("cinematic playback pauses and advances automatically after explicit play", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Normal-motion playback is exercised once; reduced-motion UI is covered on both viewports.",
  );
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Autonomous rover", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Preview intro sequence" }).click();
  await page.getByLabel("Cinematic speed").selectOption("0.5");
  await page
    .getByRole("button", { name: "Play cinematic", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause cinematic", exact: true })
    .click();
  const time = await page.getByLabel("Cinematic timeline").inputValue();
  await page.waitForTimeout(500);
  expect(await page.getByLabel("Cinematic timeline").inputValue()).toBe(time);
  await page.getByLabel("Cinematic timeline").fill("5.9");
  await page
    .getByRole("button", { name: "Play cinematic", exact: true })
    .click();
  await expect(page.locator("main")).toHaveClass(/phase-prompt/, {
    timeout: 30_000,
  });
  await page
    .getByLabel("What would you like to engineer?")
    .fill("A rover for an educational flat-floor experiment");
  await page.getByRole("button", { name: "Preview curated assembly" }).click();
  await expect(page.locator("main")).toHaveClass(/phase-transform/);
  await expect(
    page.getByRole("heading", {
      name: "Autonomous research rover",
      exact: true,
    }),
  ).toBeVisible({ timeout: 40_000 });
});
