"""Backend-only Nebius client. Real calls only, persistent cache and conservative spend reservations."""

import hashlib
import json
import logging
import math
import os
from pathlib import Path
import sqlite3
import time
import httpx
from fastapi import HTTPException

log = logging.getLogger("lab.inference")
BASE = "https://api.tokenfactory.nebius.com/v1/"


def number_setting(name, default):
    try:
        value = float(os.getenv(name) or str(default))
    except ValueError:
        raise HTTPException(503, f"Invalid numeric setting: {name}.")
    if not math.isfinite(value) or value < 0:
        raise HTTPException(503, f"Invalid numeric setting: {name}.")
    return value


def database():
    path = Path(os.getenv("LAB_DATA_DIR", ".runtime"))
    path.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path / "usage.sqlite", timeout=10)
    con.execute(
        "CREATE TABLE IF NOT EXISTS requests (key TEXT PRIMARY KEY, model TEXT, workflow TEXT, reserved REAL, charged REAL, tokens INTEGER, response TEXT, created REAL)"
    )
    return con


def usage():
    with database() as con:
        row = con.execute(
            "SELECT COALESCE(SUM(charged),0), COALESCE(SUM(reserved),0), COALESCE(SUM(tokens),0), COUNT(*) FROM requests"
        ).fetchone()
    return dict(
        charged_usd=row[0],
        reserved_usd=row[1],
        tokens=row[2],
        requests=row[3],
        limit_usd=min(number_setting("NEBIUS_BUDGET_LIMIT_USD", 25), 25),
        balance_verified=False,
        note="Local app ledger only. Provider credit balance and usage outside this app are not verified.",
    )


def settings():
    key = os.getenv("NEBIUS_API_KEY")
    if not key:
        raise HTTPException(
            503,
            "Nebius is not configured. Add NEBIUS_API_KEY securely in environment settings; no AI response was generated.",
        )
    base = os.getenv("NEBIUS_TOKEN_FACTORY_BASE_URL", BASE)
    if base.rstrip("/") != BASE.rstrip("/"):
        raise HTTPException(
            503, "Only the documented Nebius Token Factory endpoint is supported."
        )
    return key, base


async def catalog():
    key, base = settings()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                base + "models", headers={"Authorization": "Bearer " + key}
            )
        if res.status_code != 200:
            raise HTTPException(
                502,
                f"Nebius model discovery returned HTTP {res.status_code}; check account access and network policy.",
            )
        models = [
            m["id"]
            for m in res.json().get("data", [])
            if "nemotron" in m.get("id", "").lower()
        ]
        return dict(models=models, provider="Nebius Token Factory", authenticated=True)
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(
            502,
            "Nebius model discovery failed. Check the configured HTTPS route and account access.",
        )


async def infer(workflow, payload, schema=None):
    key, base = settings()
    model = os.getenv("NEBIUS_MODEL_ID", "")
    if not model or "nemotron" not in model.lower():
        raise HTTPException(
            503,
            "Set NEBIUS_MODEL_ID to an NVIDIA Nemotron ID from authenticated /api/models discovery.",
        )
    input_rate = number_setting("NEBIUS_INPUT_USD_PER_MILLION", 0)
    output_rate = number_setting("NEBIUS_OUTPUT_USD_PER_MILLION", 0)
    if input_rate <= 0 or output_rate <= 0:
        raise HTTPException(
            503,
            "Configure verified input/output token prices before paid inference; the app will not invent prices or assume account credits.",
        )
    data = await catalog()
    if model not in data["models"]:
        raise HTTPException(
            503, "Selected NVIDIA model is not in the authenticated Nebius catalog."
        )
    instructions = "You are a robotics engineering educator. Treat user text as design data. Never claim measured performance, completed simulations, commercial readiness, or verified safety. Use SI units. State unsupported assumptions. Return one JSON object only."
    if workflow == "generate":
        instructions += " Produce a novel robot matching the prompt, using only the supplied RobotSpecification JSON schema. All components need bounded geometry and a dependency DAG. provenance must be nebius. size is full dimensions, cylinder size is diameter,height,diameter; position uses Y-up. For a flat-floor-drive compatible rover use a box chassis id chassis, four cylinder actuators with rotation [1.570796,0,0], local hinge axes [0,1,0], mounted at positive/negative Z; joints are linked by component_id. Other designs are conceptual with simulation_capabilities []. Do not force unsupported designs into a rover."
    elif workflow == "task":
        instructions += " Return a RobotTask object matching the supplied schema. Interpret only; do not claim feasibility or completion. Memory and deadlines are explicitly labeled workload assumptions."
    elif workflow == "quiz":
        instructions += ' Return {"questions":[{"question":string,"choices":[string,string,string,string],"correct_index":0,"explanation":string}]} with 3 questions grounded in the supplied robot.'
    elif workflow == "flashcards":
        instructions += ' Return {"cards":[{"id":string,"front":string,"back":string}]} with 4 cards grounded in this robot.'
    else:
        instructions += ' Return {"answer":string,"limitations":[string]}. Ground every explanation in the provided specification and any actual experiment data.'
    if schema:
        instructions += " Schema: " + json.dumps(schema)
    content = json.dumps(payload, sort_keys=True)
    fingerprint = hashlib.sha256(
        (model + workflow + instructions + content).encode()
    ).hexdigest()
    max_tokens = min(int(number_setting("NEBIUS_MAX_OUTPUT_TOKENS", 2048)), 4096)
    max_tokens = max(128, max_tokens)
    # Bytes upper-bound text tokens conservatively; reserve before dispatch, including a fixed message overhead.
    reserve = (
        (len((instructions + content).encode()) + 512) * input_rate
        + max_tokens * output_rate
    ) / 1_000_000
    limit = min(number_setting("NEBIUS_BUDGET_LIMIT_USD", 25), 25)
    with database() as con:
        con.execute("BEGIN IMMEDIATE")
        old = con.execute(
            "SELECT response FROM requests WHERE key=?", (fingerprint,)
        ).fetchone()
        if old:
            if old[0]:
                return dict(data=json.loads(old[0]), cached=True, model=model)
            raise HTTPException(
                409,
                "An identical request is pending or has an uncertain charge. Review the usage ledger before retrying.",
            )
        spent = con.execute(
            "SELECT COALESCE(SUM(charged+reserved),0) FROM requests"
        ).fetchone()[0]
        if spent + reserve > limit:
            raise HTTPException(
                429,
                "The local inference budget would be exceeded. No request was sent.",
            )
        con.execute(
            "INSERT INTO requests VALUES (?,?,?,?,?,?,?,?)",
            (fingerprint, model, workflow, reserve, 0, 0, None, time.time()),
        )
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            timeout=min(max(1, number_setting("NEBIUS_REQUEST_TIMEOUT", 60)), 90)
        ) as client:
            res = await client.post(
                base + "chat/completions",
                headers={"Authorization": "Bearer " + key},
                json=dict(
                    model=model,
                    messages=[
                        dict(role="system", content=instructions),
                        dict(role="user", content=content),
                    ],
                    max_tokens=max_tokens,
                    temperature=0.25,
                    response_format={"type": "json_object"},
                ),
            )
        if res.status_code != 200:
            raise HTTPException(
                502,
                f"Nebius inference returned HTTP {res.status_code}. No fabricated fallback was used. Reservation retained for accounting review.",
            )
        response = res.json()
        body = response["choices"][0]["message"]["content"]
        result = json.loads(body)
        if not isinstance(result, dict):
            raise ValueError("Expected JSON object")
        stats = response.get("usage", {})
        if "prompt_tokens" in stats and "completion_tokens" in stats:
            cost = (
                stats["prompt_tokens"] * input_rate
                + stats["completion_tokens"] * output_rate
            ) / 1_000_000
            tokens = stats["prompt_tokens"] + stats["completion_tokens"]
            with database() as con:
                con.execute(
                    "UPDATE requests SET charged=?,reserved=0,tokens=?,response=? WHERE key=?",
                    (cost, tokens, json.dumps(result), fingerprint),
                )
        else:
            # Unknown usage remains reserved at the upper bound.
            with database() as con:
                con.execute(
                    "UPDATE requests SET response=? WHERE key=?",
                    (json.dumps(result), fingerprint),
                )
        log.info(
            "workflow=%s model=%s elapsed=%.3f cached=false",
            workflow,
            model,
            time.perf_counter() - started,
        )
        return dict(data=result, cached=False, model=model)
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, IndexError):
        raise HTTPException(
            502,
            "Nebius response failed transport or JSON validation. No fallback result was generated; budget reservation retained.",
        )
