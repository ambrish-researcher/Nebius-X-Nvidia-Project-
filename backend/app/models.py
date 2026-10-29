from typing import Literal
from uuid import uuid4
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


Vec3 = tuple[float, float, float]


class Appearance(StrictModel):
    color: str = Field(default="#a0a7a0", pattern=r"^#[0-9a-fA-F]{6}$")
    material: str = Field(default="Unspecified conceptual material", max_length=200)
    metalness: float = Field(default=0.6, ge=0, le=1)
    roughness: float = Field(default=0.35, ge=0, le=1)


class Component(StrictModel):
    appearance: Appearance | None = None
    id: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,47}$")
    name: str = Field(min_length=1, max_length=100)
    kind: Literal["structure", "actuator", "sensor", "power", "compute", "controller"]
    shape: Literal["box", "cylinder", "sphere"]
    size: Vec3
    position: Vec3
    rotation: Vec3 = (0, 0, 0)
    mass_kg: float = Field(gt=0, le=1000)
    depends_on: list[str] = Field(default_factory=list, max_length=10)
    function: str = Field(max_length=2000)
    selection_reason: str = Field(max_length=2000)
    alternatives: list[str] = Field(default_factory=list, max_length=6)
    limitations: list[str] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def finite_geometry(self):
        import math

        if any(
            not math.isfinite(x)
            for v in (self.size, self.position, self.rotation)
            for x in v
        ):
            raise ValueError("Geometry must be finite")
        if any(x <= 0 or x > 10 for x in self.size) or any(
            abs(x) > 15 for x in self.position
        ):
            raise ValueError("Geometry exceeds the supported 30 m conceptual workspace")
        if self.shape == "cylinder" and abs(self.size[0] - self.size[2]) > 1e-5:
            raise ValueError("Cylinder X/Z diameters must agree")
        if self.shape == "sphere" and max(self.size) - min(self.size) > 1e-5:
            raise ValueError("Sphere diameters must agree")
        return self


class Joint(StrictModel):
    parent_component_id: str | None = None
    continuous: bool = True
    force_limit_nm: float = Field(default=2, gt=0, le=100)
    velocity_limit_rad_s: float = Field(default=8, gt=0, le=8)
    id: str
    component_id: str
    type: Literal["fixed", "hinge", "slide"]
    axis: Vec3 = (0, 1, 0)
    limits_rad: tuple[float, float] = (-3.14, 3.14)

    @model_validator(mode="after")
    def valid_axis_and_limits(self):
        import math

        if any(not math.isfinite(x) for x in (*self.axis, *self.limits_rad)):
            raise ValueError("Joint parameters must be finite")
        if (
            sum(x * x for x in self.axis) < 1e-10
            or self.limits_rad[0] >= self.limits_rad[1]
        ):
            raise ValueError("Joint requires a nonzero axis and ordered limits")
        return self


class RobotSpecification(StrictModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=1, max_length=100)
    purpose: str = Field(max_length=2000)
    classification: Literal[
        "rover",
        "arm",
        "legged",
        "mobile_manipulator",
        "aerial",
        "underwater",
        "conceptual",
    ]
    provenance: Literal["reference", "nebius"]
    dimensions_m: Vec3
    components: list[Component] = Field(min_length=1, max_length=64)
    joints: list[Joint] = Field(default_factory=list, max_length=32)
    degrees_of_freedom: int = Field(ge=0, le=64)
    power_budget_w: float = Field(gt=0, le=100000)
    control_requirements: list[str]
    operating_environment: str
    intended_tasks: list[str]
    constraints: list[str]
    simulation_capabilities: list[str]
    unsupported_assumptions: list[str]
    capabilities: list[str] = Field(default_factory=list, max_length=12)
    mobility: str = Field(default="Not specified", max_length=1000)
    control_architecture: str = Field(default="Not specified", max_length=1000)
    engineering_reasoning: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def validate_graph(self):
        ids = [c.id for c in self.components]
        if len(ids) != len(set(ids)):
            raise ValueError("Component IDs must be unique")
        resolved = set()
        remaining = {c.id: set(c.depends_on) for c in self.components}
        if any(not deps.issubset(set(ids)) for deps in remaining.values()):
            raise ValueError("Unknown component dependency")
        while remaining:
            ready = {k for k, v in remaining.items() if v <= resolved}
            if not ready:
                raise ValueError("Cyclic assembly dependencies")
            resolved |= ready
            remaining = {k: v for k, v in remaining.items() if k not in ready}
        if any(j.component_id not in ids for j in self.joints):
            raise ValueError("Joint references an unknown component")
        if len({j.id for j in self.joints}) != len(self.joints):
            raise ValueError("Joint IDs must be unique")
        if len({j.component_id for j in self.joints}) != len(self.joints):
            raise ValueError(
                "Use one joint per link; represent additional axes with separate links"
            )
        if any(
            j.parent_component_id
            and (
                j.parent_component_id not in ids
                or j.parent_component_id == j.component_id
            )
            for j in self.joints
        ):
            raise ValueError("Invalid joint parent")
        for joint in self.joints:
            child = next(c for c in self.components if c.id == joint.component_id)
            if (
                joint.parent_component_id
                and joint.parent_component_id not in child.depends_on
            ):
                raise ValueError(
                    "Joint parent must agree with the component mounting graph"
                )
        if self.degrees_of_freedom != sum(j.type != "fixed" for j in self.joints):
            raise ValueError("Degrees of freedom must match movable joints")
        import math

        if any(not math.isfinite(d) or d <= 0 or d > 30 for d in self.dimensions_m):
            raise ValueError("Invalid physical dimensions")
        return self


class RobotTask(StrictModel):
    description: str = Field(min_length=3, max_length=4000)
    needs_vision: bool = False
    needs_manipulation: bool = False
    outdoor: bool = False
    memory_gb: float = Field(default=1, gt=0, le=10000)
    deadline_ms: float = Field(default=100, gt=0, le=100000)
    model: str = "Not specified"
    network_available: bool = False


class ProjectRequest(StrictModel):
    robot: RobotSpecification
    task: RobotTask


class GenerationRequest(StrictModel):
    prompt: str = Field(min_length=8, max_length=6000)
    request_id: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{8,80}$")
    retry_failed: bool = False


class AIRequest(StrictModel):
    workflow: Literal[
        "tutor", "task", "analysis", "recommendation", "quiz", "flashcards"
    ]
    robot: RobotSpecification
    prompt: str = Field(min_length=3, max_length=6000)
    level: Literal["beginner", "intermediate", "advanced"] = "intermediate"


class SimulationRequest(ProjectRequest):
    wheel_speed_rad_s: float = Field(default=4, ge=0, le=8)
    duration_s: float = Field(default=6, ge=1, le=12)
    hardware_id: str = "cpu"


class QuizAttempt(StrictModel):
    question: str
    selected_index: int
    correct: bool


class FlashcardProgress(StrictModel):
    card_id: str
    mastered: bool


class ControllerSettings(StrictModel):
    wheel_speed_rad_s: float = Field(default=4, ge=0, le=8)


class DesignChange(StrictModel):
    id: str
    component_id: str
    before_kg: float = Field(gt=0, le=1000)
    after_kg: float = Field(gt=0, le=1000)
    at: str


class RobotProject(StrictModel):
    inspected_components: list[str] = Field(default_factory=list, max_length=64)
    controller_settings: ControllerSettings = Field(default_factory=ControllerSettings)
    design_changes: list[DesignChange] = Field(default_factory=list, max_length=100)
    id: str
    robot: RobotSpecification
    task: RobotTask
    hardware_id: str
    simulation_runs: list[dict] = Field(default_factory=list, max_length=30)
    quiz_attempts: list[QuizAttempt] = Field(default_factory=list, max_length=300)
    flashcard_progress: list[FlashcardProgress] = Field(
        default_factory=list, max_length=300
    )
