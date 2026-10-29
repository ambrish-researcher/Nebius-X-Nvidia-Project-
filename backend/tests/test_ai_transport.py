"""Isolated transport/ledger tests; these do NOT establish live Nebius integration."""

import asyncio
import json
import pytest
import httpx
from fastapi import HTTPException
from backend.app import ai


@pytest.fixture
def configured(monkeypatch, tmp_path):
    monkeypatch.setenv("LAB_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("NEBIUS_API_KEY", "test-only-not-a-credential")
    monkeypatch.setenv("NEBIUS_MODEL_ID", "nvidia/test-nemotron")
    monkeypatch.setenv("NEBIUS_INPUT_USD_PER_MILLION", "1")
    monkeypatch.setenv("NEBIUS_OUTPUT_USD_PER_MILLION", "2")
    monkeypatch.setenv("NEBIUS_BUDGET_LIMIT_USD", "1")

    async def catalog():
        return {"models": ["nvidia/test-nemotron"]}

    monkeypatch.setattr(ai, "catalog", catalog)


def mock_transport(monkeypatch, status=200, body=None):
    calls = []

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            calls.append(kwargs)
            return httpx.Response(
                status,
                json=body
                or {
                    "model": "nvidia/test-nemotron",
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {"content": '{"answer":"test fixture"}'},
                        }
                    ],
                    "usage": {"prompt_tokens": 10, "completion_tokens": 5},
                },
            )

    monkeypatch.setattr(ai.httpx, "AsyncClient", Client)
    return calls


def test_real_response_path_cache_and_charges(configured, monkeypatch):
    calls = mock_transport(monkeypatch)
    a = asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    b = asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    assert a["cached"] is False and b["cached"] is True
    assert len(calls) == 1
    assert ai.usage()["charged_usd"] == pytest.approx(0.00002)
    assert ai.usage()["reserved_usd"] == 0


def test_budget_reserves_before_upstream_call(configured, monkeypatch):
    monkeypatch.setenv("NEBIUS_BUDGET_LIMIT_USD", ".0000001")
    calls = mock_transport(monkeypatch)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    assert exc.value.status_code == 429 and calls == []


def test_failed_upstream_keeps_reservation_and_blocks_duplicate(
    configured, monkeypatch
):
    calls = mock_transport(monkeypatch, status=503)
    with pytest.raises(HTTPException):
        asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    assert ai.usage()["reserved_usd"] > 0
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    assert exc.value.status_code == 409 and len(calls) == 1


def test_missing_pricing_blocks_spend(configured, monkeypatch):
    monkeypatch.delenv("NEBIUS_INPUT_USD_PER_MILLION")
    calls = mock_transport(monkeypatch)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    assert exc.value.status_code == 503 and calls == []


def test_supabase_auth_and_rls_write_uses_user_identity(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.reference import reference_robot
    from backend.app.models import RobotTask

    monkeypatch.setenv("SUPABASE_URL", "https://fixture.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-anon-not-a-credential")
    records = []

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, **kwargs):
            records.append((url, kwargs))
            return httpx.Response(200, json={"id": "owned-user-id"})

        async def post(self, url, **kwargs):
            records.append((url, kwargs))
            return httpx.Response(201, json={})

    monkeypatch.setattr(httpx, "AsyncClient", Client)
    robot = reference_robot()
    project = dict(
        id=robot.id,
        robot=robot.model_dump(mode="json"),
        task=RobotTask(description="Drive").model_dump(),
        hardware_id="cpu",
    )
    client = TestClient(app)
    assert client.post("/api/projects", json=project).status_code == 401
    res = client.post(
        "/api/projects", json=project, headers={"Authorization": "Bearer user-test-jwt"}
    )
    assert res.status_code == 200
    assert records[0][0].endswith("/auth/v1/user")
    assert records[1][1]["json"]["user_id"] == "owned-user-id"
    assert records[1][1]["headers"]["Authorization"] == "Bearer user-test-jwt"


@pytest.mark.parametrize("value", ["", "NaN", "-1", "invalid"])
def test_bad_or_empty_token_prices_never_dispatch(configured, monkeypatch, value):
    monkeypatch.setenv("NEBIUS_INPUT_USD_PER_MILLION", value)
    calls = mock_transport(monkeypatch)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "fixture"}))
    assert exc.value.status_code == 503 and calls == []


def success_body(
    content='{"answer":"Validated fixture","limitations":[]}', **overrides
):
    return {
        "model": "nvidia/test-nemotron",
        "choices": [{"finish_reason": "stop", "message": {"content": content}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        **overrides,
    }


def test_verification_requires_live_application_validation(configured, monkeypatch):
    from backend.app.main import health, validate_workflow

    mock_transport(monkeypatch, body=success_body())
    assert health()["live_inference_verified"] is False
    asyncio.run(ai.infer("tutor", {"prompt": "not app validated"}))
    assert health()["live_inference_verified"] is False
    asyncio.run(
        ai.infer(
            "tutor",
            {"prompt": "app validated"},
            validator=lambda d: validate_workflow("tutor", d),
        )
    )
    h = health()
    assert h["live_inference_verified"] is True
    evidence = h["inference_verification"]
    assert evidence["model"] == "nvidia/test-nemotron" and evidence["last_success_at"]
    assert "not a current availability" in evidence["basis"]
    # Persisted evidence survives a new DB connection; another model/keyless runtime is not verified.
    assert ai.verification_status()["last_success_at"] == evidence["last_success_at"]
    monkeypatch.setenv("NEBIUS_MODEL_ID", "nvidia/other-nemotron")
    assert ai.verification_status()["verified"] is False
    monkeypatch.setenv("NEBIUS_MODEL_ID", "nvidia/test-nemotron")
    monkeypatch.delenv("NEBIUS_API_KEY")
    assert ai.verification_status()["verified"] is False


def test_cache_and_legacy_rows_do_not_invent_live_evidence(configured, monkeypatch):
    from backend.app.main import validate_workflow

    mock_transport(monkeypatch, body=success_body())
    asyncio.run(ai.infer("tutor", {"prompt": "legacy"}))
    cached = asyncio.run(
        ai.infer(
            "tutor",
            {"prompt": "legacy"},
            validator=lambda d: validate_workflow("tutor", d),
        )
    )
    assert cached["cached"] is True
    assert ai.verification_status()["verified"] is False


@pytest.mark.parametrize(
    "body",
    [
        success_body("not JSON"),
        success_body('{"answer":""}'),
        success_body(model="different/model"),
        success_body(
            choices=[{"finish_reason": "length", "message": {"content": "{}"}}]
        ),
    ],
)
def test_failed_or_invalid_response_charged_but_never_verified(
    configured, monkeypatch, body
):
    from backend.app.main import validate_workflow

    mock_transport(monkeypatch, body=body)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            ai.infer(
                "tutor",
                {"prompt": "bad"},
                validator=lambda d: validate_workflow("tutor", d),
            )
        )
    assert exc.value.status_code == 502
    assert ai.usage()["charged_usd"] == pytest.approx(0.00002)
    assert ai.usage()["reserved_usd"] == 0
    assert ai.verification_status()["verified"] is False


@pytest.mark.parametrize(
    "stats",
    [
        {},
        {"prompt_tokens": -1, "completion_tokens": 5},
        {"prompt_tokens": True, "completion_tokens": 5},
        {"prompt_tokens": 10, "completion_tokens": 1.5},
    ],
)
def test_unknown_or_invalid_usage_retains_conservative_reservation(
    configured, monkeypatch, stats
):
    mock_transport(monkeypatch, body=success_body(usage=stats))
    asyncio.run(ai.infer("tutor", {"prompt": "unknown usage"}))
    assert ai.usage()["reserved_usd"] > 0
    assert ai.usage()["charged_usd"] == 0


def test_budget_defaults_and_cannot_exceed_one_dollar(configured, monkeypatch):
    for value in [None, "25", "1"]:
        if value is None:
            monkeypatch.delenv("NEBIUS_BUDGET_LIMIT_USD")
        else:
            monkeypatch.setenv("NEBIUS_BUDGET_LIMIT_USD", value)
        assert ai.usage()["limit_usd"] == 1


def test_reservation_exists_before_transport_and_settles_safely(
    configured, monkeypatch
):
    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            usage = ai.usage()
            assert (
                usage["requests"] == 1
                and usage["charged_usd"] == 0
                and 0 < usage["reserved_usd"] < 1
            )
            return httpx.Response(200, json=success_body())

    monkeypatch.setattr(ai.httpx, "AsyncClient", Client)
    asyncio.run(ai.infer("tutor", {"prompt": "reserve before dispatch"}))
    assert (
        ai.usage()["charged_usd"] == pytest.approx(0.00002)
        and ai.usage()["reserved_usd"] == 0
    )


def test_concurrent_requests_cannot_oversubscribe_budget(configured, monkeypatch):
    monkeypatch.setenv("NEBIUS_BUDGET_LIMIT_USD", ".007")
    monkeypatch.setenv("NEBIUS_MAX_OUTPUT_TOKENS", "2048")
    calls = []

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            calls.append(kwargs)
            await asyncio.sleep(0.03)
            return httpx.Response(200, json=success_body())

    monkeypatch.setattr(ai.httpx, "AsyncClient", Client)

    async def race():
        return await asyncio.gather(
            ai.infer("tutor", {"prompt": "one"}),
            ai.infer("tutor", {"prompt": "two"}),
            return_exceptions=True,
        )

    results = asyncio.run(race())
    assert len(calls) == 1
    assert (
        sum(isinstance(r, HTTPException) and r.status_code == 429 for r in results) == 1
    )
    assert ai.usage()["charged_usd"] + ai.usage()["reserved_usd"] <= 0.007


def test_budget_counts_existing_pending_reservations(configured, monkeypatch):
    with ai.database() as con:
        con.execute(
            "INSERT INTO requests (key,model,workflow,reserved,charged,tokens,response,created) VALUES (?,?,?,?,?,?,?,?)",
            ("pending", "nvidia/test-nemotron", "tutor", 0.999, 0, 0, None, 0),
        )
    calls = mock_transport(monkeypatch)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "new request"}))
    assert exc.value.status_code == 429 and calls == []


def test_additive_migration_preserves_legacy_usage(configured, tmp_path):
    import sqlite3

    path = tmp_path / "usage.sqlite"
    with sqlite3.connect(path) as con:
        con.execute(
            "CREATE TABLE requests (key TEXT PRIMARY KEY,model TEXT,workflow TEXT,reserved REAL,charged REAL,tokens INTEGER,response TEXT,created REAL)"
        )
        con.execute(
            "INSERT INTO requests VALUES (?,?,?,?,?,?,?,?)",
            ("legacy", "nvidia/test-nemotron", "tutor", 0.1, 0.2, 10, "{}", 0),
        )
    assert ai.usage()["charged_usd"] == pytest.approx(0.2)
    assert ai.usage()["reserved_usd"] == pytest.approx(0.1)
    assert ai.verification_status()["verified"] is False


def test_application_api_validates_inference_and_reports_safe_health(
    configured, monkeypatch
):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.reference import reference_robot

    calls = mock_transport(monkeypatch, body=success_body())
    client = TestClient(app)
    req = {
        "workflow": "tutor",
        "robot": reference_robot().model_dump(mode="json"),
        "prompt": "Explain the motors.",
        "level": "beginner",
    }
    res = client.post("/api/ai", json=req)
    assert (
        res.status_code == 200 and res.json()["data"]["answer"] == "Validated fixture"
    )
    assert "Explain the motors." in calls[0]["json"]["messages"][1]["content"]
    assert calls[0]["headers"]["Authorization"] == "Bearer test-only-not-a-credential"
    health = client.get("/api/health")
    assert health.json()["live_inference_verified"] is True
    for response in [res, health, client.get("/api/usage")]:
        assert "test-only-not-a-credential" not in response.text
        assert "Authorization" not in response.text
    assert client.post("/api/ai", json=req).json()["cached"] is True
    assert len(calls) == 1


def test_generate_api_schema_validation_controls_verification(configured, monkeypatch):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.reference import reference_robot

    body = success_body(json.dumps(reference_robot("arm").model_dump(mode="json")))
    mock_transport(monkeypatch, body=body)
    client = TestClient(app)
    res = client.post("/api/generate", json={"prompt": "Build a teaching arm"})
    assert res.status_code == 200
    assert res.json()["robot"]["provenance"] == "nebius"
    assert res.json()["assembly"]
    assert client.get("/api/health").json()["live_inference_verified"] is True


def test_invalid_robot_never_marks_application_verified(configured, monkeypatch):
    from fastapi.testclient import TestClient
    from backend.app.main import app

    mock_transport(monkeypatch, body=success_body('{"name":"not a robot"}'))
    client = TestClient(app)
    assert (
        client.post("/api/generate", json={"prompt": "Build a robot"}).status_code
        == 502
    )
    assert client.get("/api/health").json()["live_inference_verified"] is False
    assert ai.usage()["charged_usd"] > 0


def test_nemotron_generation_reserves_output_for_json(configured, monkeypatch):
    model = "nvidia/nemotron-3-super-120b-a12b"
    monkeypatch.setenv("NEBIUS_MODEL_ID", model)
    monkeypatch.setenv("NEBIUS_MAX_OUTPUT_TOKENS", "2048")

    async def catalog():
        return {"models": [model]}

    monkeypatch.setattr(ai, "catalog", catalog)
    calls = mock_transport(monkeypatch, body=success_body(model=model))
    asyncio.run(ai.infer("generate", {"prompt": "A small concept"}))
    assert calls[0]["json"]["max_tokens"] == 2048
    assert calls[0]["json"]["reasoning_effort"] == "none"
    assert calls[0]["json"]["chat_template_kwargs"] == {"enable_thinking": False}


def test_provider_usage_outside_token_bounds_is_recorded_and_rejected(
    configured, monkeypatch
):
    mock_transport(
        monkeypatch,
        body=success_body(usage={"prompt_tokens": 1_000_001, "completion_tokens": 5}),
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "overrun"}))
    assert exc.value.status_code == 502
    assert ai.usage()["charged_usd"] > 1
    assert ai.verification_status()["verified"] is False
    # Incorrect provider usage/prices cannot be undone, but the next dispatch is blocked.
    with pytest.raises(HTTPException) as blocked:
        asyncio.run(ai.infer("tutor", {"prompt": "next"}))
    assert blocked.value.status_code == 429


def test_generate_sends_schema_and_rejected_candidate_is_not_billed_again(
    configured, monkeypatch
):
    from backend.app.main import validate_robot
    from backend.app.models import RobotSpecification

    schema = RobotSpecification.model_json_schema()
    calls = mock_transport(
        monkeypatch, body=success_body('{"name":"Incomplete fixture"}')
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            ai.infer(
                "generate", {"prompt": "small robot"}, schema, validator=validate_robot
            )
        )
    assert "schema" in exc.value.detail
    assert calls[0]["json"]["response_format"]["type"] == "json_schema"
    assert calls[0]["json"]["response_format"]["json_schema"]["schema"] == schema
    with pytest.raises(HTTPException):
        asyncio.run(
            ai.infer(
                "generate", {"prompt": "small robot"}, schema, validator=validate_robot
            )
        )
    assert len(calls) == 1 and ai.verification_status()["verified"] is False
    with ai.database() as con:
        assert (
            json.loads(con.execute("SELECT response FROM requests").fetchone()[0])[
                "name"
            ]
            == "Incomplete fixture"
        )


@pytest.mark.parametrize(
    "body", [["unexpected"], {"model": "nvidia/test-nemotron", "choices": None}]
)
def test_invalid_provider_envelope_fails_closed(configured, monkeypatch, body):
    mock_transport(monkeypatch, body=body)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.infer("tutor", {"prompt": "invalid envelope"}))
    assert exc.value.status_code == 502
    assert ai.usage()["reserved_usd"] > 0
    assert ai.verification_status()["verified"] is False
