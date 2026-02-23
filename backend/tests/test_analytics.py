"""Tests for analytics and impactometer endpoints."""
import pytest
from httpx import AsyncClient
from tests.conftest import auth_header
from dependencies import db


@pytest.mark.asyncio
class TestImpactometer:
    async def test_impactometer_empty(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/impactometer", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_queries"] == 0
        assert data["total_users"] == 0
        assert data["total_conversations"] == 0
        assert data["total_content"] == 0
        assert data["likes"] == 0
        assert data["dislikes"] == 0
        assert data["like_rate"] == 0
        assert "queries_timeline" in data
        assert len(data["queries_timeline"]) == 30
        assert "hot_topics" in data
        assert "recent_queries" in data

    async def test_impactometer_requires_mentor(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/impactometer", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403

    async def test_impactometer_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.get("/api/mentor/impactometer")
        assert resp.status_code in [401, 403]


@pytest.mark.asyncio
class TestQueriesAnalytics:
    async def test_queries_analytics(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/analytics/queries", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200

    async def test_queries_analytics_requires_mentor(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/analytics/queries", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestRatingsAnalytics:
    async def test_ratings_analytics(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/analytics/ratings", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200

    async def test_ratings_analytics_requires_mentor(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/analytics/ratings", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestContentAnalytics:
    async def test_content_analytics(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/analytics/content", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200

    async def test_content_analytics_requires_mentor(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/analytics/content", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestFeedbackDetailsAnalytics:
    async def test_feedback_details(self, async_client: AsyncClient, registered_mentor):
        resp = await async_client.get("/api/mentor/analytics/feedback-details", headers=auth_header(registered_mentor["token"]))
        assert resp.status_code == 200

    async def test_feedback_details_requires_mentor(self, async_client: AsyncClient, registered_user):
        resp = await async_client.get("/api/mentor/analytics/feedback-details", headers=auth_header(registered_user["token"]))
        assert resp.status_code == 403
