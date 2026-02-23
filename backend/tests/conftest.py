"""Shared fixtures for all tests."""
import os
import sys
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure backend is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Override DB_NAME for tests BEFORE importing app
os.environ['DB_NAME'] = 'medmentor_test_db'


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def setup_test_db():
    """Replace the db in dependencies with one on the test event loop."""
    import dependencies
    # Create a fresh Motor client on the current (test) event loop
    test_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    test_db = test_client[os.environ['DB_NAME']]
    # Patch the module-level db used by all routers
    dependencies.db = test_db
    # Also patch routers that imported db at module-level
    from routers import auth, users, mentors, chat, analytics
    auth.db = test_db
    users.db = test_db
    mentors.db = test_db
    chat.db = test_db
    analytics.db = test_db
    yield test_db
    test_client.close()


@pytest_asyncio.fixture
async def async_client(setup_test_db):
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(autouse=True)
async def clean_test_db(setup_test_db):
    """Clean test database before each test."""
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
