import { test, expect } from "@playwright/test";
import * as THREE from "three";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["ai", "generate"])
    await page.route(`**/api/${path}`, (route) =>
      route.fulfill({
        status: 503,
        json: {
          detail: "Offline studio regression: paid inference is not used.",
        },
      }),
    );
});

test("studio hierarchy, inspection transforms, renderer evidence, and real solver playback", async ({
  page,
  request,
}, info) => {
  test.setTimeout(180_000);
  const before = await (await request.get("/api/usage")).json();
  const errors: string[] = [];
  let solves = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().endsWith("/api/simulate")) solves++;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await expect(
    page.getByText("3D assembly rendered", { exact: false }),
  ).toBeVisible();
  const hierarchy = page.getByRole("complementary", {
    name: "Robot assembly hierarchy",
  });
  await hierarchy.getByRole("button", { name: "Sensors", exact: true }).click();
  await expect(hierarchy.getByRole("button", { name: /Select/ })).toHaveCount(
    2,
  );
  await hierarchy.getByRole("button", { name: "All", exact: true }).click();
  await hierarchy
    .getByLabel("Find a component")
    .pressSequentially("controller");
  await hierarchy
    .getByRole("button", { name: "Select Motor controller", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected component properties" }),
  ).toContainText("Dimensions");
  await page
    .getByRole("button", { name: "Move selected component in inspection view" })
    .click();
  await expect(
    page.getByText(/Inspection transform · visual only/),
  ).toBeVisible();
  if (info.project.name === "desktop") {
    // Project a point on the real gizmo's X handle, then use native mouse input.
    // Camera focus in reduced motion is deterministic; no input events are injected.
    const reference = await (await request.get("/api/reference/rover")).json();
    const part = reference.robot.components.find(
      (p: any) => p.name === "Motor controller",
    );
    await page.locator("canvas").screenshot();
    const bounds = (await page.locator("canvas").boundingBox())!;
    const camera = new THREE.PerspectiveCamera(
      35,
      bounds.width / bounds.height,
      0.01,
      300,
    );
    const target = new THREE.Vector3(
      ...(part.position as [number, number, number]),
    );
    camera.position.copy(target).add(new THREE.Vector3(1, 0.7, 1.2));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const project = (x: number) => {
      const point = target
        .clone()
        .add(new THREE.Vector3(x, 0, 0))
        .project(camera);
      return {
        x: bounds.x + ((point.x + 1) * bounds.width) / 2,
        y: bounds.y + ((1 - point.y) * bounds.height) / 2,
      };
    };
    const from = project(0.11),
      to = project(0.3);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 16 });
    await page.mouse.up();
    await expect
      .poll(async () =>
        Math.abs(+(await page.getByLabel("Inspection offset X").inputValue())),
      )
      .toBeGreaterThan(0.01);
  }
  await page.getByLabel("Inspection offset X").fill("0.25");
  await expect(page.getByLabel("Inspection offset X")).toHaveValue("0.25");
  await page
    .getByRole("button", { name: "Reset inspection transforms" })
    .click();
  await hierarchy.getByLabel("Find a component").fill("");
  await page.getByRole("button", { name: "Simulate", exact: true }).click();
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/api/simulate"),
  );
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.execution).toMatchObject({
    location: "backend",
    processor: "cpu",
    gpu_accelerated: false,
    status: "succeeded",
  });
  expect(result.frames[0].t).toBe(0);
  if (info.project.name === "mobile")
    await expect
      .poll(async () =>
        Math.abs((await page.locator(".scene-container").boundingBox())!.y),
      )
      .toBeLessThan(3);
  await expect(page.getByTestId("simulation-status")).toContainText(
    "Solver completed",
  );
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const initial = await canvas.screenshot();
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(
      async () => +(await page.getByLabel("Simulation timeline").inputValue()),
    )
    .toBeGreaterThan(8);
  if (
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
  const index = +(await page.getByLabel("Simulation timeline").inputValue());
  const position = result.frames[index].position
    .map((n: number) => n.toFixed(3))
    .join(" / ");
  await expect(page.getByTestId("position-readout")).toContainText(position);
  await canvas.scrollIntoViewIfNeeded();
  expect(initial.equals(await canvas.screenshot())).toBe(false);
  await page
    .getByRole("button", { name: "Reset playback", exact: true })
    .click();
  await expect(page.getByLabel("Simulation timeline")).toHaveValue("0");
  await page.getByLabel("Playback speed", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Replay simulation", exact: true })
    .click();
  await expect(page.getByTestId("simulation-status")).toContainText(
    "Playback complete",
    { timeout: 20_000 },
  );
  expect(solves).toBe(1);
  await page
    .getByRole("button", { name: "Execution log (3)", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Simulation execution log" }),
  ).toContainText("3000 steps");
  await page
    .getByRole("button", { name: "Execution log (3)", exact: true })
    .click();
  await page.getByText("Execution backends", { exact: true }).click();
  const diagnostics = page.getByRole("region", {
    name: "Execution backend diagnostics",
  });
  await expect(diagnostics).toContainText("GPU physics disabled");
  await expect(diagnostics).toContainText("Not integrated. CUDA physics");
  const actualRenderer = await canvas.evaluate((c: HTMLCanvasElement) => {
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const info = gl!.getExtension("WEBGL_debug_renderer_info");
    return String(
      gl!.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl!.RENDERER),
    );
  });
  await expect(page.getByTestId("actual-renderer")).toHaveText(actualRenderer);
  await page.screenshot({
    path: `test-results/studio-${info.project.name}-diagnostics.png`,
    fullPage: true,
  });
  await page.getByText("Execution backends", { exact: true }).click();
  await page.screenshot({
    path: `test-results/studio-${info.project.name}-workspace.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(await (await request.get("/api/usage")).json()).toEqual(before);
});

test("failed solver requests remain understandable and unsupported arms cannot start physics", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await page.route("**/api/simulate", (route) =>
    route.fulfill({
      status: 422,
      json: {
        detail:
          "Physics configuration could not be integrated; check wheel mounts.",
      },
    }),
  );
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await expect(
    page.locator(".simulation-dock").getByRole("alert"),
  ).toContainText("check wheel mounts");
  await expect(page.getByTestId("simulation-status")).toContainText(
    "Execution failed",
  );
  await expect(
    page.getByRole("button", { name: "Play playback", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "ARISE home", exact: true }).click();
  await page
    .getByRole("button", { name: "Articulated arm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start simulation", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Conceptual-only · no controller for this configuration"),
  ).toBeVisible();
});

test("WebGL unavailable still permits CPU solve, timestamp playback, and diagnostics", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: any[]
    ) {
      return type.startsWith("webgl")
        ? null
        : original.apply(this, [type, ...args] as any);
    } as typeof original;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await expect(
    page.getByText("WebGL isn’t available", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await expect(page.getByTestId("simulation-status")).toContainText(
    "Solver completed",
  );
  await page
    .getByRole("button", { name: "Replay simulation", exact: true })
    .click();
  await expect
    .poll(
      async () => +(await page.getByLabel("Simulation timeline").inputValue()),
    )
    .toBeGreaterThan(5);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  await expect(
    page.getByText("WebGL unavailable", { exact: true }),
  ).toBeVisible();
});

test("continuous rendering reports measured FPS and the actual software renderer", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Continuous renderer sampling is covered on desktop; mobile tests cover the on-demand renderer.",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autonomous rover", exact: true })
    .click();
  await expect(page.locator(".dock-render")).toContainText(/\d+\.\d FPS/, {
    timeout: 30_000,
  });
  await page.getByText("Execution backends", { exact: true }).click();
  const panel = page.getByRole("region", {
    name: "Execution backend diagnostics",
  });
  await expect(panel).toContainText("recent 2-second interval");
  const renderer = await page.getByTestId("actual-renderer").textContent();
  if (/swiftshader|llvmpipe|software/i.test(renderer || ""))
    await expect(panel).toContainText("Software renderer reported");
  await expect(panel).toContainText("GPU physics disabled");
  await page.screenshot({ path: "test-results/studio-desktop-rendering.png" });
});
