from fastapi import FastAPI, APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from datetime import datetime
from typing import List, Optional
import uuid
import PyPDF2
import io
import gridfs
from bson import ObjectId

# Import our modules
from models import *
from auth_utils import (
    hash_password, 
    verify_password, 
    create_access_token, 
    get_current_user
)
from rag_service import rag_service
from multi_ai_rag_service import multi_ai_rag_service
from mentor_profile_service import mentor_profile_service
from anonymization_service import anonymization_service
from exceptions import ResponseValidationError
from analytics_service import (
    get_queries_analytics,
    get_ratings_analytics,
    get_content_analytics
)

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'medmentor_db')]

# Create a synchronous client for GridFS (GridFS doesn't support async yet)
from pymongo import MongoClient
sync_client = MongoClient(mongo_url)
sync_db = sync_client[os.environ.get('DB_NAME', 'medmentor_db')]
fs = gridfs.GridFS(sync_db)

# Create the main app
app = FastAPI(title="MedMentor API")

# Add middleware to log validation errors
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    error_details = exc.errors()
    print(f"========== VALIDATION ERROR ==========")
    print(f"URL: {request.url}")
    print(f"Errors: {error_details}")
    print(f"Body: {exc.body}")
    print(f"======================================")
    logger.error(f"Validation error on {request.url}: {error_details}")
    
    # Serialize errors safely
    safe_errors = []
    for error in error_details:
        safe_error = {
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "input": str(error.get("input"))[:100]
        }
        safe_errors.append(safe_error)
    
    return JSONResponse(
        status_code=422,
        content={"detail": safe_errors, "body": str(exc.body)[:500] if exc.body else "No body"}
    )

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTHENTICATION ENDPOINTS ====================

@api_router.post("/auth/signup/user", response_model=LoginResponse)
async def signup_user(user_data: UserSignup):
    """Register a new medical subscriber (user)"""
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user document
    user_doc = {
        "_id": str(uuid.uuid4()),
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "crm": user_data.crm,
        "specialty": user_data.specialty,
        "profile_picture_url": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_doc["_id"], "type": "user"}
    )
    
    return LoginResponse(
        access_token=access_token,
        user_id=user_doc["_id"],
        user_type="user"
    )

@api_router.post("/auth/signup/mentor", response_model=LoginResponse)
async def signup_mentor(mentor_data: MentorSignup):
    """Register a new mentor"""
    
    # Check if mentor already exists
    existing_mentor = await db.mentors.find_one({"email": mentor_data.email})
    if existing_mentor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mentor with this email already exists"
        )
    
    # Create mentor document
    mentor_doc = {
        "_id": str(uuid.uuid4()),
        "email": mentor_data.email,
        "password_hash": hash_password(mentor_data.password),
        "full_name": mentor_data.full_name,
        "specialty": mentor_data.specialty,
        "bio": mentor_data.bio,
        "avatar_url": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.mentors.insert_one(mentor_doc)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": mentor_doc["_id"], "type": "mentor"}
    )
    
    return LoginResponse(
        access_token=access_token,
        user_id=mentor_doc["_id"],
        user_type="mentor"
    )

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login for both users and mentors"""
    
    # Try to find user first
    user = await db.users.find_one({"email": login_data.email})
    if user and verify_password(login_data.password, user["password_hash"]):
        access_token = create_access_token(
            data={"sub": user["_id"], "type": "user"}
        )
        return LoginResponse(
            access_token=access_token,
            user_id=user["_id"],
            user_type="user"
        )
    
    # Try to find mentor
    mentor = await db.mentors.find_one({"email": login_data.email})
    if mentor and verify_password(login_data.password, mentor["password_hash"]):
        access_token = create_access_token(
            data={"sub": mentor["_id"], "type": "mentor"}
        )
        return LoginResponse(
            access_token=access_token,
            user_id=mentor["_id"],
            user_type="mentor"
        )
    
    # Invalid credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )

# ==================== USER ENDPOINTS ====================

@api_router.get("/users/profile", response_model=UserProfile)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    
    if current_user["user_type"] != "user":
        raise HTTPException(status_code=403, detail="Access denied")
    
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

@api_router.put("/users/profile")
async def update_user_profile(
    profile_data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    
    if current_user["user_type"] != "user":
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}

# ==================== MENTOR ENDPOINTS ====================

@api_router.get("/mentors", response_model=List[MentorListItem])
async def list_mentors():
    """Get all mentors"""
    
    mentors = await db.mentors.find().to_list(100)
    
    return [
        MentorListItem(
            id=mentor["_id"],
            full_name=mentor["full_name"],
            specialty=mentor["specialty"],
            avatar_url=mentor.get("avatar_url"),
            bio=mentor.get("bio")
        )
        for mentor in mentors
    ]

@api_router.get("/mentors/{mentor_id}", response_model=MentorProfile)
async def get_mentor(mentor_id: str):
    """Get mentor details"""
    
    mentor = await db.mentors.find_one({"_id": mentor_id})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    return MentorProfile(
        id=mentor["_id"],
        email=mentor["email"],
        full_name=mentor["full_name"],
        specialty=mentor["specialty"],
        bio=mentor.get("bio"),
        avatar_url=mentor.get("avatar_url"),
        created_at=mentor["created_at"]
    )

@api_router.get("/mentors/profile/me", response_model=MentorProfile)
async def get_mentor_profile(current_user: dict = Depends(get_current_user)):
    """Get current mentor's profile"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    mentor = await db.mentors.find_one({"_id": current_user["user_id"]})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    return MentorProfile(
        id=mentor["_id"],
        email=mentor["email"],
        full_name=mentor["full_name"],
        specialty=mentor["specialty"],
        bio=mentor.get("bio"),
        avatar_url=mentor.get("avatar_url"),
        created_at=mentor["created_at"]
    )

@api_router.put("/mentors/profile")
async def update_mentor_profile(
    profile_data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update mentor profile"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.mentors.update_one(
        {"_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}

# ==================== CONTENT MANAGEMENT ====================

@api_router.post("/mentor/content/upload", response_model=ContentUploadResponse)
async def upload_content(
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload content (PDF) for a mentor"""
    
    logger.info(f"Upload request received - Title: {title}, File: {file.filename}, User: {current_user['user_id']}")
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported in this MVP"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Create content document
        content_id = str(uuid.uuid4())
        content_doc = {
            "_id": content_id,
            "mentor_id": current_user["user_id"],
            "title": title,
            "content_type": ContentType.PDF,
            "status": ContentStatus.PROCESSING,
            "original_file_url": None,  # GridFS reference will be added
            "processed_text": None,
            "uploaded_at": datetime.utcnow()
        }
        
        await db.mentor_content.insert_one(content_doc)
        
        # Store file in GridFS
        file_id = fs.put(
            file_content,
            filename=file.filename,
            content_type="application/pdf",
            content_id=content_id
        )
        
        # Update content doc with file reference
        await db.mentor_content.update_one(
            {"_id": content_id},
            {"$set": {"original_file_url": str(file_id)}}
        )
        
        # Process PDF in background (simplified for MVP)
        # Extract text from PDF
        pdf_text = ""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            for page in pdf_reader.pages:
                pdf_text += page.extract_text() + "\n"
            
            # Update with processed text
            await db.mentor_content.update_one(
                {"_id": content_id},
                {"$set": {"processed_text": pdf_text}}
            )
            
            # Process content through new Multi-AI RAG service (chunking + embeddings)
            chunks_processed = await multi_ai_rag_service.process_pdf_content(
                pdf_text=pdf_text,
                mentor_id=current_user["user_id"],
                content_id=content_id,
                title=title,
                db=db
            )
            
            # Generate/update AI agent profile for this mentor
            logger.info(f"Generating AI agent profile for mentor {current_user['user_id']}")
            try:
                # Get current mentor profile
                mentor_doc = await db.mentors.find_one({"_id": current_user["user_id"]})
                existing_profile = mentor_doc.get("agent_profile")
                
                # Analyze content and generate/update profile
                profile_data = await mentor_profile_service.analyze_content_and_generate_profile(
                    content_text=pdf_text,
                    mentor_name=mentor_doc["full_name"],
                    mentor_specialty=mentor_doc["specialty"],
                    existing_profile=existing_profile
                )
                
                # Update mentor document with new profile
                await db.mentors.update_one(
                    {"_id": current_user["user_id"]},
                    {
                        "$set": {
                            "agent_profile": profile_data["profile_text"],
                            "style_traits": profile_data["style_traits"],
                            "profile_updated_at": datetime.utcnow()
                        }
                    }
                )
                
                logger.info(f"AI agent profile updated successfully (source: {profile_data['analysis_source']})")
                
            except Exception as profile_error:
                logger.error(f"Error generating agent profile: {profile_error}")
                # Don't fail the upload if profile generation fails
            
            # Mark as completed
            await db.mentor_content.update_one(
                {"_id": content_id},
                {"$set": {"status": ContentStatus.COMPLETED}}
            )
            
            logger.info(f"Processed {chunks_processed} chunks for content {content_id}")
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            await db.mentor_content.update_one(
                {"_id": content_id},
                {"$set": {"status": ContentStatus.ERROR}}
            )
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
        
        return ContentUploadResponse(
            content_id=content_id,
            title=title,
            status=ContentStatus.COMPLETED,
            message=f"Content uploaded and processed successfully. {chunks_processed} chunks indexed."
        )
        
    except Exception as e:
        logger.error(f"Error uploading content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/mentor/analytics/queries")
async def get_queries_analytics_endpoint(current_user: dict = Depends(get_current_user)):
    """Get detailed queries analytics"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = await get_queries_analytics(db, current_user["user_id"])
    return analytics

@api_router.get("/mentor/analytics/ratings")
async def get_ratings_analytics_endpoint(current_user: dict = Depends(get_current_user)):
    """Get detailed ratings analytics"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = await get_ratings_analytics(db, current_user["user_id"])
    return analytics

@api_router.get("/mentor/analytics/content")
async def get_content_analytics_endpoint(current_user: dict = Depends(get_current_user)):
    """Get detailed content analytics"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = await get_content_analytics(db, current_user["user_id"])
    return analytics

@api_router.get("/mentor/content", response_model=List[ContentItem])
async def list_mentor_content(current_user: dict = Depends(get_current_user)):
    """List all content for current mentor"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    contents = await db.mentor_content.find(
        {"mentor_id": current_user["user_id"]}
    ).sort("uploaded_at", -1).to_list(100)
    
    return [
        ContentItem(
            id=content["_id"],
            title=content["title"],
            content_type=content["content_type"],
            status=content["status"],
            uploaded_at=content["uploaded_at"]
        )
        for content in contents
    ]

@api_router.get("/mentor/content/{content_id}")
async def get_content_details(content_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed information about a specific content item"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    content = await db.mentor_content.find_one({
        "_id": content_id,
        "mentor_id": current_user["user_id"]
    })
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Count chunks for this content
    chunk_count = await db.content_chunks.count_documents({"content_id": content_id})
    
    return {
        "id": content["_id"],
        "title": content["title"],
        "content_type": content["content_type"],
        "status": content["status"],
        "uploaded_at": content["uploaded_at"],
        "processed_text": content.get("processed_text", ""),
        "chunk_count": chunk_count
    }

@api_router.delete("/mentor/content/{content_id}")
async def delete_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a specific content item and all its chunks"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify content belongs to mentor
    content = await db.mentor_content.find_one({
        "_id": content_id,
        "mentor_id": current_user["user_id"]
    })
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Delete all chunks associated with this content
    delete_chunks_result = await db.content_chunks.delete_many({"content_id": content_id})
    
    # Delete the content itself
    await db.mentor_content.delete_one({"_id": content_id})
    
    logger.info(f"Deleted content {content_id} and {delete_chunks_result.deleted_count} chunks")
    
    return {
        "message": "Content deleted successfully",
        "deleted_chunks": delete_chunks_result.deleted_count
    }

@api_router.post("/mentor/content/bulk-delete")
async def bulk_delete_content(
    content_ids: List[str], 
    current_user: dict = Depends(get_current_user)
):
    """Delete multiple content items at once"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    deleted_count = 0
    deleted_chunks_total = 0
    
    for content_id in content_ids:
        # Verify content belongs to mentor
        content = await db.mentor_content.find_one({
            "_id": content_id,
            "mentor_id": current_user["user_id"]
        })
        
        if content:
            # Delete chunks
            delete_chunks_result = await db.content_chunks.delete_many({"content_id": content_id})
            deleted_chunks_total += delete_chunks_result.deleted_count
            
            # Delete content
            await db.mentor_content.delete_one({"_id": content_id})
            deleted_count += 1
    
    logger.info(f"Bulk deleted {deleted_count} contents and {deleted_chunks_total} chunks")
    
    return {
        "message": f"Successfully deleted {deleted_count} content(s)",
        "deleted_contents": deleted_count,
        "deleted_chunks": deleted_chunks_total
    }

@api_router.get("/mentor/stats", response_model=MentorStats)
async def get_mentor_stats(current_user: dict = Depends(get_current_user)):
    """Get mentor dashboard statistics"""
    
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count total queries (messages from bot)
    conversations = await db.conversations.find(
        {"mentor_id": current_user["user_id"]}
    ).to_list(1000)
    
    conversation_ids = [c["_id"] for c in conversations]
    
    total_queries = await db.messages.count_documents({
        "conversation_id": {"$in": conversation_ids},
        "sender_type": SenderType.MENTOR_BOT
    })
    
    # Count total content
    total_content = await db.mentor_content.count_documents({
        "mentor_id": current_user["user_id"],
        "status": ContentStatus.COMPLETED
    })
    
    # Calculate average rating (from feedback)
    messages_with_feedback = await db.messages.find({
        "conversation_id": {"$in": conversation_ids},
        "sender_type": SenderType.MENTOR_BOT,
        "feedback": {"$ne": FeedbackType.NONE}
    }).to_list(1000)
    
    if messages_with_feedback:
        likes = sum(1 for m in messages_with_feedback if m["feedback"] == FeedbackType.LIKE)
        total_feedback = len(messages_with_feedback)
        average_rating = (likes / total_feedback) * 5.0  # Convert to 5-star scale
    else:
        average_rating = 0.0
    
    return MentorStats(
        total_queries=total_queries,
        average_rating=round(average_rating, 2),
        total_content=total_content,
        top_topics=[]  # TODO: Implement topic extraction
    )

# ==================== CHAT ENDPOINTS ====================

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_mentor(
    chat_request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with a mentor's AI bot using RAG"""
    
    if current_user["user_type"] != "user":
        raise HTTPException(status_code=403, detail="Only medical subscribers can chat")
    
    # Get mentor info
    mentor = await db.mentors.find_one({"_id": chat_request.mentor_id})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Get or create conversation
    if chat_request.conversation_id:
        conversation = await db.conversations.find_one({"_id": chat_request.conversation_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = chat_request.conversation_id
    else:
        # Create new conversation
        conversation_id = str(uuid.uuid4())
        conversation_doc = {
            "_id": conversation_id,
            "user_id": current_user["user_id"],
            "mentor_id": chat_request.mentor_id,
            "title": chat_request.question[:50] + "...",  # First question as title
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.conversations.insert_one(conversation_doc)
    
    # Anonymize user's question for LGPD/HIPAA compliance
    anonymization_result = anonymization_service.anonymize_text(
        chat_request.question, 
        conversation_id=conversation_id
    )
    
    logger.info(f"Anonymization applied: {len(anonymization_result.get('replacements', []))} PII entities removed")
    
    # Save user's message (ANONYMIZED for compliance)
    user_message_id = str(uuid.uuid4())
    user_message_doc = {
        "_id": user_message_id,
        "conversation_id": conversation_id,
        "sender_type": SenderType.USER,
        "content": anonymization_result["anonymized_text"],  # STORE ANONYMIZED VERSION
        "original_content_hash": hash(chat_request.question),  # For integrity verification only
        "citations": [],
        "feedback": FeedbackType.NONE,
        "sent_at": datetime.utcnow()
    }
    await db.messages.insert_one(user_message_doc)
    
    # Generate embedding for the question (use ORIGINAL for better context)
    try:
        question_embedding = await multi_ai_rag_service.generate_embedding(
            anonymization_result["original_text"]  # Use original for better AI understanding
        )
    except Exception as embedding_error:
        logger.error(f"Embedding generation failed: {embedding_error}")
        raise HTTPException(
            status_code=503,
            detail="Serviço de geração de embeddings temporariamente indisponível. Por favor, tente novamente em alguns instantes."
        )
    
    # Search for relevant content chunks
    chunks = await db.content_chunks.find({
        "mentor_id": chat_request.mentor_id
    }).to_list(1000)
    
    if not chunks:
        # No content available for this mentor - NEVER call AI
        response_text = f"Desculpe, mas Dr(a). {mentor['full_name']} ainda não possui conteúdo disponível em sua base de conhecimento. Por favor, entre em contato com o mentor ou tente novamente mais tarde."
        citations = []
        ai_used = "none"
    else:
        # Get embeddings and perform similarity search with minimum threshold
        chunk_embeddings = [chunk["embedding"] for chunk in chunks]
        top_indices, similarity_scores = multi_ai_rag_service.cosine_similarity_search(
            question_embedding, 
            chunk_embeddings, 
            top_k=5,
            min_similarity=0.45  # Minimum 45% similarity required (increased from 30% to reduce hallucinations)
        )
        
        # Check if we have relevant chunks
        if not top_indices:
            # No relevant chunks found - don't call AI
            response_text = f"Desculpe, mas não encontrei informações relevantes sobre esse tópico na base de conhecimento do(a) Dr(a). {mentor['full_name']}. Por favor, faça uma pergunta sobre um assunto que esteja nos materiais compartilhados pelo mentor."
            citations = []
            ai_used = "none"
            logger.info(f"No relevant chunks found (all below 0.3 similarity threshold)")
        else:
            # Get top chunks
            top_chunks = [
                {
                    "content_id": chunks[i]["content_id"],
                    "title": chunks[i]["title"],
                    "text": chunks[i]["text"]
                }
                for i in top_indices
            ]
            
            logger.info(f"Found {len(top_chunks)} relevant chunks with similarities: {[f'{s:.2f}' for s in similarity_scores]}")
            
            # Get mentor's AI agent profile
            mentor_profile = None
            if mentor.get("agent_profile"):
                # Generate full system prompt with personality
                mentor_profile = mentor_profile_service.generate_system_prompt(
                    mentor_profile={
                        "profile_text": mentor["agent_profile"],
                        "style_traits": mentor.get("style_traits", "")
                    },
                    mentor_name=mentor["full_name"],
                    mentor_specialty=mentor["specialty"]
                )
            
            # Generate RAG response with personalized agent
            response_text, citations, ai_used = await multi_ai_rag_service.generate_rag_response(
                question=chat_request.question,
                context_chunks=top_chunks,
                mentor_name=mentor["full_name"],
                mentor_profile=mentor_profile,
                preferred_ai="openai"  # Start with OpenAI, will fallback to Claude if needed
            )
            
            logger.info(f"Chat response generated using {ai_used}")
    
    # Clean up [source_N] citation tags from visible response text
    # (Citations are already extracted as structured data in the 'citations' list)
    import re as re_mod
    response_text = re_mod.sub(r'\[source_\d+\]', '', response_text)
    response_text = re_mod.sub(r'\s{2,}', ' ', response_text)  # Clean double spaces
    response_text = response_text.strip()
    
    # Save bot's response
    bot_message_id = str(uuid.uuid4())
    bot_message_doc = {
        "_id": bot_message_id,
        "conversation_id": conversation_id,
        "sender_type": SenderType.MENTOR_BOT,
        "content": response_text,
        "citations": citations,
        "feedback": FeedbackType.NONE,
        "sent_at": datetime.utcnow()
    }
    await db.messages.insert_one(bot_message_doc)
    
    # Update conversation timestamp
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": {"updated_at": datetime.utcnow()}}
    )
    
    return ChatResponse(
        conversation_id=conversation_id,
        message_id=bot_message_id,
        response=response_text,
        citations=[Citation(**c) for c in citations],
        mentor_name=mentor["full_name"]
    )

@api_router.get("/conversations", response_model=List[ConversationItem])
async def list_conversations(current_user: dict = Depends(get_current_user)):
    """List all conversations for current user"""
    
    if current_user["user_type"] != "user":
        raise HTTPException(status_code=403, detail="Access denied")
    
    conversations = await db.conversations.find(
        {"user_id": current_user["user_id"]}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        # Get mentor info
        mentor = await db.mentors.find_one({"_id": conv["mentor_id"]})
        
        # Get last message
        last_message = await db.messages.find_one(
            {"conversation_id": conv["_id"]},
            sort=[("sent_at", -1)]
        )
        
        result.append(ConversationItem(
            id=conv["_id"],
            mentor_id=conv["mentor_id"],
            mentor_name=mentor["full_name"] if mentor else "Unknown",
            mentor_avatar=mentor.get("avatar_url") if mentor else None,
            title=conv["title"],
            last_message=last_message["content"][:100] if last_message else "",
            created_at=conv["created_at"],
            updated_at=conv["updated_at"]
        ))
    
    return result

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageItem])
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages in a conversation"""
    
    # Verify conversation belongs to user
    conversation = await db.conversations.find_one({"_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if current_user["user_type"] == "user" and conversation["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("sent_at", 1).to_list(1000)
    
    return [
        MessageItem(
            id=msg["_id"],
            sender_type=msg["sender_type"],
            content=re.sub(r'\[source_\d+\]', '', re.sub(r'\[PACIENTE_\d+\]', 'paciente', msg["content"])).strip(),
            citations=[Citation(**c) for c in msg.get("citations", [])],
            feedback=msg.get("feedback", FeedbackType.NONE),
            sent_at=msg["sent_at"]
        )
        for msg in messages
    ]


@api_router.post("/conversations/{conversation_id}/summarize")
async def summarize_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate SOAP clinical summary from conversation"""
    
    # Verify conversation exists and belongs to user
    conversation = await db.conversations.find_one({"_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if current_user["user_type"] == "user" and conversation["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all messages in conversation
    messages = await db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("sent_at", 1).to_list(1000)
    
    if len(messages) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Conversa muito curta para gerar resumo. São necessárias pelo menos 2 mensagens."
        )
    
    # Get mentor info
    mentor_id = conversation["mentor_id"]
    mentor = await db.mentors.find_one({"_id": mentor_id})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Prepare messages for summarization (clean up any legacy tags)
    msg_list = []
    for msg in messages:
        content = msg["content"]
        # Clean legacy [source_N] and [PACIENTE_N] tags from stored messages
        content = re.sub(r'\[source_\d+\]', '', content)
        content = re.sub(r'\[PACIENTE_\d+\]', 'paciente', content)
        content = re.sub(r'\[LOCAL_\d+\]', 'local', content)
        content = re.sub(r'\[INSTITUIÇÃO_\d+\]', 'instituição', content)
        content = re.sub(r'\s{2,}', ' ', content).strip()
        msg_list.append({
            "sender_type": msg["sender_type"],
            "content": content
        })
    
    # Generate SOAP summary
    try:
        soap_summary = await multi_ai_rag_service.summarize_conversation_to_soap(
            messages=msg_list,
            mentor_name=mentor["full_name"]
        )
        
        logger.info(f"SOAP summary generated for conversation {conversation_id}")
        
        return {
            "conversation_id": conversation_id,
            "soap_summary": soap_summary,
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error generating SOAP summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar resumo SOAP: {str(e)}"
        )

@api_router.post("/messages/{message_id}/feedback")
async def update_message_feedback(
    message_id: str,
    feedback: FeedbackType,
    current_user: dict = Depends(get_current_user)
):
    """Update feedback (like/dislike) for a message"""
    
    message = await db.messages.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.messages.update_one(
        {"_id": message_id},
        {"$set": {"feedback": feedback}}
    )
    
    return {"message": "Feedback updated successfully"}

# ==================== AUDIO TRANSCRIPTION ====================

@api_router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Transcribe audio to text using OpenAI Whisper"""
    
    # Validate file type
    allowed_types = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/flac', 'application/octet-stream']
    if audio.content_type and audio.content_type not in allowed_types:
        logger.warning(f"Rejected audio type: {audio.content_type}")
    
    # Read audio content
    audio_content = await audio.read()
    
    if len(audio_content) == 0:
        raise HTTPException(status_code=400, detail="Arquivo de áudio vazio")
    
    if len(audio_content) > 25 * 1024 * 1024:  # 25MB limit (Whisper API limit)
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo: 25MB")
    
    logger.info(f"Transcribing audio: size={len(audio_content)} bytes, type={audio.content_type}, filename={audio.filename}")
    
    try:
        from openai import OpenAI
        
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        client_openai = OpenAI(api_key=openai_key)
        
        # Determine file extension from content type or filename
        ext_map = {
            'audio/webm': 'webm',
            'audio/wav': 'wav',
            'audio/mp3': 'mp3',
            'audio/mpeg': 'mp3',
            'audio/mp4': 'mp4',
            'audio/m4a': 'm4a',
            'audio/ogg': 'ogg',
            'audio/flac': 'flac',
        }
        ext = ext_map.get(audio.content_type, 'webm')
        filename = audio.filename or f"audio.{ext}"
        
        # Create a file-like object for the API
        audio_file = io.BytesIO(audio_content)
        audio_file.name = filename
        
        whisper_model = os.environ.get('WHISPER_MODEL', 'whisper-1')
        
        transcript = client_openai.audio.transcriptions.create(
            model=whisper_model,
            file=audio_file,
            language="pt",  # Portuguese
            response_format="text"
        )
        
        logger.info(f"Transcription successful: '{transcript[:100]}...' " if len(str(transcript)) > 100 else f"Transcription successful: '{transcript}'")
        
        return {
            "text": transcript.strip() if isinstance(transcript, str) else str(transcript).strip(),
            "language": "pt"
        }
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro na transcrição: {str(e)}"
        )

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "MedMentor API"
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
