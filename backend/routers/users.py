"""Users router: profile endpoints for subscribers."""
from fastapi import APIRouter, HTTPException, Depends

from dependencies import db
from models import UserProfile, UpdateProfileRequest
from auth_utils import get_current_user

router = APIRouter(tags=["users"])


@router.get("/users/profile", response_model=UserProfile)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(
        id=user["_id"],
        email=user["email"],
        full_name=user["full_name"],
        crm=user["crm"],
        specialty=user.get("specialty"),
        profile_picture_url=user.get("profile_picture_url"),
        created_at=user["created_at"]
    )


@router.put("/users/profile")
async def update_user_profile(
    profile_data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    update_dict = {
        k: v for k, v in profile_data.dict(exclude_unset=True).items() if v is not None
    }
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {"$set": update_dict}
    )
    return {"message": "Profile updated successfully"}
