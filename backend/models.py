from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class ContentType(str, Enum):
    PDF = "PDF"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    TEXT = "TEXT"

class ContentStatus(str, Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"

class SenderType(str, Enum):
    USER = "USER"
    MENTOR_BOT = "MENTOR_BOT"

class FeedbackType(str, Enum):
    LIKE = "LIKE"
    DISLIKE = "DISLIKE"
    NONE = "NONE"

# Request/Response Models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    crm: str
    specialty: Optional[str] = None

class MentorSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    specialty: str
    bio: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    user_type: str  # "user" or "mentor"

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    crm: str
    specialty: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: datetime

class MentorProfile(BaseModel):
    id: str
    email: str
    full_name: str
    specialty: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    agent_profile: Optional[str] = None  # AI agent personality profile
    style_traits: Optional[str] = None   # Quick summary of communication style
    created_at: datetime

class MentorListItem(BaseModel):
    id: str
    full_name: str
    specialty: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class ChatRequest(BaseModel):
    mentor_id: str
    question: str
    conversation_id: Optional[str] = None

class Citation(BaseModel):
    source_id: str
    title: str
    excerpt: str

class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    citations: List[Citation]
    mentor_name: str

class MessageItem(BaseModel):
    id: str
    sender_type: SenderType
    content: str
    citations: List[Citation] = []
    feedback: FeedbackType = FeedbackType.NONE
    sent_at: datetime

class ConversationItem(BaseModel):
    id: str
    mentor_id: str
    mentor_name: str
    mentor_avatar: Optional[str] = None
    title: str
    last_message: str
    created_at: datetime
    updated_at: datetime

class ContentUploadResponse(BaseModel):
    content_id: str
    title: str
    status: ContentStatus
    message: str

class ContentItem(BaseModel):
    id: str
    title: str
    content_type: ContentType
    status: ContentStatus
    uploaded_at: datetime

class MentorStats(BaseModel):
    total_queries: int
    average_rating: float
    total_content: int
    top_topics: List[str]

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None
