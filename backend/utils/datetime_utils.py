from datetime import datetime, timezone
from typing import Optional


def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """Serialize a DB datetime as an ISO string with UTC timezone.

    SQLite's CURRENT_TIMESTAMP (via SQLAlchemy func.now()) stores UTC,
    but SQLAlchemy returns naive datetimes. Tagging with UTC ensures
    the frontend correctly converts to local time for display.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
