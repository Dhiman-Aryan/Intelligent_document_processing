from typing import Literal

from app.config import Settings

Role = Literal["user", "admin"]


def resolve_role(email: str, settings: Settings) -> Role:
    return "admin" if email.strip().lower() in settings.admin_email_set else "user"
