"""
Analytics service for mentor dashboard
"""
from datetime import datetime, timedelta
from typing import List, Dict
from collections import Counter
import re

async def get_queries_analytics(db, mentor_id: str) -> Dict:
    """Get detailed analytics for queries/consultations"""
    
    # Get all conversations for this mentor
    conversations = await db.conversations.find(
        {"mentor_id": mentor_id}
    ).to_list(1000)
    
    conversation_ids = [c["_id"] for c in conversations]
    
    # Get all bot messages (responses)
    messages = await db.messages.find({
        "conversation_id": {"$in": conversation_ids},
        "sender_type": "MENTOR_BOT"
    }).to_list(10000)
    
    # Calculate daily queries for last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_queries = {}
    
    for msg in messages:
        msg_date = msg["sent_at"].date()
        if msg["sent_at"] >= thirty_days_ago:
            date_str = msg_date.strftime("%Y-%m-%d")
            daily_queries[date_str] = daily_queries.get(date_str, 0) + 1
    
    # Fill missing dates with 0
    current_date = thirty_days_ago.date()
    end_date = datetime.utcnow().date()
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        if date_str not in daily_queries:
            daily_queries[date_str] = 0
        current_date += timedelta(days=1)
    
    # Sort by date
    sorted_daily = sorted(daily_queries.items())
    
    # Get hourly distribution
    hourly_distribution = [0] * 24
    for msg in messages:
        hour = msg["sent_at"].hour
        hourly_distribution[hour] += 1
    
    # Get recent queries with preview
    recent_queries = []
    recent_messages = sorted(messages, key=lambda x: x["sent_at"], reverse=True)[:10]
    
    for msg in recent_messages:
        # Find the corresponding user question
        conv_messages = await db.messages.find({
            "conversation_id": msg["conversation_id"],
            "sent_at": {"$lt": msg["sent_at"]}
        }).sort("sent_at", -1).limit(1).to_list(1)
        
        if conv_messages:
            recent_queries.append({
                "date": msg["sent_at"].isoformat(),
                "question": conv_messages[0]["content"][:100] + "..." if len(conv_messages[0]["content"]) > 100 else conv_messages[0]["content"],
                "response_preview": msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
            })
    
    # Calculate growth rate
    last_week = sum(daily_queries.get((datetime.utcnow().date() - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(7))
    previous_week = sum(daily_queries.get((datetime.utcnow().date() - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(7, 14))
    
    growth_rate = 0
    if previous_week > 0:
        growth_rate = ((last_week - previous_week) / previous_week) * 100
    
    return {
        "total_queries": len(messages),
        "daily_data": [{"date": date, "count": count} for date, count in sorted_daily],
        "hourly_distribution": hourly_distribution,
        "recent_queries": recent_queries,
        "weekly_growth": round(growth_rate, 1),
        "last_week_total": last_week,
        "previous_week_total": previous_week
    }

async def get_ratings_analytics(db, mentor_id: str) -> Dict:
    """Get detailed analytics for ratings/feedback"""
    
    # Get all conversations for this mentor
    conversations = await db.conversations.find(
        {"mentor_id": mentor_id}
    ).to_list(1000)
    
    conversation_ids = [c["_id"] for c in conversations]
    
    # Get all bot messages with feedback
    messages = await db.messages.find({
        "conversation_id": {"$in": conversation_ids},
        "sender_type": "MENTOR_BOT"
    }).to_list(10000)
    
    # Calculate feedback distribution
    feedback_counts = {"LIKE": 0, "DISLIKE": 0, "NONE": 0}
    daily_ratings = {}
    best_responses = []
    
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    for msg in messages:
        feedback = msg.get("feedback", "NONE")
        feedback_counts[feedback] += 1
        
        # Daily ratings
        if msg["sent_at"] >= thirty_days_ago:
            date_str = msg["sent_at"].date().strftime("%Y-%m-%d")
            if date_str not in daily_ratings:
                daily_ratings[date_str] = {"likes": 0, "dislikes": 0}
            
            if feedback == "LIKE":
                daily_ratings[date_str]["likes"] += 1
            elif feedback == "DISLIKE":
                daily_ratings[date_str]["dislikes"] += 1
        
        # Best responses (with LIKE feedback)
        if feedback == "LIKE":
            best_responses.append({
                "content": msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"],
                "date": msg["sent_at"].isoformat(),
                "citations_count": len(msg.get("citations", []))
            })
    
    # Sort best responses by date (most recent first)
    best_responses.sort(key=lambda x: x["date"], reverse=True)
    best_responses = best_responses[:10]
    
    # Calculate average rating over time
    sorted_daily = sorted(daily_ratings.items())
    rating_timeline = []
    
    for date, counts in sorted_daily:
        total = counts["likes"] + counts["dislikes"]
        if total > 0:
            avg_rating = (counts["likes"] / total) * 5.0
            rating_timeline.append({"date": date, "rating": round(avg_rating, 2)})
    
    # Calculate percentages
    total_feedback = feedback_counts["LIKE"] + feedback_counts["DISLIKE"]
    like_percentage = 0
    dislike_percentage = 0
    
    if total_feedback > 0:
        like_percentage = (feedback_counts["LIKE"] / total_feedback) * 100
        dislike_percentage = (feedback_counts["DISLIKE"] / total_feedback) * 100
    
    # Calculate current average
    current_avg = 0
    if total_feedback > 0:
        current_avg = (feedback_counts["LIKE"] / total_feedback) * 5.0
    
    return {
        "total_feedbacks": total_feedback,
        "like_count": feedback_counts["LIKE"],
        "dislike_count": feedback_counts["DISLIKE"],
        "like_percentage": round(like_percentage, 1),
        "dislike_percentage": round(dislike_percentage, 1),
        "average_rating": round(current_avg, 2),
        "rating_timeline": rating_timeline,
        "best_responses": best_responses
    }

async def get_content_analytics(db, mentor_id: str) -> Dict:
    """Get detailed analytics for content"""
    
    # Get all content for this mentor
    contents = await db.mentor_content.find(
        {"mentor_id": mentor_id}
    ).sort("uploaded_at", -1).to_list(100)
    
    # Get all chunks to analyze usage
    all_chunks = await db.content_chunks.find(
        {"mentor_id": mentor_id}
    ).to_list(10000)
    
    # Content status distribution
    status_counts = {"COMPLETED": 0, "PROCESSING": 0, "ERROR": 0, "UPLOADING": 0}
    content_details = []
    
    for content in contents:
        status = content.get("status", "UPLOADING")
        status_counts[status] += 1
        
        # Count chunks for this content
        chunks_count = sum(1 for chunk in all_chunks if chunk["content_id"] == content["_id"])
        
        content_details.append({
            "id": content["_id"],
            "title": content["title"],
            "type": content["content_type"],
            "status": status,
            "uploaded_at": content["uploaded_at"].isoformat(),
            "chunks_count": chunks_count
        })
    
    # Upload timeline (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_uploads = {}
    
    for content in contents:
        if content["uploaded_at"] >= thirty_days_ago:
            date_str = content["uploaded_at"].date().strftime("%Y-%m-%d")
            daily_uploads[date_str] = daily_uploads.get(date_str, 0) + 1
    
    # Fill missing dates
    current_date = thirty_days_ago.date()
    end_date = datetime.utcnow().date()
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        if date_str not in daily_uploads:
            daily_uploads[date_str] = 0
        current_date += timedelta(days=1)
    
    sorted_daily = sorted(daily_uploads.items())
    
    # Get most referenced content (by counting chunk usage in conversations)
    # This is a simplified version - in production you'd track actual usage
    content_usage = {}
    for content in contents:
        if content.get("status") == "COMPLETED":
            chunks_count = sum(1 for chunk in all_chunks if chunk["content_id"] == content["_id"])
            content_usage[content["title"]] = chunks_count
    
    # Sort by usage
    top_content = sorted(content_usage.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "total_content": len(contents),
        "status_distribution": status_counts,
        "content_details": content_details,
        "upload_timeline": [{"date": date, "count": count} for date, count in sorted_daily],
        "top_content": [{"title": title, "usage_count": count} for title, count in top_content],
        "total_chunks": len(all_chunks)
    }

async def get_feedback_details_analytics(db, mentor_id: str) -> Dict:
    """
    Get detailed feedback analytics from the feedback_logs collection.
    Provides: top disliked responses, dislike topics, AI correlation.
    """
    
    # Get all feedback logs for this mentor
    feedback_logs = await db.feedback_logs.find(
        {"mentor_id": mentor_id}
    ).sort("feedback_at", -1).to_list(1000)
    
    if not feedback_logs:
        return {
            "total_feedback_logs": 0,
            "like_count": 0,
            "dislike_count": 0,
            "top_disliked_responses": [],
            "dislike_topics": [],
            "ai_correlation": {},
            "recent_feedback": []
        }
    
    # Count by type
    likes = [f for f in feedback_logs if f["feedback_type"] == "LIKE"]
    dislikes = [f for f in feedback_logs if f["feedback_type"] == "DISLIKE"]
    
    # Top 10 disliked responses
    top_disliked = []
    for fl in dislikes[:10]:
        top_disliked.append({
            "question": fl.get("question", "")[:150],
            "response_preview": fl.get("response_text", "")[:200],
            "feedback_at": fl["feedback_at"].isoformat() if fl.get("feedback_at") else "",
            "ai_used": fl.get("ai_used", "unknown")
        })
    
    # Extract topics/keywords from disliked questions
    dislike_words = []
    stop_words = {"de", "da", "do", "a", "o", "e", "em", "para", "que", "um", "uma", "os", "as", "no", "na", "é", "são", "por", "com", "se", "ao", "dos", "das", "como", "qual", "quais", "sobre", "entre", "mais", "pode", "sua", "seu", "meu", "minha"}
    for fl in dislikes:
        question = fl.get("question", "")
        words = re.findall(r'\b[a-záàâãéèêíïóôõöúçñ]{4,}\b', question.lower())
        dislike_words.extend([w for w in words if w not in stop_words])
    
    word_counts = Counter(dislike_words)
    dislike_topics = [{"topic": word, "count": count} for word, count in word_counts.most_common(15)]
    
    # AI correlation: which AI gets more dislikes?
    ai_stats = {}
    for fl in feedback_logs:
        ai = fl.get("ai_used", "unknown")
        if ai not in ai_stats:
            ai_stats[ai] = {"likes": 0, "dislikes": 0}
        if fl["feedback_type"] == "LIKE":
            ai_stats[ai]["likes"] += 1
        elif fl["feedback_type"] == "DISLIKE":
            ai_stats[ai]["dislikes"] += 1
    
    # Recent feedback (last 20)
    recent_feedback = []
    for fl in feedback_logs[:20]:
        recent_feedback.append({
            "feedback_type": fl["feedback_type"],
            "question": fl.get("question", "")[:100],
            "response_preview": fl.get("response_text", "")[:100],
            "feedback_at": fl["feedback_at"].isoformat() if fl.get("feedback_at") else "",
            "ai_used": fl.get("ai_used", "unknown")
        })
    
    return {
        "total_feedback_logs": len(feedback_logs),
        "like_count": len(likes),
        "dislike_count": len(dislikes),
        "top_disliked_responses": top_disliked,
        "dislike_topics": dislike_topics,
        "ai_correlation": ai_stats,
        "recent_feedback": recent_feedback
    }
