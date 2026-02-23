"""Tests for chat, conversations, and search endpoints."""
import pytest
from httpx import AsyncClient
from tests.conftest import auth_header
from dependencies import db


@pytest.mark.asyncio
class TestConversations:
    async def test_list_conversations_empty(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/conversations", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_mentor_cannot_list_conversations(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/conversations", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestChat:
    async def test_chat_with_inactive_mentor(self, async_client: AsyncClient, registered_user, registered_mentor):
        """Chat should fail if mentor bot is inactive."""
        resp = await async_client.post("/api/chat", headers=auth_header(registered_user["token"]), json={
            "mentor_id": registered_mentor["user_id"],
            "question": "O que e insuficiencia cardiaca?",
        })
        assert resp.status_code == 400
        assert "inativo" in resp.json()["detail"].lower()

    async def test_chat_with_nonexistent_mentor(self, async_client: AsyncClient, registered_user):
        resp = await async_client.post("/api/chat", headers=auth_header(registered_user["token"]), json={
            "mentor_id": "nonexistent-mentor-id",
            "question": "Pergunta qualquer",
        })
        assert resp.status_code == 404

    async def test_mentor_cannot_chat(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.post("/api/chat", headers=auth_header(registered_mentor["token"]), json={
            "mentor_id": registered_mentor["user_id"],
            "question": "Teste",
        })
        assert resp.status_code == 403

    async def test_chat_with_active_mentor_no_content(self, async_client: AsyncClient, registered_user, registered_mentor):
        """An active mentor with no content should respond with a 'no content' message."""
        await db.mentors.update_one(
            {"_id": registered_mentor["user_id"]},
            {"$set": {"profile_status": "ACTIVE", "agent_profile": "Sou um bot de cardiologia."}}
        )
        resp = await async_client.post("/api/chat", headers=auth_header(registered_user["token"]), json={
            "mentor_id": registered_mentor["user_id"],
            "question": "O que e arritmia?",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["conversation_id"]
        assert data["message_id"]
        assert "nao possui conteudo" in data["response"].lower() or "conteudo" in data["response"].lower()
        assert data["mentor_name"] == "Dr. Mentor Teste"


@pytest.mark.asyncio
class TestConversationMessages:
    async def test_get_messages_nonexistent(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/conversations/nonexistent/messages", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestSOAP:
    async def test_soap_nonexistent_conversation(self, async_client: AsyncClient, registered_user):
        resp = await async_client.post("/api/conversations/nonexistent/summarize", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestUniversalSearch:
    async def test_search_short_query(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/search/universal?q=ab", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 400

    async def test_search_empty_results(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/search/universal?q=arritmia+cardiaca+ventricular", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["results"] == []
        assert data["total_results"] == 0

    async def test_search_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.get("/api/search/universal?q=cardiologia")
        assert resp.status_code in [401, 403]


@pytest.mark.asyncio
class TestHealthCheck:
    async def test_health_endpoint(self, async_client: AsyncClient):
        resp = await async_client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


@pytest.mark.asyncio
class TestRAGValidation:
    """Test the response validation logic."""

    def test_validate_rag_clean_response(self):
        from routers.chat import validate_rag_response
        result = validate_rag_response("Uma resposta sem fontes.", [])
        assert result is True

    def test_validate_rag_with_citations(self):
        from routers.chat import validate_rag_response
        result = validate_rag_response(
            "Segundo [source_1], a resposta e sim.",
            [{"source_id": "1", "title": "Artigo 1"}],
        )
        assert result is True

    def test_validate_rag_excess_refs(self):
        from routers.chat import validate_rag_response
        from exceptions import ResponseValidationError
        with pytest.raises(ResponseValidationError):
            validate_rag_response(
                "De acordo com [source_50], isto e verdade.",
                [{"source_id": "1", "title": "Artigo 1"}],
            )
