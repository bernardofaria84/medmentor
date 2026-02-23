"""Mentors router: listing, profile, content upload/manage, bot profile approval."""
import uuid
import io
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends

from dependencies import db, fs, logger
from models import (
    MentorListItem, MentorProfile, MentorStats,
    ContentUploadResponse, ContentItem,
    ContentStatus, SenderType, FeedbackType,
    UpdateProfileRequest,
)
from auth_utils import get_current_user

# Lazy-loaded services (initialized in main.py)
rag_service = None
profile_service = None

router = APIRouter(tags=["mentors"])


def _init_services(rag_svc, prof_svc):
    """Called once from main.py after service initialization."""
    global rag_service, profile_service
    rag_service = rag_svc
    profile_service = prof_svc


# ---------- public listing ----------

@router.get("/mentors", response_model=List[MentorListItem])
async def list_mentors(current_user: dict = Depends(get_current_user)):
    mentors = await db.mentors.find(
        {}, {"_id": 1, "full_name": 1, "specialty": 1, "avatar_url": 1, "bio": 1}
    ).to_list(100)
    return [
        MentorListItem(
            id=m["_id"], full_name=m["full_name"], specialty=m["specialty"],
            avatar_url=m.get("avatar_url"), bio=m.get("bio"),
        )
        for m in mentors
    ]


@router.get("/mentors/{mentor_id}", response_model=MentorProfile)
async def get_mentor(mentor_id: str):
    mentor = await db.mentors.find_one({"_id": mentor_id})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return MentorProfile(
        id=mentor["_id"], email=mentor["email"],
        full_name=mentor["full_name"], specialty=mentor["specialty"],
        bio=mentor.get("bio"), avatar_url=mentor.get("avatar_url"),
        agent_profile=mentor.get("agent_profile"),
        agent_profile_pending=mentor.get("agent_profile_pending"),
        profile_status=mentor.get("profile_status", "INACTIVE"),
        style_traits=mentor.get("style_traits"),
        created_at=mentor["created_at"],
    )


# ---------- mentor self-profile ----------

@router.get("/mentors/profile/me", response_model=MentorProfile)
async def get_mentor_self_profile(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    mentor = await db.mentors.find_one({"_id": current_user["user_id"]})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return MentorProfile(
        id=mentor["_id"], email=mentor["email"],
        full_name=mentor["full_name"], specialty=mentor["specialty"],
        bio=mentor.get("bio"), avatar_url=mentor.get("avatar_url"),
        agent_profile=mentor.get("agent_profile"),
        agent_profile_pending=mentor.get("agent_profile_pending"),
        profile_status=mentor.get("profile_status", "INACTIVE"),
        style_traits=mentor.get("style_traits"),
        created_at=mentor["created_at"],
    )


@router.put("/mentors/profile/me")
async def update_mentor_profile(
    profile_data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    update_dict = {k: v for k, v in profile_data.dict(exclude_unset=True).items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.mentors.update_one({"_id": current_user["user_id"]}, {"$set": update_dict})
    return {"message": "Profile updated successfully"}


# ---------- bot profile approval ----------

@router.post("/mentor/profile/approve")
async def approve_bot_profile(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    mentor = await db.mentors.find_one({"_id": current_user["user_id"]})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    if mentor.get("profile_status") != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="No pending profile to approve")
    pending = mentor.get("agent_profile_pending")
    if not pending:
        raise HTTPException(status_code=400, detail="No pending profile text found")
    await db.mentors.update_one(
        {"_id": current_user["user_id"]},
        {"$set": {
            "agent_profile": pending,
            "style_traits": mentor.get("style_traits_pending", mentor.get("style_traits")),
            "profile_status": "ACTIVE",
            "agent_profile_pending": None,
            "style_traits_pending": None,
            "profile_approved_at": datetime.utcnow(),
        }}
    )
    logger.info(f"Mentor {current_user['user_id']} approved bot profile")
    return {"message": "Bot profile approved and activated", "profile_status": "ACTIVE"}


# ---------- content management ----------

@router.post("/mentor/content/upload", response_model=ContentUploadResponse)
async def upload_content(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        file_content = await file.read()
        content_id = str(uuid.uuid4())
        title = file.filename.rsplit('.', 1)[0] if file.filename else "Untitled"

        content_doc = {
            "_id": content_id,
            "mentor_id": current_user["user_id"],
            "title": title,
            "filename": file.filename,
            "content_type": "PDF",
            "status": "PROCESSING",
            "uploaded_at": datetime.utcnow(),
        }
        await db.mentor_content.insert_one(content_doc)

        # Store in GridFS
        file_id = fs.put(file_content, filename=file.filename, content_type="application/pdf")

        # Process PDF
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            pdf_text = ""
            for page in pdf_reader.pages:
                pdf_text += page.extract_text() or ""

            if not pdf_text.strip():
                raise HTTPException(status_code=400, detail="Could not extract text from PDF")

            await db.mentor_content.update_one(
                {"_id": content_id},
                {"$set": {"processed_text": pdf_text, "gridfs_file_id": str(file_id)}}
            )

            # Chunk and embed
            chunks_processed = await rag_service.process_and_store_content(
                content_text=pdf_text,
                mentor_id=current_user["user_id"],
                content_id=content_id,
                title=title,
                db=db,
            )

            # Generate / update AI agent profile
            try:
                mentor_doc = await db.mentors.find_one({"_id": current_user["user_id"]})
                existing_profile = mentor_doc.get("agent_profile")
                profile_data = await profile_service.analyze_content_and_generate_profile(
                    content_text=pdf_text,
                    mentor_name=mentor_doc["full_name"],
                    mentor_specialty=mentor_doc["specialty"],
                    existing_profile=existing_profile,
                )
                await db.mentors.update_one(
                    {"_id": current_user["user_id"]},
                    {"$set": {
                        "agent_profile_pending": profile_data["profile_text"],
                        "style_traits_pending": profile_data["style_traits"],
                        "profile_status": "PENDING_APPROVAL",
                        "profile_updated_at": datetime.utcnow(),
                    }}
                )
                logger.info(f"AI agent profile PENDING APPROVAL (source: {profile_data['analysis_source']})")
            except Exception as profile_error:
                logger.error(f"Error generating agent profile: {profile_error}")

            await db.mentor_content.update_one(
                {"_id": content_id}, {"$set": {"status": "COMPLETED"}}
            )
            logger.info(f"Processed {chunks_processed} chunks for content {content_id}")

        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            await db.mentor_content.update_one(
                {"_id": content_id}, {"$set": {"status": "ERROR"}}
            )
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

        return ContentUploadResponse(
            content_id=content_id, title=title,
            status=ContentStatus.COMPLETED,
            message=f"Content uploaded and processed successfully. {chunks_processed} chunks indexed.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mentor/content", response_model=List[ContentItem])
async def list_mentor_content(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    contents = await db.mentor_content.find(
        {"mentor_id": current_user["user_id"]}
    ).sort("uploaded_at", -1).to_list(100)
    return [
        ContentItem(
            id=c["_id"], title=c["title"],
            content_type=c["content_type"], status=c["status"],
            uploaded_at=c["uploaded_at"],
        )
        for c in contents
    ]


@router.get("/mentor/content/{content_id}")
async def get_content_details(content_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    content = await db.mentor_content.find_one({
        "_id": content_id, "mentor_id": current_user["user_id"]
    })
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    chunk_count = await db.content_chunks.count_documents({"content_id": content_id})
    return {
        "id": content["_id"], "title": content["title"],
        "content_type": content["content_type"], "status": content["status"],
        "uploaded_at": content["uploaded_at"],
        "processed_text": content.get("processed_text", ""),
        "chunk_count": chunk_count,
    }


@router.delete("/mentor/content/{content_id}")
async def delete_content(content_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    content = await db.mentor_content.find_one({
        "_id": content_id, "mentor_id": current_user["user_id"]
    })
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    result = await db.content_chunks.delete_many({"content_id": content_id})
    await db.mentor_content.delete_one({"_id": content_id})
    logger.info(f"Deleted content {content_id} and {result.deleted_count} chunks")
    return {"message": "Content deleted successfully", "deleted_chunks": result.deleted_count}


@router.post("/mentor/content/bulk-delete")
async def bulk_delete_content(content_ids: List[str], current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    deleted_count = 0
    deleted_chunks_total = 0
    for cid in content_ids:
        content = await db.mentor_content.find_one({"_id": cid, "mentor_id": current_user["user_id"]})
        if content:
            r = await db.content_chunks.delete_many({"content_id": cid})
            deleted_chunks_total += r.deleted_count
            await db.mentor_content.delete_one({"_id": cid})
            deleted_count += 1
    logger.info(f"Bulk deleted {deleted_count} contents and {deleted_chunks_total} chunks")
    return {
        "message": f"Successfully deleted {deleted_count} content(s)",
        "deleted_contents": deleted_count,
        "deleted_chunks": deleted_chunks_total,
    }


# ---------- stats ----------

@router.get("/mentor/stats", response_model=MentorStats)
async def get_mentor_stats(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    conversations = await db.conversations.find(
        {"mentor_id": current_user["user_id"]}, {"_id": 1}
    ).to_list(1000)
    cids = [c["_id"] for c in conversations]
    total_queries = await db.messages.count_documents({
        "conversation_id": {"$in": cids}, "sender_type": SenderType.MENTOR_BOT,
    })
    total_content = await db.mentor_content.count_documents({
        "mentor_id": current_user["user_id"], "status": ContentStatus.COMPLETED,
    })
    msgs_fb = await db.messages.find({
        "conversation_id": {"$in": cids},
        "sender_type": SenderType.MENTOR_BOT,
        "feedback": {"$ne": FeedbackType.NONE},
    }, {"feedback": 1}).to_list(1000)
    if msgs_fb:
        likes = sum(1 for m in msgs_fb if m["feedback"] == FeedbackType.LIKE)
        avg = (likes / len(msgs_fb)) * 5.0
    else:
        avg = 0.0
    return MentorStats(
        total_queries=total_queries, average_rating=round(avg, 2),
        total_content=total_content, top_topics=[],
    )
