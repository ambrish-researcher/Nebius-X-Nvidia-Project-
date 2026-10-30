"""Safe, read-only production API smoke checks.

Run with ARISE_BACKEND_URL and optional ARISE_FRONTEND_URL. No paid inference
or generation is dispatched. All checks have finite timeouts.
"""
import json
import os
import urllib.error
import urllib.request


def get(base, path):
    with urllib.request.urlopen(base.rstrip("/") + path, timeout=25) as response:
        assert response.status == 200, (path, response.status)
        return json.loads(response.read())


def main():
    backend = os.environ["ARISE_BACKEND_URL"]
    health = get(backend, "/api/health")
    assert health["status"] == "ok"
    ready = get(backend, "/api/readiness")
    assert ready["status"] == "ready", ready
    assert ready["ledger_available"] is True
    assert ready["ledger_write_verified"] is True
    capabilities = get(backend, "/api/capabilities")
    assert capabilities["compute_explanation"]["physics"]["gpu_role"]
    hardware = get(backend, "/api/hardware")
    assert hardware
    rover = get(backend, "/api/reference/rover")
    assert rover["robot"]["classification"] == "rover"
    frontend = os.getenv("ARISE_FRONTEND_URL")
    if frontend:
        proxy = get(frontend, "/api/health")
        assert proxy["status"] == "ok"
    print("PASS: health, PostgreSQL write/read readiness, capabilities, hardware, rover reference, optional frontend proxy.")
    print("NOT TESTED: persistence across restart, Nebius authentication/inference, arbitrary robot missions.")


if __name__ == "__main__":
    main()
