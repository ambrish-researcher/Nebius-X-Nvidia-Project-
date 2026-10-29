"""Durable, protected status recovery. A status GET never dispatches inference."""

import json, time
from fastapi import HTTPException
from . import ai


def db():
    con = ai.database()
    con.execute(
        "CREATE TABLE IF NOT EXISTS generation_jobs (id TEXT PRIMARY KEY,prompt TEXT NOT NULL,retry INTEGER NOT NULL,status TEXT NOT NULL,result TEXT,error TEXT,request_key TEXT,created REAL NOT NULL)"
    )
    con.commit()
    return con


def status(request_id):
    with db() as con:
        row = con.execute(
            "SELECT status,result,error,request_key,created FROM generation_jobs WHERE id=?",
            (request_id,),
        ).fetchone()
    if not row:
        raise HTTPException(
            404,
            "Generation request not found. No inference was sent by this status check.",
        )
    state, result, error, key, created = row
    billing = "not_dispatched"
    if key:
        with ai.database() as con:
            r = con.execute(
                "SELECT reserved,charged,response,tokens,validated_at,model FROM requests WHERE key=?",
                (key,),
            ).fetchone()
        if r:
            billing = "uncertain" if r[0] > 0 else "known"
        if state != "succeeded" and r and r[2] and r[4]:
            # Recover the narrow crash window between validated ledger write and job write.
            from .models import RobotSpecification
            from .reference import assembly_steps
            from .simulation import assess

            robot = RobotSpecification.model_validate_json(r[2])
            recovered = dict(
                robot=robot.model_dump(mode="json"),
                assembly=assembly_steps(robot),
                model=r[5],
                cached=True,
                request_id=request_id,
                assessment=assess(robot),
            )
            finish(request_id, result=recovered)
            state, result, error = "succeeded", json.dumps(recovered), None
    if state == "pending" and time.time() - created > 110:
        state = "uncertain"
        error = "Worker did not finish recording this request. Check status or reconcile provider billing; do not submit it again."
    legacy_block = bool(error and error.startswith("Legacy generation reservations"))
    if legacy_block:
        billing = "uncertain_legacy"
    return dict(
        request_id=request_id,
        status=state,
        result=json.loads(result) if result else None,
        error=error,
        billing=billing,
        retry_allowed=state == "failed"
        and billing not in ("uncertain", "uncertain_legacy"),
    )


def begin(request_id, prompt, retry):
    with db() as con:
        con.execute("BEGIN IMMEDIATE")
        row = con.execute(
            "SELECT prompt,retry FROM generation_jobs WHERE id=?", (request_id,)
        ).fetchone()
        if row:
            if row != (prompt, int(retry)):
                raise HTTPException(
                    409, "Request ID already belongs to another payload."
                )
            return False
        con.execute(
            "INSERT INTO generation_jobs(id,prompt,retry,status,created) VALUES (?,?,?,'pending',?)",
            (request_id, prompt, int(retry), time.time()),
        )
    return True


def link(request_id, key):
    with db() as con:
        con.execute(
            "UPDATE generation_jobs SET request_key=? WHERE id=?", (key, request_id)
        )


def guard_unresolved(request_id, prompt):
    with db() as con:
        row = con.execute(
            "SELECT j.request_key FROM generation_jobs j JOIN requests r ON r.key=j.request_key WHERE j.prompt=? AND j.id<>? AND r.reserved>0 AND r.response IS NULL LIMIT 1",
            (prompt, request_id or ""),
        ).fetchone()
        legacy = con.execute(
            "SELECT COUNT(*) FROM requests r WHERE r.workflow='generate' AND r.reserved>0 AND r.response IS NULL AND NOT EXISTS(SELECT 1 FROM generation_jobs j WHERE j.request_key=r.key)"
        ).fetchone()[0]
    if row:
        if request_id:
            link(request_id, row[0])
        raise HTTPException(
            409,
            "An earlier generation of this prompt has an unresolved charge. Recover its status; no new inference was sent.",
        )
    if legacy:
        raise HTTPException(
            409,
            "Legacy generation reservations have unknown charges. Reconcile provider billing before new generation; no reservation was cleared.",
        )


def finish(request_id, result=None, error=None):
    with db() as con:
        con.execute(
            "UPDATE generation_jobs SET status=?,result=?,error=? WHERE id=?",
            (
                "succeeded" if result else "failed",
                json.dumps(result) if result else None,
                error,
                request_id,
            ),
        )
