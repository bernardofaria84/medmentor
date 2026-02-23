"""Chat router: chat, conversations, SOAP, feedback, search, transcription."""
import re
import io
import os
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends

from dependencies import db, logger
from models import (
    ChatRequest, ChatResponse, Citation, MessageItem, ConversationItem,
    SenderType, FeedbackType,
)
from auth_utils import get_current_user
from exceptions import ResponseValidationError

# Lazy-loaded services
rag_service = None
profile_service = None
anonymization_svc = None

router = APIRouter(tags=["chat"])


def _init_services(rag_svc, prof_svc, anon_svc):
    global rag_service, profile_service, anonymization_svc
    rag_service = rag_svc
    profile_service = prof_svc
    anonymization_svc = anon_svc


def validate_rag_response(response_text: str, citations: list) -> bool:
    source_refs = re.findall(r'\[source_(\d+)\]', response_text)
    if citations and len(citations) > 0 and len(source_refs) == 0:
        raise ResponseValidationError(
            message="Response has no citation references despite available sources",
            response_text=response_text, citations=citations,
        )
    if source_refs:
        max_ref = max(int(r) for r in source_refs)
        if max_ref > len(citations) + 2:
            raise ResponseValidationError(
                message=f"Response references more sources than available: {max_ref} > {len(citations)}",
                response_text=response_text, citations=citations,
            )
    return True


# ---------- universal search ----------

@router.get("/search/universal")
async def universal_search(q: str, current_user: dict = Depends(get_current_user)):
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="A busca deve ter pelo menos 3 caracteres")
    query = q.strip()
    logger.info(f"Universal search: '{query}' by user {current_user['user_id']}")
    try:
        from models import ContentStatus
        query_embedding = rag_service.generate_embedding(query)
        all_content = await db.mentor_content.find(
            {"status": ContentStatus.COMPLETED},
            {"mentor_id": 1, "filename": 1, "chunks": 1},
        ).limit(100).to_list(100)
        if not all_content:
            return {"results": [], "query": query, "total_results": 0}
        all_chunks, chunk_meta = [], []
        for content in all_content:
            mid = content["mentor_id"]
            ct = content.get("filename", "Conteudo")
            for chunk in content.get("chunks", []):
                if chunk.get("embedding"):
                    all_chunks.append(chunk["embedding"])
                    chunk_meta.append({"text": chunk["text"], "mentor_id": mid, "content_title": ct})
        if not all_chunks:
            return {"results": [], "query": query, "total_results": 0}
        indices, scores = rag_service.cosine_similarity_search(query_embedding, all_chunks, top_k=15, min_similarity=0.35)
        mentor_results = {}
        for idx, score in zip(indices, scores):
            m = chunk_meta[idx]
            mid = m["mentor_id"]
            if mid not in mentor_results:
                mentor_results[mid] = {"mentor_id": mid, "mentor_name": "", "specialty": "", "best_score": 0, "excerpts": []}
            mentor_results[mid]["excerpts"].append({"text": m["text"][:300], "score": round(float(score), 3), "content_title": m["content_title"]})
            if float(score) > mentor_results[mid]["best_score"]:
                mentor_results[mid]["best_score"] = round(float(score), 3)
        for mid, result in mentor_results.items():
            mentor = await db.mentors.find_one({"_id": mid})
            if mentor:
                result["mentor_name"] = mentor["full_name"]
                result["specialty"] = mentor["specialty"]
            result["excerpts"] = sorted(result["excerpts"], key=lambda x: x["score"], reverse=True)[:3]
        sorted_results = sorted(mentor_results.values(), key=lambda x: x["best_score"], reverse=True)
        return {"results": sorted_results, "query": query, "total_results": len(sorted_results)}
    except Exception as e:
        logger.error(f"Universal search error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na busca: {str(e)}")


# ---------- chat ----------

@router.post("/chat", response_model=ChatResponse)
async def chat_with_mentor(chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "user":
        raise HTTPException(status_code=403, detail="Only medical subscribers can chat")
    mentor = await db.mentors.find_one({"_id": chat_request.mentor_id})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    ps = mentor.get("profile_status", "INACTIVE")
    if ps == "INACTIVE":
        raise HTTPException(status_code=400, detail="O bot de IA deste mentor esta inativo.")
    elif ps == "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="O perfil do bot esta aguardando aprovacao.")

    if chat_request.conversation_id:
        conv = await db.conversations.find_one({"_id": chat_request.conversation_id})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = chat_request.conversation_id
    else:
        conversation_id = str(uuid.uuid4())
        await db.conversations.insert_one({
            "_id": conversation_id, "user_id": current_user["user_id"],
            "mentor_id": chat_request.mentor_id,
            "title": chat_request.question[:50] + "...",
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        })

    anon = anonymization_svc.anonymize_text(chat_request.question, conversation_id=conversation_id)
    await db.messages.insert_one({
        "_id": str(uuid.uuid4()), "conversation_id": conversation_id,
        "sender_type": SenderType.USER, "content": anon["anonymized_text"],
        "original_content_hash": hash(chat_request.question),
        "citations": [], "feedback": FeedbackType.NONE, "sent_at": datetime.utcnow(),
    })

    try:
        question_embedding = await rag_service.generate_embedding(anon["original_text"])
    except Exception:
        raise HTTPException(status_code=503, detail="Servico de embeddings temporariamente indisponivel.")

    chunks = await db.content_chunks.find(
        {"mentor_id": chat_request.mentor_id},
        {"embedding": 1, "text": 1, "content_id": 1, "title": 1},
    ).limit(500).to_list(500)

    if not chunks:
        response_text = f"Desculpe, mas Dr(a). {mentor['full_name']} ainda nao possui conteudo disponivel."
        citations, ai_used = [], "none"
    else:
        chunk_embeddings = [c["embedding"] for c in chunks]
        top_indices, sim_scores = rag_service.cosine_similarity_search(question_embedding, chunk_embeddings, top_k=5, min_similarity=0.45)
        if not top_indices:
            response_text = f"Desculpe, nao encontrei informacoes relevantes na base do(a) Dr(a). {mentor['full_name']}."
            citations, ai_used = [], "none"
        else:
            top_chunks = [{"content_id": chunks[i]["content_id"], "title": chunks[i]["title"], "text": chunks[i]["text"]} for i in top_indices]
            mentor_profile = None
            if mentor.get("agent_profile"):
                mentor_profile = profile_service.generate_system_prompt(
                    mentor_profile={"profile_text": mentor["agent_profile"], "style_traits": mentor.get("style_traits", "")},
                    mentor_name=mentor["full_name"], mentor_specialty=mentor["specialty"],
                )
            response_text, citations, ai_used = await rag_service.generate_rag_response(
                question=chat_request.question, context_chunks=top_chunks,
                mentor_name=mentor["full_name"], mentor_profile=mentor_profile, preferred_ai="openai",
            )

    try:
        validate_rag_response(response_text, citations)
    except ResponseValidationError:
        response_text = "Desculpe, ocorreu um erro ao processar a resposta. Por favor, tente novamente."
        citations = []

    response_text = re.sub(r'\[source_\d+\]', '', response_text)
    response_text = re.sub(r'\s{2,}', ' ', response_text).strip()

    bot_message_id = str(uuid.uuid4())
    await db.messages.insert_one({
        "_id": bot_message_id, "conversation_id": conversation_id,
        "sender_type": SenderType.MENTOR_BOT, "content": response_text,
        "citations": citations, "feedback": FeedbackType.NONE, "sent_at": datetime.utcnow(),
    })
    await db.conversations.update_one({"_id": conversation_id}, {"$set": {"updated_at": datetime.utcnow()}})
    return ChatResponse(
        conversation_id=conversation_id, message_id=bot_message_id,
        response=response_text, citations=[Citation(**c) for c in citations],
        mentor_name=mentor["full_name"],
    )


# ---------- conversations ----------

@router.get("/conversations", response_model=List[ConversationItem])
async def list_conversations(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "user":
        raise HTTPException(status_code=403, detail="Access denied")
    conversations = await db.conversations.find(
        {"user_id": current_user["user_id"]}
    ).sort("updated_at", -1).to_list(100)
    result = []
    for conv in conversations:
        mentor = await db.mentors.find_one({"_id": conv["mentor_id"]})
        last_msg = await db.messages.find_one({"conversation_id": conv["_id"]}, sort=[("sent_at", -1)])
        result.append(ConversationItem(
            id=conv["_id"], mentor_id=conv["mentor_id"],
            mentor_name=mentor["full_name"] if mentor else "Unknown",
            mentor_avatar=mentor.get("avatar_url") if mentor else None,
            title=conv["title"], last_message=last_msg["content"][:100] if last_msg else "",
            created_at=conv["created_at"], updated_at=conv["updated_at"],
        ))
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageItem])
async def get_conversation_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"_id": conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user["user_type"] == "user" and conv["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    messages = await db.messages.find({"conversation_id": conversation_id}).sort("sent_at", 1).to_list(1000)
    return [
        MessageItem(
            id=msg["_id"], sender_type=msg["sender_type"],
            content=re.sub(r'\[source_\d+\]', '', re.sub(r'\[PACIENTE_\d+\]', 'paciente', msg["content"])).strip(),
            citations=[Citation(**c) for c in msg.get("citations", [])],
            feedback=msg.get("feedback", FeedbackType.NONE), sent_at=msg["sent_at"],
        )
        for msg in messages
    ]


# ---------- SOAP ----------

@router.post("/conversations/{conversation_id}/summarize")
async def summarize_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"_id": conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user["user_type"] == "user" and conv["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    messages = await db.messages.find({"conversation_id": conversation_id}).sort("sent_at", 1).to_list(1000)
    if len(messages) < 2:
        raise HTTPException(status_code=400, detail="Conversa muito curta para gerar resumo.")
    mentor = await db.mentors.find_one({"_id": conv["mentor_id"]})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    msg_list = []
    for msg in messages:
        content = re.sub(r'\[source_\d+\]', '', msg["content"])
        content = re.sub(r'\[PACIENTE_\d+\]', 'paciente', content)
        content = re.sub(r'\[LOCAL_\d+\]', 'local', content)
        content = re.sub(r'\s{2,}', ' ', content).strip()
        msg_list.append({"sender_type": msg["sender_type"], "content": content})
    try:
        soap = await rag_service.summarize_conversation_to_soap(messages=msg_list, mentor_name=mentor["full_name"])
        return {"conversation_id": conversation_id, "soap_summary": soap, "generated_at": datetime.utcnow()}
    except Exception as e:
        logger.error(f"Error generating SOAP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar resumo SOAP: {str(e)}")


# ---------- feedback ----------

@router.post("/messages/{message_id}/feedback")
async def update_message_feedback(message_id: str, feedback: FeedbackType, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    await db.messages.update_one({"_id": message_id}, {"$set": {"feedback": feedback}})
    try:
        conv = await db.conversations.find_one({"_id": message["conversation_id"]})
        question_text = ""
        if message["sender_type"] == SenderType.MENTOR_BOT:
            prev = await db.messages.find_one(
                {"conversation_id": message["conversation_id"], "sender_type": SenderType.USER, "sent_at": {"$lt": message["sent_at"]}},
                sort=[("sent_at", -1)],
            )
            if prev:
                question_text = prev.get("content", "")
        await db.feedback_logs.insert_one({
            "_id": str(uuid.uuid4()), "message_id": message_id,
            "conversation_id": message["conversation_id"],
            "mentor_id": conv["mentor_id"] if conv else "unknown",
            "user_id": current_user["user_id"], "feedback_type": feedback,
            "feedback_at": datetime.utcnow(), "question": question_text,
            "response_text": message.get("content", ""),
            "context_chunks_ids": [c.get("source_id", "") for c in message.get("citations", [])],
            "ai_used": message.get("ai_used", "unknown"),
        })
    except Exception as e:
        logger.error(f"Error creating feedback log: {e}")
    return {"message": "Feedback updated successfully"}


# ---------- transcription ----------

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/flac', 'application/octet-stream']
    if audio.content_type and audio.content_type not in allowed:
        logger.warning(f"Rejected audio type: {audio.content_type}")
    content = await audio.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Arquivo de audio vazio")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Maximo: 25MB")
    try:
        from openai import OpenAI
        key = os.environ.get('OPENAI_API_KEY')
        if not key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        client = OpenAI(api_key=key)
        ext_map = {'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/mp3': 'mp3', 'audio/mpeg': 'mp3', 'audio/mp4': 'mp4', 'audio/m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/flac': 'flac'}
        ext = ext_map.get(audio.content_type, 'webm')
        audio_file = io.BytesIO(content)
        audio_file.name = audio.filename or f"audio.{ext}"
        transcript = client.audio.transcriptions.create(model=os.environ.get('WHISPER_MODEL', 'whisper-1'), file=audio_file, language="pt", response_format="text")
        return {"text": transcript.strip() if isinstance(transcript, str) else str(transcript).strip(), "language": "pt"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro na transcricao: {str(e)}")
