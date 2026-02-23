"""
Shared dependencies for all routers.
Provides database connections, GridFS, and logger.
Uses lazy initialization for Motor to support pytest-asyncio.
"""
import os
import logging
import gridfs
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Sync client (for GridFS) - always safe
sync_client = MongoClient(mongo_url)
sync_db = sync_client[db_name]
fs = gridfs.GridFS(sync_db)

# Async client - lazy init
_async_client = None
_db = None


def get_db():
    global _async_client, _db
    if _db is None:
        _async_client = AsyncIOMotorClient(mongo_url)
        _db = _async_client[db_name]
    return _db


def get_client():
    get_db()  # ensure init
    return _async_client


class _DBProxy:
    """Proxy that lazily initializes Motor on the current event loop."""
    def __getattr__(self, name):
        return getattr(get_db(), name)

    def __getitem__(self, name):
        return get_db()[name]


db = _DBProxy()
client = property(lambda self: get_client())

# Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('medmentor')
