import math
import pytest
from backend.app.models import SimulationRequest, RobotTask
from backend.app.reference import reference_robot
from backend.app.simulation import simulate


def test_real_solver_states_cover_initial_final_time_and_report_cpu_execution():
    run = simulate(SimulationRequest(
        robot=reference_robot(), task=RobotTask(description="Drive forward"), duration_s=1,
    ))
    assert run["execution"]["location"] == "backend"
    assert run["execution"]["processor"] == "cpu"
    assert run["execution"]["gpu_accelerated"] is False
    assert run["execution"]["status"] == "succeeded"
    assert run["execution"]["timestep_s"] == .002
    assert run["frames"][0]["t"] == 0
    assert run["frames"][0]["position"] == pytest.approx([0, .03, 0])
    assert run["frames"][-1]["t"] == pytest.approx(run["metrics"]["simulated_seconds"])
    assert run["frames"][-1]["position"][0] != 0
    assert all(a["t"] < b["t"] for a, b in zip(run["frames"], run["frames"][1:]))
    assert all(math.hypot(*f["quaternion"]) == pytest.approx(1) for f in run["frames"])
    assert run["task_completed"] is None and run["hardware_benchmarked"] is False
