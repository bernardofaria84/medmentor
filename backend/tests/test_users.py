"""Tests for user profile endpoints."""
import pytest
from httpx import AsyncClient
from tests.conftest import auth_header


@pytest.mark.asyncio
class TestUserProfile:
    async def test_get_profile(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/users/profile", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "testuser@med.com"
        assert data["full_name"] == "Dr. Teste"
        assert "password" not in data
        assert "password_hash" not in str(data)

    async def test_update_profile(self, async_client: AsyncClient, registered_user):
        resp = await async_client.put("/api/users/profile", headers=auth_header(registered_user["token"]), json={
            "full_name": "Dr. Teste Atualizado",
        })
        assert resp.status_code == 200
        # Verify the update
        resp2 = await async_client.get("/api/users/profile", headers=auth_header(registered_user["token"]))
        assert resp2.json()["full_name"] == "Dr. Teste Atualizado"

    async def test_update_profile_empty(self, async_client: AsyncClient, registered_user):
        resp = await async_client.put("/api/users/profile", headers=auth_header(registered_user["token"]), json={})
        assert resp.status_code == 400

    async def test_profile_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.get("/api/users/profile")
        assert resp.status_code in [401, 403]

    async def test_update_profile_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.put("/api/users/profile", json={"full_name": "Hacker"})
        assert resp.status_code in [401, 403]
