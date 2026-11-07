"""Current-stage education through the existing, metered backend Nebius client."""

from typing import Annotated, Literal
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from . import ai

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=3000)]
Term = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Definition = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]


class StageText(BaseModel):
    model_config = ConfigDict(extra="forbid")
    see: Text
    how: Text
    why: Text
    terms: list[tuple[Term, Definition]] = Field(min_length=1, max_length=6)


class StageExplanationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scene: Literal["rubin", "thor", "microduck"]
    stage_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")
    stage_title: Term
    system_name: Term
    scope_note: Text
    explanation: StageText
    facts: list[tuple[Term, Definition]] = Field(max_length=12)
    sources: list[Annotated[str, StringConstraints(max_length=512)]] = Field(max_length=8)


async def explain_stage(request: StageExplanationRequest):
    result = await ai.infer(
        "stage",
        request.model_dump(mode="json"),
        model_id=ai.STAGE_MODEL,
        validator=lambda data: StageText.model_validate(data).model_dump(mode="json"),
    )
    evidence = result.get("evidence")
    if not evidence or evidence.get("model") != ai.STAGE_MODEL:
        raise HTTPException(502, "The stage response has no verified model evidence. Use the built-in fallback explanation.")
    return {
        "source": "cached" if result["cached"] else "live",
        "data": result["data"],
        "evidence": evidence,
        "attribution": "NVIDIA Nemotron 3 Super · served via Nebius Token Factory",
    }
