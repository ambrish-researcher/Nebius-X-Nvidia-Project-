"""PostgreSQL ledger adapter with the small SQLite-compatible interface used by ARISE.

Use DATABASE_URL only when configured. Connections are transactional; concurrent
budget reservations acquire a PostgreSQL advisory transaction lock.
"""
import os


class LedgerConnection:
    def __init__(self, url):
        import psycopg
        self.connection = psycopg.connect(url, connect_timeout=8)
        self._locked = False

    def execute(self, sql, parameters=()):
        command = sql.strip()
        if command.upper() == "BEGIN IMMEDIATE":
            # All budget reservations serialize across workers, not only threads.
            self.connection.execute("SELECT pg_advisory_xact_lock(14821003)")
            self._locked = True
            return self
        if "?" in command:
            command = command.replace("?", "%s")
        return self.connection.execute(command, parameters)

    def commit(self):
        self.connection.commit()

    def close(self):
        self.connection.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type is None:
                self.connection.commit()
            else:
                self.connection.rollback()
        finally:
            self.connection.close()


def database():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required for PostgreSQL ledger")
    con = LedgerConnection(url)
    try:
        con.execute(
            """CREATE TABLE IF NOT EXISTS requests (
                key TEXT PRIMARY KEY, model TEXT, workflow TEXT,
                reserved DOUBLE PRECISION, charged DOUBLE PRECISION,
                tokens INTEGER, response TEXT, created DOUBLE PRECISION,
                response_model TEXT, completed_at DOUBLE PRECISION,
                validated_at DOUBLE PRECISION, parent_key TEXT
            )"""
        )
        con.execute(
            """CREATE TABLE IF NOT EXISTS generation_jobs (
                id TEXT PRIMARY KEY, prompt TEXT NOT NULL,
                retry INTEGER NOT NULL, status TEXT NOT NULL,
                result TEXT, error TEXT, request_key TEXT,
                created DOUBLE PRECISION NOT NULL
            )"""
        )
        for name, typ in (
            ("response_model", "TEXT"), ("completed_at", "DOUBLE PRECISION"),
            ("validated_at", "DOUBLE PRECISION"), ("parent_key", "TEXT")
        ):
            con.execute(f"ALTER TABLE requests ADD COLUMN IF NOT EXISTS {name} {typ}")
        con.commit()
        return con
    except Exception:
        con.close()
        raise
