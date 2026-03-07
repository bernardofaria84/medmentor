"""Mentors router: listing, profile, content upload/manage, bot profile approval."""
import uuid
import io
import os
import base64
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


@router.post("/mentors/profile/avatar")
async def upload_mentor_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload mentor profile avatar — stored as base64 data URL in MongoDB."""
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")

    allowed_mime = {"image/jpeg", "image/png", "image/webp"}
    content_type = file.content_type or ""
    if content_type not in allowed_mime:
        raise HTTPException(status_code=400, detail="Tipo de imagem nao suportado. Use JPEG, PNG ou WebP.")

    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagem muito grande. Maximo: 5MB")

    b64 = base64.b64encode(file_content).decode("utf-8")
    ext = {"image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp"}.get(content_type, "jpeg")
    avatar_url = f"data:{content_type};base64,{b64}"

    await db.mentors.update_one(
        {"_id": current_user["user_id"]},
        {"$set": {"avatar_url": avatar_url}},
    )
    logger.info(f"Mentor {current_user['user_id']} updated avatar ({ext}, {len(file_content)/1024:.1f}KB)")
    return {"avatar_url": avatar_url}


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

    ALLOWED_TYPES = {
        "application/pdf": "PDF",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
        "video/mp4": "VIDEO",
        "audio/mpeg": "AUDIO",
        "audio/mp3": "AUDIO",
        "audio/wav": "AUDIO",
        "audio/m4a": "AUDIO",
        "audio/ogg": "AUDIO",
        "audio/flac": "AUDIO",
    }
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".mp4", ".mp3", ".wav", ".m4a", ".ogg", ".flac"}

    filename_lower = (file.filename or "").lower()
    file_ext = "." + filename_lower.rsplit(".", 1)[-1] if "." in filename_lower else ""
    content_type = file.content_type or ""

    # Determine file type
    file_type = ALLOWED_TYPES.get(content_type)
    if not file_type:
        for ext in ALLOWED_EXTENSIONS:
            if filename_lower.endswith(ext):
                if ext == ".docx":
                    file_type = "DOCX"
                elif ext == ".mp4":
                    file_type = "VIDEO"
                elif ext in {".mp3", ".wav", ".m4a", ".ogg", ".flac"}:
                    file_type = "AUDIO"
                elif ext == ".pdf":
                    file_type = "PDF"
                break

    if not file_type:
        raise HTTPException(status_code=400, detail=f"Formato nao suportado. Formatos aceitos: PDF, DOCX, MP4, MP3, WAV, M4A.")

    try:
        file_content = await file.read()
        content_id = str(uuid.uuid4())
        title = file.filename.rsplit(".", 1)[0] if file.filename and "." in file.filename else (file.filename or "Untitled")

        content_doc = {
            "_id": content_id,
            "mentor_id": current_user["user_id"],
            "title": title,
            "filename": file.filename,
            "content_type": file_type,
            "file_type": file_type,
            "status": "PROCESSING",
            "uploaded_at": datetime.utcnow(),
        }
        await db.mentor_content.insert_one(content_doc)

        # Store in GridFS
        fs.put(file_content, filename=file.filename, content_type=content_type)

        # Extract text based on file type
        extracted_text = ""
        if file_type == "PDF":
            try:
                import PyPDF2
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                for page in pdf_reader.pages:
                    extracted_text += page.extract_text() or ""
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erro ao processar PDF: {str(e)}")
            if not extracted_text.strip():
                raise HTTPException(status_code=400, detail="Nao foi possivel extrair texto do PDF")

        elif file_type == "DOCX":
            try:
                import docx as python_docx
                doc = python_docx.Document(io.BytesIO(file_content))
                extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erro ao processar DOCX: {str(e)}")
            if not extracted_text.strip():
                raise HTTPException(status_code=400, detail="Nao foi possivel extrair texto do DOCX")

        elif file_type in ("VIDEO", "AUDIO"):
            try:
                from openai import OpenAI
                key = os.environ.get("OPENAI_API_KEY")
                if not key:
                    raise HTTPException(status_code=500, detail="OpenAI API key not configured")
                client = OpenAI(api_key=key)
                audio_file = io.BytesIO(file_content)
                audio_file.name = file.filename or f"audio{file_ext}"
                transcript = client.audio.transcriptions.create(
                    model=os.environ.get("WHISPER_MODEL", "whisper-1"),
                    file=audio_file,
                    language="pt",
                    response_format="text",
                )
                extracted_text = str(transcript).strip() if transcript else ""
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Erro na transcricao do arquivo: {str(e)}")
            if not extracted_text.strip():
                raise HTTPException(status_code=400, detail="Nao foi possivel transcrever o arquivo de audio/video")

        await db.mentor_content.update_one(
            {"_id": content_id},
            {"$set": {"processed_text": extracted_text[:5000]}}
        )

        # Chunk and embed
        chunks_processed = await rag_service.process_pdf_content(
            pdf_text=extracted_text,
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
                content_text=extracted_text,
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
        logger.info(f"Processed {chunks_processed} chunks for content {content_id} (type: {file_type})")

        return ContentUploadResponse(
            content_id=content_id, title=title,
            status=ContentStatus.COMPLETED,
            message=f"Conteudo enviado e processado com sucesso. {chunks_processed} chunks indexados.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading content: {e}")
        if 'content_id' in locals():
            await db.mentor_content.update_one(
                {"_id": content_id}, {"$set": {"status": "ERROR"}}
            )
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
