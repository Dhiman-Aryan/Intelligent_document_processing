from datetime import datetime, timezone


def new_user_document(name: str, email: str, hashed_password: str) -> dict:
    """
    The `users` collection just stores plain dicts shaped like this —
    MongoDB is schemaless, so there's no ORM model class to define.
    Mongo generates `_id` itself on insert_one(); schemas/auth.py
    converts it to a string `id` before it reaches the API response.
    """
    return {
        "name": name,
        "email": email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
    }
