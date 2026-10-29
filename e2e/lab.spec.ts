import { test, expect } from "@playwright/test";
test("reference robot → inspect → compute → real physics → persistence", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /An idea/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Autonomous rover" }),
  ).toBeEnabled();
  await expect(page.getByText("Connecting engineering services…")).toHaveCount(
    0,
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-landing.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Autonomous research rover" }),
  ).toBeVisible();
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
    .getByRole("button", { name: "Exploded view", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Exploded view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Exploded view", exact: true })
    .click();
  await page.getByRole("button", { name: "Challenge", exact: true }).click();
  await page.getByLabel("YOUR MISSION").fill("Drive forward on a flat floor");
  await page
    .getByRole("button", { name: "Analyze compute requirements" })
    .click();
  await expect(page.getByText("SUGGESTED · HEURISTIC")).toBeVisible();
  await expect(
    page.getByText("Unmeasured", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter the simulation lab" }).click();
  await page.getByRole("button", { name: "Run physics experiment" }).click();
  await expect(page.getByText(/MEASURED \/ MuJoCo/)).toBeVisible();
  await expect(page.getByText("PLANAR DISPLACEMENT")).toBeVisible();
  await expect(page.getByText("3000", { exact: true })).toBeVisible();
  await expect(page.getByText("Connecting engineering services…")).toHaveCount(
    0,
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-simulation.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Analyze recorded results with NVIDIA" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    /Nebius is not configured|access token/,
  );
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(page.getByText("THIS ROBOT / 1 EXPERIMENTS")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Step inside the lab" }).click();
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(page.getByText("THIS ROBOT / 1 EXPERIMENTS")).toBeVisible();
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  expect(overflow).toBe(false);
});
test("unconfigured AI fails honestly and distinct arm reference is supported", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("What would you like to engineer?")
    .fill("A medical robot with an articulated arm");
  await page
    .getByRole("button", { name: "Generate robot with NVIDIA" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    /Nebius is not configured|access token/,
  );
  await page
    .getByRole("button", { name: "Articulated arm", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Articulated teaching arm" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Simulate", exact: true }).click();
  await expect(
    page.getByText("This robot is conceptual for simulation."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run physics experiment" }),
  ).toBeDisabled();
});
