import math
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
                child, "joint", name=c.id, type="hinge", axis="0 1 0", damping=".02"
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
                ctrlrange="-8 8",
                forcerange="-2 2",
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
            )
            if c.shape == "sphere" and max(c.size) - min(c.size) > 0.01:
                raise ValueError(
                    "Physics adapter requires spherical components to have equal dimensions."
                )
            SubElement(body, "geom", **attrs)
    return mujoco.MjModel.from_xml_string(tostring(root, encoding="unicode"))


def simulate(req: SimulationRequest):
    model = build_model(req.robot)
    data = mujoco.MjData(model)
    # A fixed forward velocity setpoint is a controlled physics experiment, not an arbitrary task solver.
    frames = []
    started = time.perf_counter()
    contacts = 0
    max_tilt = 0.0
    steps = int(req.duration_s / model.opt.timestep)
    for i in range(steps):
        data.ctrl[:] = min(4.0, i * model.opt.timestep * 4.0)
        mujoco.mj_step(model, data)
        if not np.isfinite(data.qpos).all() or not np.isfinite(data.qvel).all():
            raise ValueError("Unstable physics configuration; simulation terminated.")
        contacts = max(contacts, data.ncon)
        tilt = 2 * math.acos(min(1.0, abs(float(data.qpos[3]))))
        max_tilt = max(max_tilt, tilt)
        if i % 20 == 0 or i == steps - 1:
            # Frames carry actual measured joint states and actuator outputs.
            frames.append(
                dict(
                    t=round(float(data.time), 4),
                    position=[
                        float(data.qpos[0]),
                        float(data.qpos[2]),
                        float(data.qpos[1]),
                    ],
                    quaternion=[
                        float(data.qpos[3]),
                        float(data.qpos[4]),
                        float(data.qpos[5]),
                        float(data.qpos[6]),
                    ],
                    joints=data.qpos[7:].tolist(),
                    velocity=data.qvel[:3].tolist(),
                    controller_output=data.actuator_force.tolist(),
                    contacts=int(data.ncon),
                )
            )
    displacement = float(np.linalg.norm(data.qpos[:2]))
    wall = time.perf_counter() - started
    return dict(
        id=str(uuid4()),
        robot_id=req.robot.id,
        engine=f"MuJoCo {mujoco.__version__}",
        experiment="flat-floor-drive",
        frames=frames,
        hardware_id=req.hardware_id,
        hardware_benchmarked=False,
        metrics=dict(
            simulated_seconds=float(data.time),
            wall_seconds=wall,
            displacement_m=displacement,
            max_contact_count=contacts,
            max_tilt_rad=max_tilt,
            steps=steps,
        ),
        outcome="Drive experiment completed"
        if displacement > 0.1 and max_tilt < 0.5
        else "Drive experiment completed with limited motion or instability",
        task_completed=None,
        limitations=[
            "Assigned task is not executed by this adapter.",
            "Contact counts include expected wheel-floor contacts, not obstacle collision events.",
            "No camera, LiDAR, or AI inference is simulated.",
            "Selected hardware does not alter physics or imply measured compute performance.",
        ],
    )
