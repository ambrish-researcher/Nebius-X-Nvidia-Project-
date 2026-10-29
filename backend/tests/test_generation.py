import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app import ai, request_jobs
from backend.app.generation import validate_design, Design
from backend.app.reference import reference_robot
from backend.app.simulation import assess, build_model
from pydantic import ValidationError


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("LAB_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("LAB_ACCESS_TOKEN", raising=False)
    monkeypatch.delenv("LAB_ENV", raising=False)
    return TestClient(app)


def design(kind="legged"):
    return dict(
        coordinate_system="Y_UP",
        reasoning="A thermal sensor supports inspection; gait control is not implemented.",
        name="Distinct quadruped",
        purpose="Inspect pipes using a thermal sensor",
        classification=kind,
        dimensions_m=[1, 1, 1],
        parts=[
            dict(
                id="body",
                name="Body",
                kind="structure",
                shape="box",
                size=[0.8, 0.2, 0.4],
                at=[0, 0.6, 0],
                mass_kg=3,
            ),
            dict(
                id="camera",
                name="Thermal camera",
                kind="sensor",
                shape="box",
                size=[0.1, 0.1, 0.1],
                at=[0.3, 0.8, 0],
                mass_kg=0.1,
                parent="body",
                color="#bb66aa",
            ),
        ],
        joints=[],
        capabilities=["Thermal inspection"],
        mobility="Four articulated legs",
        control="Gait planner required",
        limitations=["No walking controller is implemented"],
    )


def test_compact_spec_material_relationships_and_capabilities():
    r = validate_design(design())
    assert r["classification"] == "legged"
    assert r["components"][1]["depends_on"] == ["body"]
    assert r["components"][1]["appearance"]["color"] == "#bb66aa"
    assert r["provenance"] == "nebius"
    assert r["id"]
    for mutation in ["shape", "parent", "size"]:
        d = design()
        d["parts"][1][mutation] = {
            "shape": "mesh",
            "parent": "missing",
            "size": [float("nan"), 1, 1],
        }[mutation]
        with pytest.raises(ValidationError):
            validate_design(d)


def test_idempotency_status_and_payload_conflict(client, monkeypatch):
    calls = []

    async def infer(*args, **kwargs):
        calls.append(1)
        return dict(data=validate_design(design()), model="test-nemotron", cached=False)

    monkeypatch.setattr(ai, "infer", infer)
    req = dict(prompt="Create a thermal quadruped", request_id="request-123")
    a = client.post("/api/generate", json=req)
    assert a.status_code == 200
    assert a.json()["assessment"]["physics_valid"] is False
    assert client.post("/api/generate", json=req).json() == a.json()
    assert client.get("/api/generations/request-123").json()["result"] == a.json()
    assert len(calls) == 1
    assert (
        client.post(
            "/api/generate", json={**req, "prompt": "Different robot"}
        ).status_code
        == 409
    )


def test_status_is_protected(client, monkeypatch):
    monkeypatch.setenv("LAB_ACCESS_TOKEN", "test-access")
    assert client.get("/api/generations/request-123").status_code == 401
    assert (
        client.get(
            "/api/generations/request-123", headers={"X-Lab-Token": "test-access"}
        ).status_code
        == 404
    )


def test_unknown_charge_cannot_be_forked_by_another_request_id(client, monkeypatch):
    request_jobs.begin("original-id", "Same robot prompt", False)
    request_jobs.link("original-id", "unresolved")
    with ai.database() as con:
        con.execute(
            "INSERT INTO requests(key,model,workflow,reserved,charged,tokens,created) VALUES (?,?,?,?,?,?,?)",
            ("unresolved", "nvidia/test-nemotron", "generate", 0.1, 0, 0, 0),
        )

    async def forbidden(*a, **k):
        raise AssertionError("No provider dispatch allowed")

    monkeypatch.setattr(ai, "infer", forbidden)
    r = client.post(
        "/api/generate",
        json={
            "prompt": "Same robot prompt",
            "request_id": "another-id",
            "retry_failed": True,
        },
    )
    assert r.status_code == 409
    assert r.json()["generation"]["billing"] == "uncertain"
    assert not r.json()["generation"]["retry_allowed"]
    assert ai.usage()["reserved_usd"] == 0.1


def test_rover_compilation_and_motor_limits_are_real(client):
    robot = reference_robot()
    robot.joints[0].velocity_limit_rad_s = 2
    robot.joints[0].force_limit_nm = 0.4
    model = build_model(robot)
    assert model.actuator_ctrlrange[0, 1] == 2
    assert model.actuator_forcerange[0, 1] == 0.4
    assert assess(robot)["physics_valid"]
    assert assess(robot)["simulation_executed"] is False
    assert not assess(reference_robot("arm"))["physics_valid"]


def test_status_recovers_validated_ledger_after_worker_window(client):
    import time

    request_jobs.begin("crash-window", "A new teaching robot", False)
    request_jobs.link("crash-window", "completed-ledger")
    robot = reference_robot().model_dump(mode="json")
    with ai.database() as con:
        con.execute(
            "INSERT INTO requests(key,model,workflow,reserved,charged,tokens,response,created,validated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (
                "completed-ledger",
                "nvidia/test-nemotron",
                "generate",
                0,
                0.001,
                100,
                json.dumps(robot),
                time.time(),
                time.time(),
            ),
        )
    result = client.get("/api/generations/crash-window").json()
    assert result["status"] == "succeeded" and result["result"]["cached"] is True
    assert result["result"]["robot"]["id"] == robot["id"]
    assert ai.usage()["requests"] == 1


def test_pending_status_and_legacy_unknown_never_dispatch(client, monkeypatch):
    request_jobs.begin("pending-request", "A pending robot", False)
    assert client.get("/api/generations/pending-request").json()["status"] == "pending"
    with ai.database() as con:
        con.execute(
            "INSERT INTO requests(key,model,workflow,reserved,charged,tokens,created) VALUES (?,?,?,?,?,?,?)",
            ("legacy-unknown", "nvidia/test-nemotron", "generate", 0.05, 0, 0, 0),
        )

    async def forbidden(*a, **k):
        raise AssertionError("Cannot dispatch")

    monkeypatch.setattr(ai, "infer", forbidden)
    r = client.post(
        "/api/generate",
        json={"prompt": "A different new robot", "request_id": "legacy-blocked"},
    )
    assert (
        r.status_code == 409 and r.json()["generation"]["billing"] == "uncertain_legacy"
    )
    assert not r.json()["generation"]["retry_allowed"]
    assert ai.usage()["reserved_usd"] == 0.05


def test_solver_frames_follow_declared_joint_order():
    from backend.app.simulation import simulate
    from backend.app.models import SimulationRequest, RobotTask

    robot = reference_robot()
    a = simulate(
        SimulationRequest(
            robot=robot, task=RobotTask(description="Drive"), duration_s=1
        )
    )
    robot.joints = list(reversed(robot.joints))
    b = simulate(
        SimulationRequest(
            robot=robot, task=RobotTask(description="Drive"), duration_s=1
        )
    )
    assert b["frames"][-1]["joints"] == pytest.approx(
        list(reversed(a["frames"][-1]["joints"]))
    )
    assert b["frames"][-1]["controller_output"] == pytest.approx(
        list(reversed(a["frames"][-1]["controller_output"]))
    )
    assert b["metrics"]["displacement_m"] == pytest.approx(
        a["metrics"]["displacement_m"]
    )


def test_unsupported_wheel_mount_rotation_is_not_claimed_physics_valid():
    robot = reference_robot()
    wheel = next(c for c in robot.components if c.kind == "actuator")
    wheel.rotation = (wheel.rotation[0], 0.4, 0)
    assert not assess(robot)["physics_valid"]
