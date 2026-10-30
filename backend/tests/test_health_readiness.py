"""Regression checks for Render liveness and readiness separation."""
from fastapi.testclient import TestClient
from app import ai
from app.main import app


def test_health_does_not_open_ledger(monkeypatch):
    def broken_ledger():
        raise OSError("ledger unavailable")

    monkeypatch.setattr(ai, "verification_status", broken_ledger)
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_reports_unavailable_ledger_without_secret(monkeypatch):
    def broken_ledger():
        raise OSError("SECRET_INTERNAL_DATABASE_PATH")

    monkeypatch.setattr(ai, "verification_status", broken_ledger)
    response = TestClient(app).get("/api/readiness")
    assert response.status_code == 503
    assert response.json()["ledger_available"] is False
    assert "SECRET_INTERNAL_DATABASE_PATH" not in response.text


def test_readiness_reports_healthy_ledger(monkeypatch):
    monkeypatch.setattr(
        ai, "verification_status", lambda: {"verified": False}
    )
    response = TestClient(app).get("/api/readiness")
    assert response.status_code == 200
    assert response.json()["ledger_available"] is True
