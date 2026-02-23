"""
Shared dependencies for all routers.
Provides database connections, GridFS, and logger.
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

# Sync client (for GridFS) - always safe to create at import time
sync_client = MongoClient(mongo_url)
sync_db = sync_client[db_name]
fs = gridfs.GridFS(sync_db)

# Async Motor client - lazy initialization to avoid event-loop conflicts with pytest
_motor_client = None
_motor_db = None


def _get_motor_db():
    """Get or lazily create the async Motor database on the current event loop."""
    global _motor_client, _motor_db
    if _motor_db is None:
        _motor_client = AsyncIOMotorClient(mongo_url)
        _motor_db = _motor_client[db_name]
    return _motor_db


class _DBProxy:
    """Transparent proxy so `from dependencies import db` always resolves
    to the live Motor database, even when tests swap the backing store."""

    def __getattr__(self, name):
        return getattr(_get_motor_db(), name)

    def __getitem__(self, name):
        return _get_motor_db()[name]


db = _DBProxy()


def get_db():
    return _get_motor_db()


def get_fs():
    return fs


def close_db():
    global _motor_client, _motor_db
    if _motor_client:
        _motor_client.close()
        _motor_client = None
        _motor_db = None


# Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('medmentor')
