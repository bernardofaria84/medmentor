"""Analytics router: impactometer and detailed analytics endpoints."""
import re
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends

from dependencies import db, logger
from models import SenderType, FeedbackType, ContentStatus
from auth_utils import get_current_user
from analytics_service import (
    get_queries_analytics, get_ratings_analytics,
    get_content_analytics, get_feedback_details_analytics,
)

router = APIRouter(tags=["analytics"])


@router.get("/mentor/analytics/queries")
async def get_queries_analytics_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_queries_analytics(db, current_user["user_id"])


@router.get("/mentor/analytics/ratings")
async def get_ratings_analytics_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_ratings_analytics(db, current_user["user_id"])


@router.get("/mentor/analytics/content")
async def get_content_analytics_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_content_analytics(db, current_user["user_id"])


@router.get("/mentor/analytics/feedback-details")
async def get_feedback_details_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_feedback_details_analytics(db, current_user["user_id"])


@router.get("/mentor/impactometer")
async def get_impactometer(current_user: dict = Depends(get_current_user)):
    """Get comprehensive Impactometer dashboard data"""
    if current_user["user_type"] != "mentor":
        raise HTTPException(status_code=403, detail="Access denied")

    mentor_id = current_user["user_id"]

    conversations = await db.conversations.find(
        {"mentor_id": mentor_id}, {"_id": 1, "user_id": 1}
    ).to_list(1000)
    cids = [c["_id"] for c in conversations]

    bot_messages = await db.messages.find({
        "conversation_id": {"$in": cids},
        "sender_type": SenderType.MENTOR_BOT,
    }, {"sent_at": 1, "feedback": 1}).sort("sent_at", -1).to_list(5000)

    user_messages = await db.messages.find({
        "conversation_id": {"$in": cids},
        "sender_type": SenderType.USER,
    }, {"sent_at": 1, "content": 1}).sort("sent_at", -1).to_list(5000)

    # Queries per day (last 30 days)
    daily_queries: dict[str, int] = defaultdict(int)
    for msg in bot_messages:
        day = msg["sent_at"].strftime("%Y-%m-%d")
        daily_queries[day] += 1

    today = datetime.utcnow().date()
    queries_timeline = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        queries_timeline.append({
            "date": d,
            "label": (today - timedelta(days=i)).strftime("%d/%m"),
            "count": daily_queries.get(d, 0),
        })

    # Feedback
    likes = sum(1 for m in bot_messages if m.get("feedback") == FeedbackType.LIKE)
    dislikes = sum(1 for m in bot_messages if m.get("feedback") == FeedbackType.DISLIKE)
    total_feedback = likes + dislikes

    # Hot topics
    stop_words = {
        "de", "da", "do", "a", "o", "e", "em", "para", "que", "um", "uma",
        "os", "as", "no", "na", "por", "com", "se", "ao", "dos", "das",
        "como", "qual", "quais", "sobre", "entre", "mais", "pode", "sua",
        "seu", "meu", "minha", "quero", "saber", "favor", "obrigado",
        "olá", "oi", "bom", "dia", "boa", "tarde", "noite", "dr", "dra",
        "doutor", "doutora", "me", "fale", "explique", "poderia",
        "gostaria", "preciso", "é", "são",
    }
    word_counts: dict[str, int] = defaultdict(int)
    for msg in user_messages:
        words = re.findall(r'\b[a-záàâãéèêíïóôõöúçñ]{4,}\b', msg.get("content", "").lower())
        for w in words:
            if w not in stop_words:
                word_counts[w] += 1
    hot_topics = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:20]

    unique_users = {c.get("user_id", "") for c in conversations}

    total_content = await db.mentor_content.count_documents({
        "mentor_id": mentor_id, "status": ContentStatus.COMPLETED,
    })

    like_rate = round(likes / total_feedback * 100, 1) if total_feedback > 0 else 0

    return {
        "total_queries": len(bot_messages),
        "total_users": len(unique_users),
        "total_conversations": len(conversations),
        "total_content": total_content,
        "likes": likes,
        "dislikes": dislikes,
        "like_rate": like_rate,
        "queries_timeline": queries_timeline,
        "hot_topics": [{"word": w, "count": c} for w, c in hot_topics],
        "recent_queries": [
            {"question": msg.get("content", "")[:100], "sent_at": msg["sent_at"].isoformat()}
            for msg in user_messages[:10]
        ],
    }
