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
            
            # Process content through RAG service (chunking + embeddings)
            chunks_processed = await rag_service.process_pdf_content(
                pdf_text=pdf_text,
                mentor_id=current_user["user_id"],
                content_id=content_id,
                title=title,
                db=db
            )
            
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
    
    # Save user's message
    user_message_id = str(uuid.uuid4())
    user_message_doc = {
        "_id": user_message_id,
        "conversation_id": conversation_id,
        "sender_type": SenderType.USER,
        "content": chat_request.question,
        "citations": [],
        "feedback": FeedbackType.NONE,
        "sent_at": datetime.utcnow()
    }
    await db.messages.insert_one(user_message_doc)
    
    # Generate embedding for the question
    question_embedding = await rag_service.generate_embedding(chat_request.question)
    
    # Search for relevant content chunks
    chunks = await db.content_chunks.find({
        "mentor_id": chat_request.mentor_id
    }).to_list(1000)
    
    if not chunks:
        # No content available for this mentor
        response_text = f"I apologize, but Dr. {mentor['full_name']} hasn't uploaded any content yet. Please check back later or contact the mentor directly."
        citations = []
    else:
        # Get embeddings and perform similarity search
        chunk_embeddings = [chunk["embedding"] for chunk in chunks]
        top_indices = rag_service.cosine_similarity_search(
            question_embedding, 
            chunk_embeddings, 
            top_k=5
        )
        
        # Get top chunks
        top_chunks = [
            {
                "content_id": chunks[i]["content_id"],
                "title": chunks[i]["title"],
                "text": chunks[i]["text"]
            }
            for i in top_indices
        ]
        
        # Generate RAG response
        response_text, citations = await rag_service.generate_rag_response(
            question=chat_request.question,
            context_chunks=top_chunks,
            mentor_name=mentor["full_name"]
        )
    
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
            content=msg["content"],
            citations=[Citation(**c) for c in msg.get("citations", [])],
            feedback=msg.get("feedback", FeedbackType.NONE),
            sent_at=msg["sent_at"]
        )
        for msg in messages
    ]

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
