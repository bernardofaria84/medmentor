"""
MedMentor API - main application entry point.
All business logic lives in routers/.
"""
from datetime import datetime
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from dependencies import db, close_db, logger

# Services (initialized once)
from multi_ai_rag_service import MultiAIRAGService
from mentor_profile_service import MentorProfileService
import anonymization_service

multi_ai_rag_service = MultiAIRAGService()
mentor_profile_service = MentorProfileService()

# Import routers
from routers import auth, users, mentors, chat, analytics

# Inject shared services into routers that need them
mentors._init_services(multi_ai_rag_service, mentor_profile_service)
chat._init_services(multi_ai_rag_service, mentor_profile_service, anonymization_service)

# FastAPI app
app = FastAPI(title="MedMentor API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Top-level router with /api prefix
api_router = APIRouter(prefix="/api")

# Health check
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "MedMentor API",
    }

# Mount sub-routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(mentors.router)
api_router.include_router(chat.router)
api_router.include_router(analytics.router)

app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    close_db()
