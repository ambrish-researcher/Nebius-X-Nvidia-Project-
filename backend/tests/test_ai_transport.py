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
    monkeypatch.setenv("NEBIUS_BUDGET_LIMIT_USD", "25")

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
                    "choices": [{"message": {"content": '{"answer":"test fixture"}'}}],
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
