"""Shared fixtures for all tests."""
import os
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure backend is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Override DB_NAME for tests BEFORE any app import
os.environ['DB_NAME'] = 'medmentor_test_db'


@pytest_asyncio.fixture(scope="session")
async def setup_test_db():
    """Create a Motor client on the TEST event loop and inject it into dependencies."""
    import dependencies
    test_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    test_db = test_client[os.environ['DB_NAME']]
    # Inject into the lazy proxy's backing store so all code that uses
    # `from dependencies import db` (the _DBProxy) will resolve to test_db
    dependencies._motor_client = test_client
    dependencies._motor_db = test_db
    yield test_db
    await test_client.drop_database(os.environ['DB_NAME'])
    test_client.close()


@pytest_asyncio.fixture
async def async_client(setup_test_db):
    """ASGI test client wired to the FastAPI app."""
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(autouse=True)
async def clean_test_db(setup_test_db):
    """Clean all collections before each test."""
    collections = await setup_test_db.list_collection_names()
    for col in collections:
        await setup_test_db[col].delete_many({})
    yield


@pytest_asyncio.fixture
async def registered_user(async_client: AsyncClient):
    resp = await async_client.post("/api/auth/signup", json={
        "email": "testuser@med.com",
        "password": "Senha123!",
        "full_name": "Dr. Teste",
        "crm": "CRM-99999",
        "specialty": "Clinica Geral",
    })
    data = resp.json()
    return {"token": data["access_token"], "user_id": data["user_id"], "email": "testuser@med.com"}


@pytest_asyncio.fixture
async def registered_mentor(async_client: AsyncClient):
    resp = await async_client.post("/api/auth/mentor/signup", json={
        "email": "mentor@med.com",
        "password": "Senha123!",
        "full_name": "Dr. Mentor Teste",
        "specialty": "Cardiologia",
        "bio": "Cardiologista com 20 anos de experiencia",
    })
    data = resp.json()
    return {"token": data["access_token"], "user_id": data["user_id"], "email": "mentor@med.com"}


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
