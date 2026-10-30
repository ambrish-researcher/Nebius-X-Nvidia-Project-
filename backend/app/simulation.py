import math
import re
import time
from uuid import uuid4
from xml.etree.ElementTree import Element, SubElement, tostring
import mujoco
import numpy as np
from .models import SimulationRequest


def build_model(robot):
    """Map Three.js (x,y-up,z) into MuJoCo (x,y,z-up), preserving the spec dimensions/masses."""
    wheels = [c for c in robot.components if c.kind == "actuator"]
    chassis = next(
        (c for c in robot.components if c.id == "chassis" and c.shape == "box"), None
    )
    if robot.classification != "rover" or chassis is None or len(wheels) != 4:
        raise ValueError(
            "Only a four-wheel box-chassis rover is supported by the flat-floor adapter."
        )
    joints = {j.component_id: j for j in robot.joints if j.type == "hinge"}
    if any(
        c.shape != "cylinder"
        or c.id not in joints
        or abs(c.rotation[0] - math.pi / 2) > 0.03
        or abs(c.rotation[1]) + abs(c.rotation[2]) > 0.03
        for c in wheels
    ):
        raise ValueError(
            "Drive adapter requires four cylindrical wheels with lateral hinge axes."
        )
    if len(robot.joints) != 4 or any(
        abs(j.axis[1] - 1) > 0.01 or abs(j.axis[0]) + abs(j.axis[2]) > 0.01
        for j in joints.values()
    ):
        raise ValueError(
            "Drive adapter requires exactly four wheel hinges about their local cylinder axes."
        )
    if not any(c.position[2] < 0 for c in wheels) or not any(
        c.position[2] > 0 for c in wheels
    ):
        raise ValueError("Wheels must be mounted on both sides of the chassis.")
    if any(
        j.parent_component_id and j.parent_component_id != chassis.id
        for j in joints.values()
    ):
        raise ValueError("Wheel hinges must attach to the chassis for this controller.")
    if any(
        set(c.depends_on) & {w.id for w in wheels}
        for c in robot.components
        if c not in wheels
    ):
        raise ValueError(
            "Components mounted on moving wheels need an articulated adapter."
        )
    root = Element("mujoco", model="specification-derived-rover")
    SubElement(root, "compiler", angle="radian")
    SubElement(
        root, "option", timestep="0.002", gravity="0 0 -9.81", integrator="implicitfast"
    )
    default = SubElement(root, "default")
    SubElement(default, "geom", friction="1.0 0.005 0.0001", solref="0.01 1")
    world = SubElement(root, "worldbody")
    SubElement(world, "geom", name="floor", type="plane", size="30 30 .1")
    body = SubElement(world, "body", name="robot", pos="0 0 0.03")
    SubElement(body, "freejoint", name="root")
    actuator = SubElement(root, "actuator")

    def vec(v):
        return " ".join(str(float(x)) for x in v)

    for c in robot.components:
        x, y, z = c.position
        w, h, d = c.size
        if c in wheels:
            child = SubElement(body, "body", name=c.id, pos=vec((x, z, y)))
            SubElement(
                child,
                "joint",
                name=c.id,
                type="hinge",
                axis="0 1 0",
                damping=".02",
                limited="false" if joints[c.id].continuous else "true",
                range=vec(joints[c.id].limits_rad),
            )
            SubElement(
                child,
                "geom",
                type="cylinder",
                size=vec((w / 2, h / 2)),
                euler=f"{math.pi / 2} 0 0",
                mass=str(c.mass_kg),
            )
            SubElement(
                actuator,
                "velocity",
                name=c.id,
                joint=c.id,
                kv="1.5",
                ctrlrange=vec(
                    (
                        -joints[c.id].velocity_limit_rad_s,
                        joints[c.id].velocity_limit_rad_s,
                    )
                ),
                forcerange=vec(
                    (-joints[c.id].force_limit_nm, joints[c.id].force_limit_nm)
                ),
            )
        else:
            # Non-wheel parts remain fixed, preserving masses and local positions.
            size = {
                "box": (w / 2, d / 2, h / 2),
                "sphere": (w / 2,),
                "cylinder": (w / 2, h / 2),
            }[c.shape]
            attrs = dict(
                name=c.id,
                type=c.shape,
                size=vec(size),
                pos=vec((x, z, y)),
                mass=str(c.mass_kg),
                quat=vec(rotation_quat(c.rotation)),
            )
            if c.shape == "sphere" and max(c.size) - min(c.size) > 0.01:
                raise ValueError(
                    "Physics adapter requires spherical components to have equal dimensions."
                )
            SubElement(body, "geom", **attrs)
    return mujoco.MjModel.from_xml_string(tostring(root, encoding="unicode"))



def supported_drive_task(task):
    """Recognize bounded straight-line rover missions; never claim general autonomy."""
    if task.needs_vision or task.needs_manipulation or task.outdoor:
        return None
    description = task.description.strip().lower().rstrip(".!")
    match = re.fullmatch(
        r"(?:drive|move|travel|go) (forward|backward|backwards|in reverse)(?: (?:for|by))? ([0-9]+(?:[.][0-9]+)?) (meters?|metres?|m)",
        description,
    )
    if match:
        return float(match.group(2)) * (-1 if match.group(1) != "forward" else 1)
    if description in ("drive forward", "move forward", "go forward", "travel forward"):
        return 0.1
    if description in ("drive backward", "move backward", "go backward", "travel backward", "drive backwards", "move backwards", "go backwards", "travel backwards", "drive in reverse", "move in reverse", "go in reverse"):
        return -0.1
    return None


def simulate(req: SimulationRequest):
    model = build_model(req.robot)
    data = mujoco.MjData(model)
    # Signed straight-line velocity control is a physics experiment, not an arbitrary task solver.
    frames = []
    started = time.perf_counter()
    contacts = 0
    max_tilt = 0.0
    steps = int(req.duration_s / model.opt.timestep)
    # Preserve specification order even when component and joint lists differ.
    qpos_addresses = [
        int(
            model.jnt_qposadr[
                mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, j.component_id)
            ]
        )
        for j in req.robot.joints
    ]
    actuator_addresses = [
        mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, j.component_id)
        for j in req.robot.joints
    ]
    def record_frame():
        # Positions use the frontend's Y-up convention. Quaternions remain
        # MuJoCo WXYZ/Z-up and are explicitly converted by the renderer.
        return dict(
            t=round(float(data.time), 4),
            position=[float(data.qpos[0]), float(data.qpos[2]), float(data.qpos[1])],
            quaternion=data.qpos[3:7].tolist(),
            joints=data.qpos[qpos_addresses].tolist(),
            velocity=data.qvel[:3].tolist(),
            controller_output=data.actuator_force[actuator_addresses].tolist(),
            contacts=int(data.ncon),
        )

    mujoco.mj_forward(model, data)
    frames.append(record_frame())
    required_distance = supported_drive_task(req.task)
    direction = -1 if required_distance is not None and required_distance < 0 else 1
    for i in range(steps):
        data.ctrl[:] = direction * np.minimum(
            model.actuator_ctrlrange[:, 1],
            min(req.wheel_speed_rad_s, i * model.opt.timestep * 4.0),
        )
        mujoco.mj_step(model, data)
        if not np.isfinite(data.qpos).all() or not np.isfinite(data.qvel).all():
            raise ValueError("Unstable physics configuration; simulation terminated.")
        contacts = max(contacts, data.ncon)
        tilt = 2 * math.acos(min(1.0, abs(float(data.qpos[3]))))
        max_tilt = max(max_tilt, tilt)
        if (i + 1) % 20 == 0 or i == steps - 1:
            # Frames carry actual measured joint states and actuator outputs.
            frames.append(record_frame())
    displacement = float(np.linalg.norm(data.qpos[:2]))
    # Signed distance is measured along the world X axis, not total travel.
    forward_distance = float(data.qpos[0] - frames[0]["position"][0])
    task_completed = (direction * forward_distance >= abs(required_distance) and max_tilt < 0.5) if required_distance is not None else None
    wall = time.perf_counter() - started
    return dict(
        id=str(uuid4()),
        robot_id=req.robot.id,
        engine=f"MuJoCo {mujoco.__version__}",
        experiment="flat-floor-drive",
        frames=frames,
        hardware_id=req.hardware_id,
        hardware_benchmarked=False,
        execution=dict(
            location="backend", processor="cpu", gpu_accelerated=False,
            timestep_s=float(model.opt.timestep), status="succeeded",
            position_coordinates="Y-up XYZ meters",
            quaternion_coordinates="MuJoCo Z-up WXYZ; convert basis for display",
        ),
        parameters=dict(
            wheel_speed_rad_s=req.wheel_speed_rad_s,
            drive_direction="reverse" if direction < 0 else "forward",
            design_mass_kg=sum(c.mass_kg for c in req.robot.components),
        ),
        metrics=dict(
            simulated_seconds=float(data.time),
            wall_seconds=wall,
            displacement_m=displacement,
            forward_distance_m=forward_distance,
            max_contact_count=contacts,
            max_tilt_rad=max_tilt,
            steps=steps,
        ),
        outcome="Drive experiment completed"
        if displacement > 0.1 and max_tilt < 0.5
        else "Drive experiment completed with limited motion or instability",
        task_completed=task_completed,
        limitations=[
            "Only simple straight-line forward/reverse tasks are evaluated; other assigned missions are not executed or scored."
            if required_distance is None else
            "Straight-line drive success is measured from signed MuJoCo displacement and tilt; no navigation or perception is involved.",
            "Contact counts include expected wheel-floor contacts, not obstacle collision events.",
            "No camera, LiDAR, or AI inference is simulated.",
            "Selected hardware does not alter physics or imply measured compute performance.",
        ],
    )


def rotation_quat(rotation):
    x, y, z = rotation
    cx, sx, cy, sy, cz, sz = (
        math.cos(x),
        math.sin(x),
        math.cos(y),
        math.sin(y),
        math.cos(z),
        math.sin(z),
    )
    rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    swap = np.array([[1, 0, 0], [0, 0, 1], [0, 1, 0]])
    quat = np.zeros(4)
    mujoco.mju_mat2Quat(quat, (swap @ rx @ ry @ rz @ swap).flatten())
    return quat


def assess(robot):
    """Compilation is separate from executing even one solver step."""
    try:
        model = build_model(robot)
        return dict(
            concept_valid=True,
            physics_valid=True,
            adapter="flat-floor-drive",
            model_dofs=int(model.nv),
            simulation_executed=False,
            limitations=[
                "Compiled MuJoCo model only; no experiment has run.",
                "Forward wheel control only; no obstacle avoidance, perception, or mission solver.",
            ],
        )
    except ValueError as exc:
        return dict(
            concept_valid=True,
            physics_valid=False,
            adapter=None,
            model_dofs=None,
            simulation_executed=False,
            limitations=[str(exc)],
        )
