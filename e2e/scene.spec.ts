import { test, expect } from "@playwright/test";

test("3D raycasting selects a real component and camera controls change the rendered view", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Direct raycasting is verified on desktop; responsive controls are covered by the mobile workflow.",
  );
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    (window as any).__ariseDrawCalls = 0;
    for (const api of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = api.prototype.drawElements;
      api.prototype.drawElements = function (
        ...args: Parameters<typeof original>
      ) {
        (window as any).__ariseDrawCalls++;
        return original.apply(this, args);
      };
    }
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect(
    page.getByText("STATIC VIEW · REDRAW ON INTERACTION"),
  ).toBeVisible();
  // After initial scene/camera setup, a reduced-motion idle view stops issuing draws.
  await expect
    .poll(() => page.evaluate(() => (window as any).__ariseDrawCalls))
    .toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const idleBefore = await page.evaluate(
    () => (window as any).__ariseDrawCalls,
  );
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__ariseDrawCalls)).toBe(
    idleBefore,
  );
  const bounds = (await canvas.boundingBox())!;
  // These viewport coordinates intersect the reference rover's central body.
  await page.mouse.click(
    bounds.x + bounds.width * 0.32,
    bounds.y + bounds.height * 0.55,
  );
  await expect(page.locator(".inspection h3")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  const first = await canvas.screenshot();
  await page.getByLabel("Camera preset").selectOption("top");
  await expect(page.getByLabel("Camera preset")).toHaveValue("top");
  // Actual screenshots verify that the WebGL view changes, beyond control state.
  const top = await canvas.screenshot();
  expect(first.equals(top)).toBe(false);
  await page
    .getByRole("button", { name: "Isolate selected component" })
    .click();
  await expect(
    page.getByRole("button", { name: "Isolate selected component" }),
  ).toHaveAttribute("aria-pressed", "true");
});
