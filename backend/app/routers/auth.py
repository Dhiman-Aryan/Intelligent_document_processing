from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.config import Settings, get_settings
from app.database import USERS_COLLECTION_NAME, get_db
from app.dependencies import get_current_user
from app.models import new_user_document
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.security import create_access_token, hash_password, verify_password
from app.services.roles import resolve_role

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    already_exists = HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
    )

    users = db[USERS_COLLECTION_NAME]

    if users.find_one({"email": payload.email}):
        raise already_exists

    document = new_user_document(
        name=payload.name, email=payload.email, hashed_password=hash_password(payload.password)
    )

    try:
        result = users.insert_one(document)
    except DuplicateKeyError:
        # Belt and braces: the find_one check above has a tiny race
        # window under concurrent signups — the unique index on
        # `email` (see database.py) is what actually guarantees this
        # can never insert a duplicate, this just turns that into a
        # clean 409 instead of a raw 500.
        raise already_exists

    document["_id"] = result.inserted_id
    token = create_access_token(subject=str(result.inserted_id))
    role = resolve_role(payload.email, settings)
    return TokenResponse(access_token=token, user=UserOut.from_mongo(document, role))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
    )

    user = db[USERS_COLLECTION_NAME].find_one({"email": payload.email})
    if user is None or not verify_password(payload.password, user["hashed_password"]):
        raise invalid_credentials

    token = create_access_token(subject=str(user["_id"]))
    role = resolve_role(user["email"], settings)
    return TokenResponse(access_token=token, user=UserOut.from_mongo(user, role))


@router.get("/me", response_model=UserOut)
def me(current_user: UserOut = Depends(get_current_user)):
    return current_user
