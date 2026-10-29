import json
import os
import secrets
from typing import Literal
from pathlib import Path
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv
from . import ai
from .models import (
    AIRequest,
    GenerationRequest,
    ProjectRequest,
    RobotSpecification,
    RobotTask,
    SimulationRequest,
    RobotProject,
)
from .reference import reference_robot, assembly_steps
from .hardware import HARDWARE, recommend
from .simulation import simulate
from .simulation import assess
from .generation import Design, validate_design
from . import request_jobs
from starlette.responses import JSONResponse

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
app = FastAPI(title="Robotics Intelligence Platform", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Lab-Token"],
)


@app.middleware("http")
async def deployment_guard(request: Request, call_next):
    # Public deployments must set an access token before enabling billable AI.
    from starlette.responses import JSONResponse

    protected = request.url.path in [
        "/api/generate",
        "/api/ai",
        "/api/models",
    ] or request.url.path.startswith("/api/generations/")
    token = os.getenv("LAB_ACCESS_TOKEN")
    if protected and (token or os.getenv("LAB_ENV") == "production"):
        if not token or not secrets.compare_digest(
            request.headers.get("x-lab-token", ""), token
        ):
            return JSONResponse(
                {"detail": "A valid lab access token is required."}, status_code=401
            )
    return await call_next(request)


@app.get("/api/health")
def health():
    verification = ai.verification_status()
    return dict(
        status="ok",
        visual_preview=os.getenv("ARISE_VISUAL_DEV") == "1",
        physics="mujoco",
        nebius_configured=bool(os.getenv("NEBIUS_API_KEY")),
        model_configured=bool(os.getenv("NEBIUS_MODEL_ID")),
        pricing_configured=bool(
            os.getenv("NEBIUS_INPUT_USD_PER_MILLION")
            and os.getenv("NEBIUS_OUTPUT_USD_PER_MILLION")
        ),
        supabase_configured=bool(
            os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY")
        ),
        live_inference_verified=verification["verified"],
        inference_verification=verification,
    )


@app.get("/api/capabilities")
def capabilities():
    return dict(
        procedural_geometry=["box", "cylinder", "sphere"],
        simulation=[
            dict(
                id="flat-floor-drive",
                robot="Four-wheel cylindrical-wheel box-chassis rover",
                scope="Forward velocity control on a flat plane",
                unsupported=[
                    "navigation",
                    "vision",
                    "manipulation",
                    "terrain",
                    "hardware inference",
                ],
            )
        ],
        integrations={
            "MuJoCo": "integrated and tested locally",
            "Nebius Token Factory": "backend adapter; see /api/health for recorded live verification",
            "Supabase": "adapter; project and login required",
            "Isaac Sim": "planned",
            "Isaac Lab": "planned",
            "Isaac ROS": "educational",
            "Cosmos": "educational",
            "GR00T": "educational",
            "CUDA": "educational; no GPU workload measured",
            "TensorRT": "educational",
            "JetPack": "educational",
        },
    )


@app.get("/api/reference/{family}")
def reference(family: Literal["rover", "arm"]):
    robot = reference_robot(family)
    return dict(robot=robot, assembly=assembly_steps(robot))


@app.get("/api/hardware")
def hardware():
    return HARDWARE


@app.get("/api/usage")
def usage():
    return ai.usage()


@app.get("/api/models")
async def models():
    return await ai.catalog()


def validate_robot(data):
    return validate_design(data)


def validate_workflow(workflow, data):
    if workflow == "task":
        data = RobotTask.model_validate(data).model_dump()
    elif workflow == "quiz":

        class Question(BaseModel):
            question: str
            choices: list[str] = Field(min_length=4, max_length=4)
            correct_index: int = Field(ge=0, le=3)
            explanation: str

        data = {
            "questions": [
                Question.model_validate(q).model_dump() for q in data["questions"]
            ]
        }
        if not 1 <= len(data["questions"]) <= 10:
            raise ValueError()
    elif workflow == "flashcards":

        class Card(BaseModel):
            id: str
            front: str
            back: str

        data = {"cards": [Card.model_validate(c).model_dump() for c in data["cards"]]}
        if not 1 <= len(data["cards"]) <= 12:
            raise ValueError()
    elif not isinstance(data.get("answer"), str) or not data["answer"].strip():
        raise ValueError()
    return data


@app.post("/api/generate")
async def generate(req: GenerationRequest):
    if req.request_id and not request_jobs.begin(
        req.request_id, req.prompt, req.retry_failed
    ):
        existing = request_jobs.status(req.request_id)
        if existing["status"] == "succeeded":
            return existing["result"]
        return JSONResponse(
            existing, status_code=202 if existing["status"] == "pending" else 409
        )
    try:
        request_jobs.guard_unresolved(req.request_id, req.prompt)
        result = await ai.infer(
            "generate",
            {"prompt": req.prompt},
            Design.model_json_schema(),
            validator=validate_robot,
            request_id=req.request_id,
            retry_failed=req.retry_failed,
            on_request_key=(lambda key: request_jobs.link(req.request_id, key))
            if req.request_id
            else None,
        )
        robot = RobotSpecification.model_validate(result["data"])
        if req.request_id and result.get("request_key"):
            request_jobs.link(req.request_id, result["request_key"])
        output = dict(
            robot=robot.model_dump(mode="json"),
            assembly=assembly_steps(robot),
            model=result["model"],
            cached=result["cached"],
            request_id=req.request_id,
            assessment=assess(robot),
        )
        if req.request_id:
            request_jobs.finish(req.request_id, result=output)
        return output
    except HTTPException as exc:
        if req.request_id:
            request_jobs.finish(req.request_id, error=str(exc.detail))
            return JSONResponse(
                {
                    "detail": exc.detail,
                    "generation": request_jobs.status(req.request_id),
                },
                status_code=exc.status_code,
            )
        raise


@app.get("/api/generations/{request_id}")
def generation_status(request_id: str):
    return request_jobs.status(request_id)


@app.post("/api/assess")
def assess_design(robot: RobotSpecification):
    return assess(robot)


@app.post("/api/ai")
async def assist(req: AIRequest):
    schema = RobotTask.model_json_schema() if req.workflow == "task" else None
    return await ai.infer(
        req.workflow,
        req.model_dump(mode="json"),
        schema,
        validator=lambda data: validate_workflow(req.workflow, data),
    )


@app.post("/api/recommend")
def recommendation(req: ProjectRequest):
    return recommend(req)


@app.post("/api/simulate")
def run(req: SimulationRequest):
    candidates = recommend(req)["candidates"]
    chosen = next((c for c in candidates if c["id"] == req.hardware_id), None)
    if not chosen:
        raise HTTPException(422, "Unknown hardware selection")
    if not chosen["compatible"]:
        raise HTTPException(
            422,
            "Selected compute configuration is incompatible with workload assumptions.",
        )
    try:
        return simulate(req)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


# Supabase requests use the user's JWT and anon key. Row-level security owns authorization.
def supabase_config():
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if not url or not key:
        raise HTTPException(
            503, "Supabase is not configured; project data remains in browser storage."
        )
    from urllib.parse import urlparse

    p = urlparse(url)
    if (
        p.scheme != "https"
        or not p.hostname
        or not p.hostname.endswith(".supabase.co")
        or p.path
    ):
        raise HTTPException(
            503, "Use the HTTPS project URL of a hosted Supabase project."
        )
    return url, key


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=200)


@app.post("/api/auth/login")
async def login(req: Login):
    url, key = supabase_config()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                url + "/auth/v1/token?grant_type=password",
                headers={"apikey": key},
                json=req.model_dump(),
            )
        if res.status_code != 200:
            raise HTTPException(
                401,
                "Supabase sign-in failed; check the account and email confirmation.",
            )
        data = res.json()
        return dict(access_token=data["access_token"], expires_in=data["expires_in"])
    except httpx.HTTPError:
        raise HTTPException(
            502, "Supabase sign-in could not reach the configured service."
        )


async def cloud_client(authorization):
    url, key = supabase_config()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in to sync your projects.")
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            url + "/auth/v1/user",
            headers={"apikey": key, "Authorization": authorization},
        )
    if res.status_code != 200:
        raise HTTPException(401, "Supabase session expired. Sign in again.")
    return url, key, res.json()["id"]


@app.post("/api/projects")
async def save_project(
    project: RobotProject, authorization: str | None = Header(default=None)
):
    try:
        url, key, uid = await cloud_client(authorization)
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                url + "/rest/v1/robot_projects?on_conflict=id",
                headers={
                    "apikey": key,
                    "Authorization": authorization,
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                },
                json=dict(
                    id=project.id, user_id=uid, data=project.model_dump(mode="json")
                ),
            )
        if res.status_code not in (200, 201, 204):
            raise HTTPException(
                502, "Supabase save failed; check migration and row-level security."
            )
        return dict(saved=True, storage="supabase")
    except httpx.HTTPError:
        raise HTTPException(502, "Supabase sync failed; browser copy is retained.")


@app.get("/api/projects")
async def list_projects(authorization: str | None = Header(default=None)):
    try:
        url, key, uid = await cloud_client(authorization)
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                url + "/rest/v1/robot_projects",
                params={
                    "select": "id,data,updated_at",
                    "order": "updated_at.desc",
                    "limit": "20",
                    "user_id": "eq." + uid,
                },
                headers={"apikey": key, "Authorization": authorization},
            )
        if res.status_code != 200:
            raise HTTPException(502, "Supabase project query failed.")
        return res.json()
    except httpx.HTTPError:
        raise HTTPException(502, "Supabase is unreachable.")
