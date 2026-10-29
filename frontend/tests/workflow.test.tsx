import { useState } from "react";
import { useModalFocus } from "../lib/use-modal-focus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useLab, initialTask } from "../lib/store";
import { deriveAssembly, PanelContent } from "../components/lab-panels";
import type { RobotSpec } from "../lib/types";
const robot: RobotSpec = {
  id: "fixture",
  name: "Test rover",
  purpose: "Teach",
  classification: "rover",
  provenance: "reference",
  dimensions_m: [1, 1, 1],
  components: [
    {
      id: "base",
      name: "Base plate",
      kind: "structure",
      shape: "box",
      size: [1, 0.1, 1],
      position: [0, 0.2, 0],
      rotation: [0, 0, 0],
      mass_kg: 2,
      depends_on: [],
      function: "Carries the system.",
      selection_reason: "Rigid datum.",
      alternatives: [],
      limitations: ["Not rated"],
    },
    {
      id: "camera",
      name: "Camera module",
      kind: "sensor",
      shape: "box",
      size: [0.1, 0.1, 0.1],
      position: [0, 0.4, 0],
      rotation: [0, 0, 0],
      mass_kg: 0.1,
      depends_on: ["base"],
      function: "Observes images.",
      selection_reason: "Vision input.",
      alternatives: [],
      limitations: [],
    },
  ],
  joints: [],
  degrees_of_freedom: 0,
  power_budget_w: 20,
  control_requirements: [],
  operating_environment: "Indoor",
  intended_tasks: ["Drive"],
  constraints: [],
  simulation_capabilities: [],
  unsupported_assumptions: [],
};
beforeEach(() => {
  cleanup();
  useLab.getState().setRobot(robot, deriveAssembly(robot));
  useLab
    .getState()
    .set({ section: "design", entered: true, task: initialTask });
});
describe("connected engineering state", () => {
  it("orders construction by actual dependencies even if components are shuffled", () => {
    const r = { ...robot, components: [...robot.components].reverse() };
    expect(deriveAssembly(r).map((s) => s.component_ids)).toEqual([
      ["base"],
      ["camera"],
    ]);
  });
  it("labels reference provenance and exposes inspection", () => {
    render(<PanelContent onError={vi.fn()} />);
    expect(screen.getByText(/NOT AI-GENERATED/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Explore the components/ }),
    );
    expect(useLab.getState().section).toBe("inspect");
  });
  it("component selection changes the shared scene selection", () => {
    useLab.getState().set({ section: "inspect" });
    render(<PanelContent onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Camera module" }));
    expect(useLab.getState().selected).toBe("camera");
    expect(screen.getByText("Observes images.")).toBeInTheDocument();
  });
  it("task inputs carry into the project and compute stage", () => {
    useLab.getState().set({ section: "challenge" });
    render(<PanelContent onError={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Camera-based perception"));
    expect(useLab.getState().project()?.task.needs_vision).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Analyze compute/ }));
    expect(useLab.getState().section).toBe("compute");
  });
  it("switching designs clears incompatible experiment and learning state", () => {
    useLab.getState().set({
      selected: "camera",
      attempts: [{ question: "x", selected_index: 1, correct: false }],
    });
    useLab.getState().setRobot({ ...robot, id: "next" }, deriveAssembly(robot));
    expect(useLab.getState().selected).toBeNull();
    expect(useLab.getState().attempts).toEqual([]);
    expect(useLab.getState().project()?.id).toBe("next");
  });
});

function DialogHarness() {
  const [open, setOpen] = useState(false);
  useModalFocus(open, () => setOpen(false));
  return (
    <>
      <button onClick={() => setOpen(true)}>Open connections</button>
      {open && (
        <section role="dialog">
          <button>First control</button>
          <button>Last control</button>
        </section>
      )}
    </>
  );
}
it("traps keyboard focus in a modal and restores the opener on escape", () => {
  cleanup();
  render(<DialogHarness />);
  const opener = screen.getByRole("button", { name: "Open connections" });
  opener.focus();
  fireEvent.click(opener);
  expect(screen.getByRole("button", { name: "First control" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(screen.getByRole("button", { name: "Last control" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
