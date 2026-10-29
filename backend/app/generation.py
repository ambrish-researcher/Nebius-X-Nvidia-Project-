"""Compact provider contract; expand only validated model output, never select a preset."""

from uuid import uuid4
from pydantic import Field, model_validator
from typing import Literal
from .models import StrictModel, Vec3, RobotSpecification, Joint


class DesignPart(StrictModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,47}$")
    name: str = Field(min_length=1, max_length=100)
    kind: Literal["structure", "actuator", "sensor", "power", "compute", "controller"]
    shape: Literal["box", "cylinder", "sphere"]
    size: Vec3 = Field(
        description="Full dimensions [X length, Y HEIGHT, Z width]. Cylinder local axis is Y; size is diameter,height,diameter."
    )
    at: Vec3 = Field(
        description="Y-UP world position [forward X, HEIGHT ABOVE FLOOR Y, left/right Z]. Never use Z as height."
    )
    mass_kg: float = Field(gt=0, le=1000)
    parent: str | None = None
    rotation: Vec3 = (0, 0, 0)
    role: str = Field(default="", max_length=1000)
    color: str = Field(default="#a0a7a0", pattern=r"^#[0-9a-fA-F]{6}$")
    material: str = Field(default="Unspecified conceptual material", max_length=200)


class Design(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    purpose: str = Field(min_length=3, max_length=1500)
    classification: Literal[
        "rover",
        "arm",
        "legged",
        "mobile_manipulator",
        "aerial",
        "underwater",
        "conceptual",
    ]
    coordinate_system: Literal["Y_UP"]
    dimensions_m: Vec3 = Field(
        description="Full envelope [X length,Y HEIGHT,Z width] in meters."
    )
    parts: list[DesignPart] = Field(min_length=1, max_length=64)
    joints: list[Joint] = Field(default_factory=list, max_length=32)
    capabilities: list[str] = Field(default_factory=list, max_length=12)
    mobility: str = Field(default="Not specified by the model", max_length=1000)
    control: str = Field(default="Not specified by the model", max_length=1000)
    reasoning: str = Field(min_length=20, max_length=2000)
    constraints: list[str] = Field(default_factory=list, max_length=12)
    limitations: list[str] = Field(min_length=1, max_length=12)
    power_budget_w: float = Field(default=30, gt=0, le=100000)

    def expand(self):
        return RobotSpecification.model_validate(
            dict(
                id=str(uuid4()),
                name=self.name,
                purpose=self.purpose,
                classification=self.classification,
                provenance="nebius",
                dimensions_m=self.dimensions_m,
                components=[
                    dict(
                        id=p.id,
                        name=p.name,
                        kind=p.kind,
                        shape=p.shape,
                        size=p.size,
                        position=p.at,
                        rotation=p.rotation,
                        mass_kg=p.mass_kg,
                        depends_on=[p.parent] if p.parent else [],
                        function=p.role
                        or "No component-specific role supplied by the model.",
                        selection_reason="Part of the generated conceptual design; physical ratings are not verified.",
                        appearance=dict(color=p.color, material=p.material),
                    )
                    for p in self.parts
                ],
                joints=[j.model_dump() for j in self.joints],
                degrees_of_freedom=sum(j.type != "fixed" for j in self.joints),
                power_budget_w=self.power_budget_w,
                control_requirements=[self.control],
                operating_environment="User-described environment; not physically validated",
                intended_tasks=self.capabilities or [self.purpose],
                constraints=self.constraints,
                simulation_capabilities=[],
                unsupported_assumptions=self.limitations,
                capabilities=self.capabilities,
                mobility=self.mobility,
                control_architecture=self.control,
                engineering_reasoning=self.reasoning,
            )
        )


def validate_design(data):
    if "parts" in data:
        robot = Design.model_validate(data).expand()
    else:
        robot = RobotSpecification.model_validate({**data, "provenance": "nebius"})
    return robot.model_dump(mode="json")
