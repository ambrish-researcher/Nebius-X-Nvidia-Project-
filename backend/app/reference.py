from .models import RobotSpecification


def component(
    id, name, kind, shape, size, position, deps, function, mass=1, rotation=(0, 0, 0)
):
    return dict(
        id=id,
        name=name,
        kind=kind,
        shape=shape,
        size=size,
        position=position,
        rotation=rotation,
        mass_kg=mass,
        depends_on=deps,
        function=function,
        selection_reason="Reference teaching configuration; dimensions and mass are illustrative design inputs.",
        alternatives=[
            "Select a rated commercial component after load and safety analysis."
        ],
        limitations=["Conceptual geometry, not a manufacturing drawing."],
    )


def reference_robot(family="rover"):
    if family == "arm":
        parts = [
            component(
                "base",
                "Anchored base",
                "structure",
                "cylinder",
                (0.65, 0.18, 0.65),
                (0, 0.09, 0),
                [],
                "Transfers reaction forces to a rigid bench.",
                4,
            ),
            component(
                "shoulder",
                "Shoulder servo",
                "actuator",
                "cylinder",
                (0.28, 0.35, 0.28),
                (0, 0.32, 0),
                ["base"],
                "Rotates the upper link about the shoulder.",
                1.2,
            ),
            component(
                "upper-link",
                "Upper link",
                "structure",
                "box",
                (0.18, 0.8, 0.2),
                (0, 0.78, 0),
                ["shoulder"],
                "Connects the shoulder and elbow.",
                1.5,
            ),
            component(
                "elbow",
                "Elbow servo",
                "actuator",
                "sphere",
                (0.26, 0.26, 0.26),
                (0, 1.23, 0),
                ["upper-link"],
                "Changes reach by rotating the forearm.",
            ),
            component(
                "forearm",
                "Forearm link",
                "structure",
                "box",
                (0.65, 0.16, 0.16),
                (0.3, 1.25, 0),
                ["elbow"],
                "Supports the end effector.",
                0.8,
            ),
            component(
                "gripper",
                "Parallel gripper",
                "actuator",
                "box",
                (0.18, 0.3, 0.26),
                (0.7, 1.2, 0),
                ["forearm"],
                "Applies opposing contact forces to an object.",
                0.4,
            ),
            component(
                "camera",
                "Wrist camera",
                "sensor",
                "box",
                (0.12, 0.1, 0.16),
                (0.62, 1.4, 0),
                ["forearm"],
                "Observes the workpiece for visual alignment.",
                0.1,
            ),
            component(
                "controller",
                "Motion controller",
                "controller",
                "box",
                (0.25, 0.1, 0.25),
                (0.1, 0.22, 0.2),
                ["base"],
                "Coordinates joint position loops.",
                0.3,
            ),
            component(
                "power",
                "24 V supply",
                "power",
                "box",
                (0.2, 0.15, 0.2),
                (-0.2, 0.25, 0),
                ["base"],
                "Provides regulated electrical power.",
                0.8,
            ),
            component(
                "compute",
                "Compute module",
                "compute",
                "box",
                (0.2, 0.06, 0.16),
                (0.1, 0.31, 0.2),
                ["controller"],
                "Runs the task planner and optional perception.",
                0.2,
            ),
        ]
        joints = [
            dict(id=f"{id}-joint", component_id=id, type="hinge")
            for id in ("shoulder", "elbow", "gripper")
        ]
        return RobotSpecification(
            name="Articulated teaching arm",
            purpose="Explore serial kinematics and component relationships.",
            classification="arm",
            provenance="reference",
            dimensions_m=(1.1, 1.6, 0.7),
            components=parts,
            joints=joints,
            degrees_of_freedom=3,
            power_budget_w=80,
            control_requirements=["Joint position control", "Emergency stop"],
            operating_environment="Indoor, rigid bench",
            intended_tasks=["Explain pick-and-place mechanics"],
            constraints=["No rated payload or torque analysis"],
            simulation_capabilities=[],
            unsupported_assumptions=[
                "Arm dynamics and contact simulation are not implemented."
            ],
        )
    parts = [
        component(
            "chassis",
            "Titanium concept chassis",
            "structure",
            "box",
            (0.9, 0.18, 0.6),
            (0, 0.36, 0),
            [],
            "Carries the payload and provides the mounting datum.",
            4,
        )
    ]
    for side, z in [("left", -0.37), ("right", 0.37)]:
        for end, x in [("front", 0.32), ("rear", -0.32)]:
            parts.append(
                component(
                    f"{side}-{end}-wheel",
                    f"{side.title()} {end} drive",
                    "actuator",
                    "cylinder",
                    (0.28, 0.12, 0.28),
                    (x, 0.17, z),
                    ["chassis"],
                    "Converts motor torque into traction. The MuJoCo model uses a velocity controller.",
                    0.35,
                    (1.5708, 0, 0),
                )
            )
    parts.extend(
        [
            component(
                "battery",
                "24 V battery pack",
                "power",
                "box",
                (0.42, 0.12, 0.3),
                (-0.1, 0.53, 0),
                ["chassis"],
                "Stores energy; usable runtime depends on measured average draw.",
                1.8,
            ),
            component(
                "controller",
                "Motor controller",
                "controller",
                "box",
                (0.22, 0.07, 0.18),
                (0.22, 0.5, 0.12),
                ["chassis"],
                "Closes wheel velocity loops and bounds commanded torque.",
                0.15,
            ),
            component(
                "compute",
                "Edge compute module",
                "compute",
                "box",
                (0.25, 0.07, 0.22),
                (0.05, 0.65, 0),
                ["battery", "controller"],
                "Processes sensor streams and plans robot actions.",
                0.2,
            ),
            component(
                "mast",
                "Sensor mast",
                "structure",
                "cylinder",
                (0.06, 0.35, 0.06),
                (0.25, 0.67, 0),
                ["chassis"],
                "Raises the sensor above the chassis.",
                0.15,
            ),
            component(
                "lidar",
                "Planar LiDAR",
                "sensor",
                "cylinder",
                (0.18, 0.1, 0.18),
                (0.25, 0.91, 0),
                ["mast"],
                "Measures ranges for mapping; not simulated in the current physics experiment.",
                0.2,
            ),
            component(
                "camera",
                "Stereo vision module",
                "sensor",
                "box",
                (0.15, 0.09, 0.29),
                (0.46, 0.58, 0),
                ["chassis"],
                "Supplies images for perception; no image inference benchmark is available.",
                0.1,
            ),
        ]
    )
    return RobotSpecification(
        name="Autonomous research rover",
        purpose="Explore mobile robotics, edge perception, and compute trade-offs.",
        classification="rover",
        provenance="reference",
        dimensions_m=(1.18, 1.02, 0.88),
        components=parts,
        joints=[
            dict(id=c["id"] + "-joint", component_id=c["id"], type="hinge")
            for c in parts
            if c["kind"] == "actuator"
        ],
        degrees_of_freedom=4,
        power_budget_w=60,
        control_requirements=[
            "Wheel velocity control",
            "Differential steering",
            "Independent emergency stop",
        ],
        operating_environment="Indoor, flat dry floor",
        intended_tasks=["Navigate a warehouse aisle"],
        constraints=[
            "Illustrative masses and friction",
            "No safety certification",
            "Compute power budget is 60 W; actuator power is separate",
        ],
        simulation_capabilities=["flat-floor-drive"],
        unsupported_assumptions=[
            "Sensor perception is not simulated.",
            "No measured inference latency for selected hardware.",
            "Task completion is not established by a straight-drive experiment.",
        ],
    )


def assembly_steps(robot):
    resolved = set()
    steps = []
    while len(resolved) < len(robot.components):
        ready = [
            c
            for c in robot.components
            if c.id not in resolved and set(c.depends_on) <= resolved
        ]
        steps.append(
            dict(
                index=len(steps),
                name=" → ".join(c.name for c in ready),
                component_ids=[c.id for c in ready],
            )
        )
        resolved.update(c.id for c in ready)
    return steps
