"""Shared fixtures for all tests."""
import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport

# Ensure backend is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use test database
os.environ.setdefault('DB_NAME', 'medmentor_test_db')

from main import app
from dependencies import db, client


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def clean_test_db():
    """Clean test database before each test."""
    collections = await db.list_collection_names()
    for col in collections:
        await db[col].delete_many({})
    yield
    # Cleanup after test
    collections = await db.list_collection_names()
    for col in collections:
        await db[col].delete_many({})


# ---------- helper fixtures ----------

@pytest.fixture
async def registered_user(async_client: AsyncClient):
    """Register and return a test user with token."""
    resp = await async_client.post("/api/auth/signup", json={
        "email": "testuser@med.com",
        "password": "Senha123!",
        "full_name": "Dr. Teste",
        "crm": "CRM-99999",
        "specialty": "Clinica Geral",
    })
    data = resp.json()
    return {
        "token": data["access_token"],
        "user_id": data["user_id"],
        "email": "testuser@med.com",
    }


@pytest.fixture
async def registered_mentor(async_client: AsyncClient):
    """Register and return a test mentor with token."""
    resp = await async_client.post("/api/auth/mentor/signup", json={
        "email": "mentor@med.com",
        "password": "Senha123!",
        "full_name": "Dr. Mentor Teste",
        "specialty": "Cardiologia",
        "bio": "Cardiologista com 20 anos de experiencia",
    })
    data = resp.json()
    return {
        "token": data["access_token"],
        "user_id": data["user_id"],
        "email": "mentor@med.com",
    }


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
