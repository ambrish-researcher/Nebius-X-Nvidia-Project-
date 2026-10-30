"""Task parser regression tests: never infer unsupported autonomous behavior."""
from types import SimpleNamespace

from app.simulation import supported_drive_task


def task(description, **flags):
    return SimpleNamespace(
        description=description,
        needs_vision=flags.get("needs_vision", False),
        needs_manipulation=flags.get("needs_manipulation", False),
        outdoor=flags.get("outdoor", False),
    )


def test_forward_distance():
    assert supported_drive_task(task("drive forward 2 meters")) == 2.0
    assert supported_drive_task(task("move forward")) == 0.1


def test_reverse_distance():
    assert supported_drive_task(task("drive backward 1.5 meters")) == -1.5
    assert supported_drive_task(task("go in reverse 0.3 m")) == -0.3
    assert supported_drive_task(task("move backwards")) == -0.1


def test_unsupported_tasks_do_not_claim_execution():
    assert supported_drive_task(task("find the red box")) is None
    assert supported_drive_task(task("drive forward 1 m", needs_vision=True)) is None
    assert supported_drive_task(task("drive forward 1 m", outdoor=True)) is None
    assert supported_drive_task(task("drive forward 1 m", needs_manipulation=True)) is None
