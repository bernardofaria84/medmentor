"""Tests for mentor-related endpoints."""
import uuid
import pytest
from datetime import datetime
from httpx import AsyncClient
from tests.conftest import auth_header
from dependencies import db


@pytest.mark.asyncio
class TestMentorListing:
    async def test_list_mentors_empty(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentors", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_list_mentors_with_data(self, async_client: AsyncClient, registered_user, registered_mentor):
        resp = await async_client.get("/api/mentors", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        mentor = data[0]
        assert "id" in mentor
        assert "full_name" in mentor
        assert "specialty" in mentor
        # Ensure no sensitive data leaked
        assert "password_hash" not in str(mentor)
        assert "password" not in mentor

    async def test_list_mentors_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.get("/api/mentors")
        assert resp.status_code in [401, 403]

    async def test_get_mentor_by_id(self, async_client: AsyncClient, registered_user, registered_mentor):
        resp = await async_client.get(f"/api/mentors/{registered_mentor['user_id']}", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Dr. Mentor Teste"
        assert data["specialty"] == "Cardiologia"

    async def test_get_mentor_by_id_not_found(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentors/nonexistent-id", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestMentorSelfProfile:
    async def test_get_self_profile(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentors/profile/me", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Dr. Mentor Teste"
        assert data["specialty"] == "Cardiologia"
        assert data["profile_status"] == "INACTIVE"

    async def test_user_cannot_access_mentor_profile(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentors/profile/me", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403

    async def test_update_mentor_profile(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.put("/api/mentors/profile/me", headers=auth_header(registered_mentor["token"]), json={
            "bio": "Cardiologista intervencionista atualizado",
        })
        assert resp.status_code == 200
        # Verify update
        resp2 = await async_client.get("/api/mentors/profile/me", headers=auth_header(registered_mentor["token"]))
        assert resp2.json()["bio"] == "Cardiologista intervencionista atualizado"


@pytest.mark.asyncio
class TestBotProfileApproval:
    async def test_approve_without_pending_profile(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.post("/api/mentor/profile/approve", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 400
        assert "No pending profile" in resp.json()["detail"]

    async def test_approve_pending_profile(self, async_client: AsyncClient, registered_mentor):
        # Simulate a pending profile
        await db.mentors.update_one(
            {"_id": registered_mentor["user_id"]},
            {"$set": {
                "agent_profile_pending": "Eu sou um bot de cardiologia especializado.",
                "style_traits_pending": "formal,tecnico",
                "profile_status": "PENDING_APPROVAL",
            }}
        )
        resp = await async_client.post("/api/mentor/profile/approve", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        assert resp.json()["profile_status"] == "ACTIVE"
        # Verify the profile was activated
        prof_resp = await async_client.get("/api/mentors/profile/me", headers=auth_header(registered_mentor["token"]))
        prof = prof_resp.json()
        assert prof["profile_status"] == "ACTIVE"
        assert prof["agent_profile"] == "Eu sou um bot de cardiologia especializado."
        assert prof["agent_profile_pending"] is None

    async def test_user_cannot_approve_profile(self, async_client: AsyncClient, registered_user):
        resp = await async_client.post("/api/mentor/profile/approve", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestMentorContent:
    async def test_list_content_empty(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/content", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_user_cannot_list_mentor_content(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/content", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403

    async def test_delete_nonexistent_content(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.delete("/api/mentor/content/nonexistent", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestMentorStats:
    async def test_get_mentor_stats(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/stats", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert "total_queries" in data
        assert "total_content" in data
        assert data["total_queries"] == 0

    async def test_user_cannot_get_stats(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/stats", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403



@pytest.mark.asyncio
class TestContentManagement:
    async def _insert_content(self, mentor_id):
        content_id = str(uuid.uuid4())
        now = datetime.utcnow()
        await db.mentor_content.insert_one({
            "_id": content_id, "mentor_id": mentor_id,
            "title": "Artigo Teste", "content_type": "text",
            "status": "COMPLETED", "uploaded_at": now,
            "processed_text": "Texto processado de exemplo.",
        })
        chunk_id = str(uuid.uuid4())
        await db.content_chunks.insert_one({
            "_id": chunk_id, "content_id": content_id,
            "text": "Chunk de texto", "embedding": [0.1] * 10,
        })
        return content_id

    async def test_get_content_details(self, async_client: AsyncClient, registered_mentor):
        cid = await self._insert_content(registered_mentor["user_id"])
        resp = await async_client.get(f"/api/mentor/content/{cid}", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Artigo Teste"
        assert data["chunk_count"] == 1

    async def test_get_content_details_not_found(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/content/nonexistent", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 404

    async def test_user_cannot_view_content(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/content/any-id", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403

    async def test_delete_content(self, async_client: AsyncClient, registered_mentor):
        cid = await self._insert_content(registered_mentor["user_id"])
        resp = await async_client.delete(f"/api/mentor/content/{cid}", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted_chunks"] == 1
        # Verify it's gone
        resp2 = await async_client.get(f"/api/mentor/content/{cid}", headers=auth_header(registered_mentor["token"]))
        assert resp2.status_code == 404

    async def test_delete_content_not_found(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.delete("/api/mentor/content/nonexistent", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 404

    async def test_user_cannot_delete_content(self, async_client: AsyncClient, registered_user):
        resp = await async_client.delete("/api/mentor/content/any-id", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403

    async def test_bulk_delete(self, async_client: AsyncClient, registered_mentor):
        cid1 = await self._insert_content(registered_mentor["user_id"])
        cid2 = await self._insert_content(registered_mentor["user_id"])
        resp = await async_client.post(
            "/api/mentor/content/bulk-delete",
            headers=auth_header(registered_mentor["token"]),
            json=[cid1, cid2],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted_contents"] == 2
        assert data["deleted_chunks"] == 2

    async def test_user_cannot_bulk_delete(self, async_client: AsyncClient, registered_user):
        resp = await async_client.post(
            "/api/mentor/content/bulk-delete",
            headers=auth_header(registered_user["token"]),
            json=["some-id"],
        )
        assert resp.status_code == 403
