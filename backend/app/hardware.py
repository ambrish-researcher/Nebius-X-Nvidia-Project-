from .models import ProjectRequest

# Specifications intentionally limited to documented module capacities/power envelopes.
# No TOPS-to-latency conversion or synthetic GPU benchmark is used.
HARDWARE = [
    dict(
        id="mcu",
        name="Microcontroller",
        family="Embedded control",
        category="microcontroller",
        memory_gb=0.001,
        power_w=1,
        availability="Generic category; board dependent",
        software="Firmware / RTOS",
        source="https://developer.nvidia.com/embedded/learn",
        verified=False,
        note="Illustrative 1 MB / 1 W design envelope, not a product specification.",
    ),
    dict(
        id="cpu",
        name="CPU-only computer",
        family="General-purpose",
        category="cpu",
        memory_gb=8,
        power_w=15,
        availability="Generic category; board dependent",
        software="Linux / Python / ROS 2",
        source="https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/",
        verified=False,
        note="Illustrative 8 GB / 15 W design envelope; performance must be benchmarked.",
    ),
    dict(
        id="orin-nano",
        name="Jetson Orin Nano 8GB",
        family="Ampere · edge AI",
        category="edge",
        memory_gb=8,
        power_w=15,
        availability="Published product; stock not checked",
        software="JetPack / CUDA / TensorRT",
        source="https://developer.nvidia.com/embedded/jetson-orin-nano-developer-kit",
        verified=False,
        note="8 GB memory; 15 W is an operating mode, not measured application draw. Confirm module and JetPack version.",
    ),
    dict(
        id="agx-orin",
        name="Jetson AGX Orin 64GB",
        family="Ampere · edge AI",
        category="edge",
        memory_gb=64,
        power_w=60,
        availability="Published product; stock not checked",
        software="JetPack / CUDA / TensorRT",
        source="https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/",
        verified=False,
        note="64 GB memory; configurable module power envelope up to 60 W. No task latency measurement.",
    ),
    dict(
        id="h100",
        name="NVIDIA H100 SXM",
        family="Hopper · data center",
        category="cloud",
        memory_gb=80,
        power_w=700,
        availability="Published product; provider access not checked",
        software="CUDA / TensorRT / Linux",
        source="https://www.nvidia.com/en-us/data-center/h100/",
        verified=False,
        note="80 GB device memory; SXM GPU power up to 700 W, excludes host/rack power. Cloud only for this robot.",
    ),
]


def recommend(req: ProjectRequest):
    robot, task = req.robot, req.task
    sensors = [c for c in robot.components if c.kind == "sensor"]
    issues = []
    if task.needs_manipulation and not any(
        "grip" in (c.name + " " + c.id).lower() for c in robot.components
    ):
        issues.append(
            "Manipulation requires a gripper or suitable end effector; add one and re-evaluate payload and stability."
        )
    if task.needs_vision and not any(
        "camera" in (c.name + " " + c.id).lower() or "vision" in c.name.lower()
        for c in sensors
    ):
        issues.append("Vision requires a camera and calibrated perception pipeline.")
    if task.outdoor and "outdoor" not in robot.operating_environment.lower():
        issues.append(
            "Outdoor operation is not established for this design; validate sealing, traction, terrain, and safety."
        )
    candidates = []
    for h in HARDWARE:
        reasons = []
        if h["memory_gb"] < task.memory_gb:
            reasons.append("Requested model and runtime memory exceed capacity.")
        if h["category"] != "cloud" and h["power_w"] > robot.power_budget_w:
            reasons.append("Compute power envelope exceeds the robot compute budget.")
        if task.needs_vision and h["category"] == "microcontroller":
            reasons.append(
                "This control-class envelope does not support the requested vision workload."
            )
        if h["category"] == "cloud" and not task.network_available:
            reasons.append(
                "Cloud operation requires network availability and a separate local safety controller."
            )
        candidates.append(
            dict(
                **h,
                compatible=not reasons,
                reasons=reasons,
                latency="Unmeasured. Benchmark the selected model, precision, input size, and target runtime.",
                deadline_ms=task.deadline_ms,
                deadline_verified=False,
                cost="No live quote. Compare board, cooling, integration, and recurring cloud costs.",
            )
        )
    preferred = (
        "orin-nano"
        if task.needs_vision
        else ("mcu" if task.memory_gb <= 0.001 else "cpu")
    )
    viable = [c for c in candidates if c["compatible"]]
    chosen = next((c for c in viable if c["id"] == preferred), next(iter(viable), None))
    return dict(
        recommended_id=chosen["id"] if chosen else None,
        candidates=candidates,
        feasibility_issues=issues,
        reasoning=(
            "Vision makes a local AI accelerator a candidate; this is a suitability heuristic, not a latency result."
            if task.needs_vision
            else "Control and non-visual planning can use a CPU or microcontroller. A GPU is not assumed necessary."
        ),
        assumptions=[
            "Memory requirement is user supplied and must include model, activations, and runtime.",
            "Power envelopes are not measured consumption.",
            "No price, FPS, inference latency, or GPU speedup was measured.",
        ],
        simulation_scope="MuJoCo rigid-body flat-floor drive only; hardware selection does not change physics or invent inference delay.",
    )
