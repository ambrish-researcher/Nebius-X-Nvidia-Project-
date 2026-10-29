"""Backend-only Nebius client. Real calls only, persistent cache and conservative spend reservations."""

import hashlib
import json
import logging
import math
import os
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import time
import httpx
from fastapi import HTTPException
from pydantic import ValidationError

log = logging.getLogger("lab.inference")
BASE = "https://api.tokenfactory.nebius.com/v1/"
MAX_BUDGET_USD = 1.0


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
    # Additive migration preserves existing charges, reservations, and cached results.
    columns = {row[1] for row in con.execute("PRAGMA table_info(requests)")}
    for column, kind in [
        ("response_model", "TEXT"),
        ("completed_at", "REAL"),
        ("validated_at", "REAL"),
    ]:
        if column not in columns:
            try:
                con.execute(f"ALTER TABLE requests ADD COLUMN {column} {kind}")
            except sqlite3.OperationalError:
                # Another worker may have applied the same additive migration.
                if column not in {
                    row[1] for row in con.execute("PRAGMA table_info(requests)")
                }:
                    con.close()
                    raise
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
        limit_usd=budget_limit(),
        balance_verified=False,
        note="Local app ledger only. Provider credit balance and usage outside this app are not verified.",
    )


def budget_limit():
    return min(
        number_setting("NEBIUS_BUDGET_LIMIT_USD", MAX_BUDGET_USD), MAX_BUDGET_USD
    )


def verification_status():
    """Historical evidence for this model, never a guarantee of current availability."""
    model = os.getenv("NEBIUS_MODEL_ID", "")
    enabled = bool(os.getenv("NEBIUS_API_KEY")) and os.getenv(
        "NEBIUS_TOKEN_FACTORY_BASE_URL", BASE
    ).rstrip("/") == BASE.rstrip("/")
    with database() as con:
        row = con.execute(
            "SELECT MAX(validated_at) FROM requests WHERE model=? AND response_model=? AND completed_at IS NOT NULL",
            (model, model),
        ).fetchone()
    verified_at = row[0] if row else None
    verified = bool(enabled and model and verified_at)
    return dict(
        verified=verified,
        model=model if verified else None,
        provider="Nebius Token Factory" if verified else None,
        last_success_at=datetime.fromtimestamp(verified_at, timezone.utc).isoformat()
        if verified
        else None,
        basis="Previously successful live response validated by the application; not a current availability check.",
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
    return key, BASE


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


async def infer(workflow, payload, schema=None, *, validator: Callable | None = None):
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
    timeout = min(max(1, number_setting("NEBIUS_REQUEST_TIMEOUT", 60)), 90)
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
    # Structured generation must leave the fixed output budget for the JSON body.
    # Nebius OpenAPI exposes reasoning_effort and model-specific extra parameters.
    generation_options = (
        {"reasoning_effort": "none", "chat_template_kwargs": {"enable_thinking": False}}
        if workflow == "generate" and model == "nvidia/nemotron-3-super-120b-a12b"
        else {}
    )
    response_format = (
        {
            "type": "json_schema",
            "json_schema": {"name": "robotics_response", "schema": schema},
        }
        if schema
        else {"type": "json_object"}
    )
    fingerprint = hashlib.sha256(
        (
            model
            + workflow
            + instructions
            + content
            + json.dumps(generation_options, sort_keys=True)
            + json.dumps(response_format, sort_keys=True)
        ).encode()
    ).hexdigest()
    max_tokens = min(int(number_setting("NEBIUS_MAX_OUTPUT_TOKENS", 2048)), 4096)
    max_tokens = max(128, max_tokens)
    # Bytes upper-bound text tokens conservatively; reserve before dispatch, including a fixed message overhead.
    input_token_bound = len((instructions + content).encode()) + 512
    reserve = (input_token_bound * input_rate + max_tokens * output_rate) / 1_000_000
    limit = budget_limit()
    with database() as con:
        con.execute("BEGIN IMMEDIATE")
        old = con.execute(
            "SELECT response FROM requests WHERE key=?", (fingerprint,)
        ).fetchone()
        if old:
            if old[0]:
                try:
                    cached_data = json.loads(old[0])
                    if validator:
                        cached_data = validator(cached_data)
                except (ValueError, KeyError, TypeError):
                    raise HTTPException(
                        502, "Cached output failed the required application schema."
                    )
                # A cache hit cannot create new live-verification evidence.
                return dict(data=cached_data, cached=True, model=model)
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
            "INSERT INTO requests (key,model,workflow,reserved,charged,tokens,response,created) VALUES (?,?,?,?,?,?,?,?)",
            (fingerprint, model, workflow, reserve, 0, 0, None, time.time()),
        )
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
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
                    response_format=response_format,
                    **generation_options,
                ),
            )
        if res.status_code != 200:
            raise HTTPException(
                502,
                f"Nebius inference returned HTTP {res.status_code}. No fabricated fallback was used. Reservation retained for accounting review.",
            )
        response = res.json()
        if not isinstance(response, dict):
            raise ValueError("Expected provider response object")
        stats = response.get("usage", {})
        # Reconcile actual reported usage even if output is truncated, invalid JSON,
        # or fails the application schema. Unknown usage retains its reservation.
        known_usage = isinstance(stats, dict) and all(
            type(stats.get(k)) is int and stats[k] >= 0
            for k in ("prompt_tokens", "completion_tokens")
        )
        if known_usage:
            cost = (
                stats["prompt_tokens"] * input_rate
                + stats["completion_tokens"] * output_rate
            ) / 1_000_000
            if not math.isfinite(cost):
                raise ValueError("Nonfinite usage cost")
            with database() as con:
                con.execute(
                    "UPDATE requests SET charged=?,reserved=0,tokens=? WHERE key=?",
                    (
                        cost,
                        stats["prompt_tokens"] + stats["completion_tokens"],
                        fingerprint,
                    ),
                )
            if (
                stats["prompt_tokens"] > input_token_bound
                or stats["completion_tokens"] > max_tokens
            ):
                raise HTTPException(
                    502,
                    "Provider usage exceeded the reserved token bounds. Actual usage recorded; review billing before continuing.",
                )
        if response.get("model") != model:
            raise HTTPException(
                502,
                "Nebius returned a different or missing model ID. Usage recorded; response rejected.",
            )
        choice = response["choices"][0]
        if choice.get("finish_reason") != "stop":
            raise HTTPException(
                502,
                f"NVIDIA output did not finish normally ({choice.get('finish_reason')}; possibly token-limited). Usage recorded; simplify the request.",
            )
        result = json.loads(choice["message"]["content"])
        if not isinstance(result, dict):
            raise ValueError("Expected JSON object")
        # Retain the parsed candidate so a schema failure can be diagnosed/revalidated
        # locally, without another paid request. It is NOT live verification evidence.
        with database() as con:
            con.execute(
                "UPDATE requests SET response=? WHERE key=?",
                (json.dumps(result), fingerprint),
            )
        if validator:
            result = validator(result)
        completed_at = time.time()
        with database() as con:
            con.execute(
                "UPDATE requests SET response=?,response_model=?,completed_at=?,validated_at=? WHERE key=?",
                (
                    json.dumps(result),
                    model,
                    completed_at,
                    completed_at if validator else None,
                    fingerprint,
                ),
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
    except ValidationError as exc:
        # Types only: never echo input values (which could contain private user data).
        types = sorted({error["type"] for error in exc.errors(include_input=False)})
        raise HTTPException(
            502,
            "NVIDIA output failed the application schema ("
            + ", ".join(types)
            + "). Usage recorded; no fallback generated.",
        )
    except (
        httpx.HTTPError,
        ValueError,
        KeyError,
        IndexError,
        TypeError,
        AttributeError,
        OverflowError,
    ):
        raise HTTPException(
            502,
            "Nebius response failed transport, JSON, or application schema validation. No fallback was generated; reported usage is recorded and unknown charges remain reserved.",
        )
