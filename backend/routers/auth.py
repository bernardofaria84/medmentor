"""Auth router: signup, login for users and mentors."""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status

from dependencies import db, logger
from models import UserSignup, MentorSignup, LoginRequest, LoginResponse
from auth_utils import hash_password, verify_password, create_access_token

router = APIRouter(tags=["auth"])


@router.post("/auth/signup", response_model=LoginResponse)
async def signup(user_data: UserSignup):
    """Register a new medical subscriber (user)"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "crm": user_data.crm,
        "specialty": user_data.specialty,
        "user_type": "user",
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_doc)

    token = create_access_token(data={"sub": user_id, "type": "user"})
    logger.info(f"New user registered: {user_data.email}")
    return LoginResponse(
        access_token=token, user_id=user_id, user_type="user"
    )


@router.post("/auth/mentor/signup", response_model=LoginResponse)
async def mentor_signup(mentor_data: MentorSignup):
    """Register a new mentor"""
    existing = await db.mentors.find_one({"email": mentor_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    mentor_id = str(uuid.uuid4())
    mentor_doc = {
        "_id": mentor_id,
        "email": mentor_data.email,
        "password_hash": hash_password(mentor_data.password),
        "full_name": mentor_data.full_name,
        "specialty": mentor_data.specialty,
        "bio": mentor_data.bio,
        "user_type": "mentor",
        "agent_profile": None,
        "agent_profile_pending": None,
        "profile_status": "INACTIVE",
        "style_traits": None,
        "created_at": datetime.utcnow()
    }
    await db.mentors.insert_one(mentor_doc)

    token = create_access_token(data={"sub": mentor_id, "type": "mentor"})
    logger.info(f"New mentor registered: {mentor_data.email}")
    return LoginResponse(
        access_token=token, user_id=mentor_id, user_type="mentor"
    )


@router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login for users (medical subscribers)"""
    user = await db.users.find_one({"email": login_data.email})
    if user and verify_password(login_data.password, user["password_hash"]):
        token = create_access_token(data={"sub": user["_id"], "type": "user"})
        return LoginResponse(
            access_token=token, user_id=user["_id"], user_type="user"
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )


@router.post("/auth/mentor/login", response_model=LoginResponse)
async def mentor_login(login_data: LoginRequest):
    """Login for mentors"""
    mentor = await db.mentors.find_one({"email": login_data.email})
    if mentor and verify_password(login_data.password, mentor["password_hash"]):
        token = create_access_token(data={"sub": mentor["_id"], "type": "mentor"})
        return LoginResponse(
            access_token=token, user_id=mentor["_id"], user_type="mentor"
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )
