#!/usr/bin/env python3
"""
Migration script: Re-generates all content_chunks embeddings with the new
text-embedding-3-small model (replacing text-embedding-ada-002).

Usage:
  cd /app/backend
  python scripts/migrate_embeddings.py

The script:
  1. Reads all existing chunks from MongoDB
  2. Re-generates embeddings using the current model (text-embedding-3-small)
  3. Updates each chunk in-place
  4. Reports progress and errors

IMPORTANT: Run this script whenever the EMBEDDING_MODEL env variable is changed.
           Embeddings from different models are NOT compatible.
"""

import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import motor.motor_asyncio
from openai import AsyncOpenAI


MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")


async def migrate():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    openai = AsyncOpenAI(api_key=OPENAI_API_KEY)

    print(f"Starting embedding migration -> {EMBEDDING_MODEL}")
    print(f"Connected to: {DB_NAME}")

    total = await db.content_chunks.count_documents({})
    print(f"Total chunks to process: {total}")

    processed = 0
    errors = 0
    start = datetime.utcnow()

    async for chunk in db.content_chunks.find({}, {"_id": 1, "text": 1, "embedding": 1}):
        try:
            response = await openai.embeddings.create(
                model=EMBEDDING_MODEL,
                input=chunk["text"],
            )
            new_embedding = response.data[0].embedding
            await db.content_chunks.update_one(
                {"_id": chunk["_id"]},
                {"$set": {"embedding": new_embedding, "embedding_model": EMBEDDING_MODEL}},
            )
            processed += 1
            if processed % 10 == 0:
                elapsed = (datetime.utcnow() - start).total_seconds()
                print(f"  [{processed}/{total}] {elapsed:.0f}s elapsed — {errors} errors")
        except Exception as e:
            errors += 1
            print(f"  ERROR on chunk {chunk['_id']}: {e}")

    elapsed = (datetime.utcnow() - start).total_seconds()
    print(f"\nMigration complete: {processed}/{total} chunks updated in {elapsed:.0f}s, {errors} errors")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
