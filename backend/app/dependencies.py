from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database

from app.config import Settings, get_settings
from app.database import USERS_COLLECTION_NAME, get_db
from app.schemas.auth import UserOut
from app.security import decode_access_token
from app.services.roles import resolve_role

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Database = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> UserOut:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise unauthorized

    try:
        user = db[USERS_COLLECTION_NAME].find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        raise unauthorized

    if user is None:
        raise unauthorized

    role = resolve_role(user["email"], settings)
    return UserOut.from_mongo(user, role)


def require_admin(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    """Use on any route that only your admin account(s) should reach."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
