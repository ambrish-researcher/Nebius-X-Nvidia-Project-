import copy
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from backend.app.main import app
from backend.app.models import (
    RobotSpecification,
    RobotTask,
    ProjectRequest,
    SimulationRequest,
)
from backend.app.reference import reference_robot, assembly_steps
from backend.app.hardware import recommend
from backend.app.simulation import simulate, build_model
from backend.app import ai


@pytest.fixture
def client(monkeypatch, tmp_path):
    for name in [
        "NEBIUS_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "LAB_ACCESS_TOKEN",
        "LAB_ENV",
    ]:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("LAB_DATA_DIR", str(tmp_path))
    return TestClient(app)


def test_reference_families_are_distinct_and_valid():
    rover, arm = reference_robot(), reference_robot("arm")
    assert rover.classification != "arm"
    assert len(rover.components) != len(arm.components)
    assert rover.provenance == arm.provenance == "reference"
    assert len(rover.joints) == rover.degrees_of_freedom == 4


@pytest.mark.parametrize(
    "mutation",
    [
        "cycle",
        "unknown",
        "duplicate",
        "invalid_joint",
        "dof",
        "infinite",
        "negative_geometry",
    ],
)
def test_schema_rejects_invalid_designs(mutation):
    d = reference_robot().model_dump()
    if mutation == "cycle":
        d["components"][0]["depends_on"] = ["compute"]
    elif mutation == "unknown":
        d["components"][0]["depends_on"] = ["missing"]
    elif mutation == "duplicate":
        d["components"][1]["id"] = d["components"][0]["id"]
    elif mutation == "invalid_joint":
        d["joints"][0]["component_id"] = "missing"
    elif mutation == "dof":
        d["degrees_of_freedom"] = 3
    elif mutation == "infinite":
        d["components"][0]["position"] = (float("inf"), 0, 0)
    elif mutation == "negative_geometry":
        d["components"][0]["size"] = (-1, 1, 1)
    with pytest.raises(ValidationError):
        RobotSpecification.model_validate(d)


def test_assembly_dependencies_resolved_first():
    r = reference_robot()
    resolved = set()
    for step in assembly_steps(r):
        for id in step["component_ids"]:
            c = next(c for c in r.components if c.id == id)
            assert set(c.depends_on) <= resolved
        resolved.update(step["component_ids"])
    assert len(resolved) == len(r.components)


def test_gpu_not_assumed_and_memory_power_network_checked():
    robot = reference_robot()
    low = ProjectRequest(robot=robot, task=RobotTask(description="Drive"))
    assert recommend(low)["recommended_id"] == "cpu"
    low.task.needs_vision = True
    assert recommend(low)["recommended_id"] == "orin-nano"
    low.task.memory_gb = 32
    rec = recommend(low)
    assert rec["recommended_id"] == "agx-orin"
    cloud = next(c for c in rec["candidates"] if c["id"] == "h100")
    assert not cloud["compatible"] and "network" in cloud["reasons"][0].lower()
    robot.power_budget_w = 5
    assert recommend(low)["recommended_id"] is None
    assert all(not c["deadline_verified"] for c in rec["candidates"])


def test_missing_task_capabilities_are_reported():
    task = RobotTask(
        description="Pick packages outdoors", needs_manipulation=True, outdoor=True
    )
    assert (
        len(
            recommend(ProjectRequest(robot=reference_robot(), task=task))[
                "feasibility_issues"
            ]
        )
        == 2
    )


def test_real_mujoco_states_and_hardware_independence():
    r = reference_robot()
    task = RobotTask(description="Inspect a warehouse")
    a = simulate(SimulationRequest(robot=r, task=task, duration_s=2, hardware_id="cpu"))
    b = simulate(
        SimulationRequest(robot=r, task=task, duration_s=2, hardware_id="orin-nano")
    )
    assert a["engine"].startswith("MuJoCo")
    assert a["metrics"]["steps"] == 1000
    assert a["metrics"]["displacement_m"] > 0.5
    assert a["metrics"]["max_tilt_rad"] < 0.1
    assert a["frames"] == b["frames"]
    assert a["hardware_benchmarked"] is False and a["task_completed"] is None
    assert a["frames"][-1]["joints"] != a["frames"][0]["joints"]
    assert max(abs(v) for f in a["frames"] for v in f["controller_output"]) <= 2.00001


def test_physics_model_uses_actual_design_mass():
    a = reference_robot()
    b = a.model_copy(deep=True)
    b.components[0].mass_kg += 5
    assert build_model(b).body_mass.sum() - build_model(
        a
    ).body_mass.sum() == pytest.approx(5)


@pytest.mark.parametrize("mutation", ["arm", "wheel_shape", "wheel_axis"])
def test_unsupported_physics_is_rejected(mutation):
    r = reference_robot("arm") if mutation == "arm" else reference_robot()
    if mutation == "wheel_shape":
        r.components[1].shape = "box"
    if mutation == "wheel_axis":
        r.joints[0].axis = (1, 0, 0)
    with pytest.raises(ValueError):
        build_model(r)


def test_api_end_to_end_reference_compute_physics(client):
    reference = client.get("/api/reference/rover").json()
    assert len(reference["assembly"]) >= 3
    req = dict(
        robot=reference["robot"], task=RobotTask(description="Drive").model_dump()
    )
    rec = client.post("/api/recommend", json=req)
    assert rec.status_code == 200 and rec.json()["recommended_id"] == "cpu"
    sim = client.post(
        "/api/simulate", json={**req, "hardware_id": "cpu", "duration_s": 1}
    )
    assert sim.status_code == 200 and len(sim.json()["frames"]) > 20
    assert sim.json()["robot_id"] == reference["robot"]["id"]


def test_missing_nebius_never_returns_fake_output(client):
    res = client.post("/api/generate", json={"prompt": "An underwater robot with fins"})
    assert res.status_code == 503 and "no AI response" in res.json()["detail"]
    assert client.get("/api/models").status_code == 503


def test_incompatible_compute_and_unknown_hardware_are_rejected(client):
    req = dict(
        robot=reference_robot().model_dump(mode="json"),
        task=RobotTask(description="Vision", needs_vision=True).model_dump(),
    )
    for id in ["mcu", "unknown"]:
        assert (
            client.post("/api/simulate", json={**req, "hardware_id": id}).status_code
            == 422
        )


def test_unconfigured_supabase_is_explicit(client):
    assert client.get("/api/projects").status_code == 503
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "not-a-real-password"},
        ).status_code
        == 503
    )


def test_production_ai_requires_access_token(client, monkeypatch):
    monkeypatch.setenv("LAB_ENV", "production")
    assert (
        client.post("/api/generate", json={"prompt": "Build a rover"}).status_code
        == 401
    )
    monkeypatch.setenv("LAB_ACCESS_TOKEN", "test-access")
    assert (
        client.post(
            "/api/generate",
            json={"prompt": "Build a rover"},
            headers={"X-Lab-Token": "test-access"},
        ).status_code
        == 503
    )


def test_ledger_starts_at_zero_and_is_not_balance(client):
    d = client.get("/api/usage").json()
    assert d["charged_usd"] == 0 and d["reserved_usd"] == 0
    assert d["balance_verified"] is False


@pytest.mark.skipif(
    not __import__("os").getenv("NEBIUS_API_KEY"),
    reason="Live Nebius credential not configured",
)
def test_live_authenticated_nvidia_catalog():
    # This is the live integration check. Other AI transport tests use explicit mocks.
    import asyncio

    result = asyncio.run(ai.catalog())
    assert result["authenticated"] is True and result["models"]


@pytest.mark.parametrize(
    "mutation", ["cylinder", "sphere", "zero_axis", "infinite_axis"]
)
def test_geometry_and_joint_consistency(mutation):
    d = reference_robot().model_dump()
    if mutation == "cylinder":
        d["components"][1]["size"] = (0.28, 0.12, 0.4)
    elif mutation == "sphere":
        d["components"][0]["shape"] = "sphere"
    elif mutation == "zero_axis":
        d["joints"][0]["axis"] = (0, 0, 0)
    else:
        d["joints"][0]["axis"] = (float("inf"), 0, 0)
    with pytest.raises(ValidationError):
        RobotSpecification.model_validate(d)
