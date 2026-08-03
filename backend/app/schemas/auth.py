from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.services.roles import Role


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    created_at: datetime

    @staticmethod
    def from_mongo(doc: dict, role: Role) -> "UserOut":
        """doc is a raw MongoDB document — `_id` is an ObjectId, not a string."""
        return UserOut(id=str(doc["_id"]), name=doc["name"], email=doc["email"], role=role, created_at=doc["created_at"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
