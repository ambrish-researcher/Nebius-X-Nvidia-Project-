"""One-time, idempotent SQLite -> PostgreSQL ledger import.

Run on a host that can access the ORIGINAL usage.sqlite and DATABASE_URL.
Never reset reservations: unresolved charges remain unresolved after import.
"""
import os
import sqlite3
import sys
from pathlib import Path

from app.postgres_ledger import database

COLUMNS = ("key", "model", "workflow", "reserved", "charged", "tokens",
           "response", "created", "response_model", "completed_at",
           "validated_at", "parent_key")
JOBS = ("id", "prompt", "retry", "status", "result", "error", "request_key", "created")


def migrate(path):
    source = sqlite3.connect(path)
    try:
        dest = database()
        with dest:
            tables = {r[0] for r in source.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            if "requests" in tables:
                present = {r[1] for r in source.execute("PRAGMA table_info(requests)")}
                selected = [c for c in COLUMNS if c in present]
                for row in source.execute(f"SELECT {','.join(selected)} FROM requests"):
                    columns = ",".join(selected)
                    marks = ",".join("?" for _ in selected)
                    dest.execute(
                        f"INSERT INTO requests ({columns}) VALUES ({marks}) "
                        "ON CONFLICT (key) DO NOTHING", row
                    )
            if "generation_jobs" in tables:
                for row in source.execute(f"SELECT {','.join(JOBS)} FROM generation_jobs"):
                    dest.execute(
                        f"INSERT INTO generation_jobs ({','.join(JOBS)}) "
                        f"VALUES ({','.join('?' for _ in JOBS)}) "
                        "ON CONFLICT (id) DO NOTHING", row
                    )
        print("Import completed. Existing PostgreSQL records were not overwritten.")
    finally:
        source.close()


if __name__ == "__main__":
    if not os.getenv("DATABASE_URL"):
        raise SystemExit("DATABASE_URL must be configured")
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".runtime/usage.sqlite")
    if not path.is_file():
        raise SystemExit(f"Source SQLite ledger does not exist: {path}")
    migrate(path)
