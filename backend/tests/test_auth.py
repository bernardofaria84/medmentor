"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient
from tests.conftest import auth_header


@pytest.mark.asyncio
class TestUserSignup:
    async def test_signup_success(self, async_client: AsyncClient):
        resp = await async_client.post("/api/auth/signup", json={
            "email": "novo@med.com",
            "password": "Senha123!",
            "full_name": "Dr. Novo",
            "crm": "CRM-11111",
            "specialty": "Pediatria",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user_type"] == "user"
        assert data["user_id"]

    async def test_signup_duplicate_email(self, async_client: AsyncClient):
        payload = {
            "email": "dup@med.com",
            "password": "Senha123!",
            "full_name": "Dr. Dup",
            "crm": "CRM-22222",
        }
        await async_client.post("/api/auth/signup", json=payload)
        resp = await async_client.post("/api/auth/signup", json=payload)
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    async def test_signup_missing_fields(self, async_client: AsyncClient):
        resp = await async_client.post("/api/auth/signup", json={
            "email": "incomplete@med.com",
        })
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestUserLogin:
    async def test_login_success(self, async_client: AsyncClient, registered_user):
        resp = await async_client.post("/api/auth/login", json={
            "email": "testuser@med.com",
            "password": "Senha123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user_type"] == "user"

    async def test_login_wrong_password(self, async_client: AsyncClient, registered_user):
        resp = await async_client.post("/api/auth/login", json={
            "email": "testuser@med.com",
            "password": "SenhaErrada",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_email(self, async_client: AsyncClient):
        resp = await async_client.post("/api/auth/login", json={
            "email": "ghost@med.com",
            "password": "whatever",
        })
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestMentorSignup:
    async def test_mentor_signup_success(self, async_client: AsyncClient):
        resp = await async_client.post("/api/auth/mentor/signup", json={
            "email": "mentornovo@med.com",
            "password": "Senha123!",
            "full_name": "Dr. Mentor Novo",
            "specialty": "Neurologia",
            "bio": "Neurologista experiente",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_type"] == "mentor"

    async def test_mentor_login_success(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.post("/api/auth/mentor/login", json={
            "email": "mentor@med.com",
            "password": "Senha123!",
        })
        assert resp.status_code == 200
        assert resp.json()["user_type"] == "mentor"

    async def test_mentor_login_wrong_password(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.post("/api/auth/mentor/login", json={
            "email": "mentor@med.com",
            "password": "Errada123",
        })
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestProtectedRoutes:
    async def test_no_token_returns_401(self, async_client: AsyncClient):
        resp = await async_client.get("/api/users/profile")
        assert resp.status_code in [401, 403]

    async def test_invalid_token_returns_401(self, async_client: AsyncClient):
        resp = await async_client.get("/api/users/profile", headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401

    async def test_valid_token_returns_profile(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/users/profile", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "testuser@med.com"
        assert data["full_name"] == "Dr. Teste"
