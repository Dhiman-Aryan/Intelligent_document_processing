"""
Tracks which user uploaded which file, so regular "user" accounts can
be shown only their own documents while admin sees everything.

Documents themselves live in Databricks, which has no idea who
uploaded a file — Notebook 1 (ingestion) only ever sees the raw
Volume folder. So ownership is recorded here, in MongoDB, at upload
time, keyed by the SAME file_id the pipeline will later compute for
that exact file — see compute_file_id below.
"""

import hashlib
from datetime import datetime, timezone

from pymongo.database import Database

from app.database import UPLOADS_COLLECTION_NAME


def compute_file_id(file_path: str, file_size: int) -> str:
    """
    Mirrors Notebook 1's file_id formula exactly:
    sha2(concat_ws("||", file_path, file_size), 256)
    (see Databricks/databricks/1-ingestion.ipynb, cell 9f420e3f).

    Computing the same hash here — before the pipeline has even run —
    is what lets us record "user X uploaded this" ahead of time, using
    an id that will still match once Notebook 1 actually ingests it.

    Confirmed against a real pipeline run: dbutils.fs.ls() on a Unity
    Catalog Volume returns paths prefixed with "dbfs:" (e.g.
    "dbfs:/Volumes/cdac-project/.../file.pdf"), not the plain
    "/Volumes/..." path this function used to hash. That silent
    mismatch meant every regular user's ownership lookup always came
    back empty — their files existed and were fully processed in
    Databricks, but never matched an owned file_id, so the Dashboard/
    Documents pages always showed zero. Admin accounts never hit this
    (they see every document unfiltered), which is why it went
    unnoticed.
    """
    dbfs_path = file_path if file_path.startswith("dbfs:") else f"dbfs:{file_path}"
    raw = f"{dbfs_path}||{file_size}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def record_ownership(db: Database, *, file_id: str, user_id: str, file_name: str) -> None:
    """Idempotent — re-uploading the same file (same path + size) just refreshes the timestamp."""
    db[UPLOADS_COLLECTION_NAME].update_one(
        {"file_id": file_id},
        {
            "$set": {
                "user_id": user_id,
                "file_name": file_name,
                "uploaded_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


def get_owned_file_ids(db: Database, user_id: str) -> set[str]:
    return {doc["file_id"] for doc in db[UPLOADS_COLLECTION_NAME].find({"user_id": user_id}, {"file_id": 1})}
