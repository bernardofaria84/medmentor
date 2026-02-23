"""Tests for mentor-related endpoints."""
import pytest
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
