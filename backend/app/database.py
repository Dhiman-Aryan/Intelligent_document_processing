from pymongo import ASCENDING, MongoClient
from pymongo.database import Database

from app.config import get_settings

settings = get_settings()

client: MongoClient = MongoClient(settings.mongodb_uri, appname=settings.mongodb_app_name)
db: Database = client[settings.mongodb_db_name]

USERS_COLLECTION_NAME = settings.mongodb_users_collection
UPLOADS_COLLECTION_NAME = settings.mongodb_uploads_collection

# Enforced at the database level too (not just checked in the signup
# route) — a unique index means two concurrent signups with the same
# email can never both succeed, even under a race condition.
db[USERS_COLLECTION_NAME].create_index([("email", ASCENDING)], unique=True)

# One ownership record per file (re-uploads upsert instead of
# duplicating — see services/ownership.py), and an index on user_id
# since "give me everything this user uploaded" is the hot query path
# for scoping /documents to non-admin accounts.
db[UPLOADS_COLLECTION_NAME].create_index([("file_id", ASCENDING)], unique=True)
db[UPLOADS_COLLECTION_NAME].create_index([("user_id", ASCENDING)])


def get_db() -> Database:
    """FastAPI dependency — pymongo's MongoClient is already thread-safe
    and pooled internally, so every request can share the same client;
    this just hands routers the database handle to query collections on."""
    return db
