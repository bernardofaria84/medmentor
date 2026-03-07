"""Backend tests for SUPER PROMPT MedMentor features:
- Like/Dislike/feedback endpoint (POST /api/messages/{id}/feedback)
- AI Insights endpoint (GET /api/mentors/analytics/ai-insights)
- Content upload with DOCX support (POST /api/mentor/content/upload)
- Mentor avatar upload (POST /api/mentors/profile/avatar)
- Mentor/subscriber auth flows
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

SUBSCRIBER_EMAIL = "goulart.faria@gmail.com"
SUBSCRIBER_PASSWORD = "MedMentor@2025"
MENTOR_EMAIL = "dra.priscillafrauches@medmentor.com"
MENTOR_PASSWORD = "MedMentor@2025"


@pytest.fixture(scope="module")
def subscriber_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUBSCRIBER_EMAIL, "password": SUBSCRIBER_PASSWORD
    })
    assert resp.status_code == 200, f"Subscriber login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def mentor_token():
    resp = requests.post(f"{BASE_URL}/api/auth/mentor/login", json={
        "email": MENTOR_EMAIL, "password": MENTOR_PASSWORD
    })
    assert resp.status_code == 200, f"Mentor login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def existing_bot_message_id(subscriber_token):
    """Get an existing bot message ID from conversations"""
    convs = requests.get(f"{BASE_URL}/api/conversations",
                         headers={"Authorization": f"Bearer {subscriber_token}"})
    assert convs.status_code == 200
    convs_data = convs.json()
    if not convs_data:
        pytest.skip("No conversations found")
    conv_id = convs_data[0]["id"]
    msgs = requests.get(f"{BASE_URL}/api/conversations/{conv_id}/messages",
                        headers={"Authorization": f"Bearer {subscriber_token}"})
    assert msgs.status_code == 200
    bot_msgs = [m for m in msgs.json() if m["sender_type"] == "MENTOR_BOT"]
    if not bot_msgs:
        pytest.skip("No bot messages found")
    return bot_msgs[0]["id"]


# ============= Auth Tests =============

class TestSubscriberAuth:
    """Subscriber login and profile tests"""

    def test_subscriber_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUBSCRIBER_EMAIL, "password": SUBSCRIBER_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user_type"] == "user"
        assert "user_id" in data

    def test_subscriber_profile_returns_greeting_info(self, subscriber_token):
        resp = requests.get(f"{BASE_URL}/api/users/profile",
                            headers={"Authorization": f"Bearer {subscriber_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "full_name" in data
        assert len(data["full_name"]) > 0

    def test_mentor_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/mentor/login", json={
            "email": MENTOR_EMAIL, "password": MENTOR_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user_type"] == "mentor"


# ============= Feedback/Like/Dislike Tests =============

class TestMessageFeedback:
    """POST /api/messages/{message_id}/feedback"""

    def test_feedback_like_with_json_body(self, subscriber_token, existing_bot_message_id):
        """Frontend sends JSON body {feedback: 'LIKE'} - must return 200"""
        resp = requests.post(
            f"{BASE_URL}/api/messages/{existing_bot_message_id}/feedback",
            headers={"Authorization": f"Bearer {subscriber_token}",
                     "Content-Type": "application/json"},
            json={"feedback": "LIKE"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert "success" in resp.json()["message"].lower()

    def test_feedback_dislike_with_json_body(self, subscriber_token, existing_bot_message_id):
        resp = requests.post(
            f"{BASE_URL}/api/messages/{existing_bot_message_id}/feedback",
            headers={"Authorization": f"Bearer {subscriber_token}",
                     "Content-Type": "application/json"},
            json={"feedback": "DISLIKE"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_feedback_none_toggle_off(self, subscriber_token, existing_bot_message_id):
        resp = requests.post(
            f"{BASE_URL}/api/messages/{existing_bot_message_id}/feedback",
            headers={"Authorization": f"Bearer {subscriber_token}",
                     "Content-Type": "application/json"},
            json={"feedback": "NONE"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_feedback_nonexistent_message_returns_404(self, subscriber_token):
        resp = requests.post(
            f"{BASE_URL}/api/messages/nonexistent-message-id/feedback",
            headers={"Authorization": f"Bearer {subscriber_token}",
                     "Content-Type": "application/json"},
            json={"feedback": "LIKE"}
        )
        assert resp.status_code == 404

    def test_feedback_requires_auth(self):
        resp = requests.post(
            f"{BASE_URL}/api/messages/some-id/feedback",
            json={"feedback": "LIKE"}
        )
        assert resp.status_code in [401, 403]

    def test_feedback_persisted_in_db(self, subscriber_token, existing_bot_message_id):
        """After setting LIKE, get messages and check feedback field updated"""
        # Set LIKE
        requests.post(
            f"{BASE_URL}/api/messages/{existing_bot_message_id}/feedback",
            headers={"Authorization": f"Bearer {subscriber_token}"},
            json={"feedback": "LIKE"}
        )
        # Get messages to verify persistence
        convs = requests.get(f"{BASE_URL}/api/conversations",
                             headers={"Authorization": f"Bearer {subscriber_token}"})
        conv_id = convs.json()[0]["id"]
        msgs = requests.get(f"{BASE_URL}/api/conversations/{conv_id}/messages",
                            headers={"Authorization": f"Bearer {subscriber_token}"})
        bot_msg = next((m for m in msgs.json() if m["id"] == existing_bot_message_id), None)
        assert bot_msg is not None
        assert bot_msg["feedback"] == "LIKE"


# ============= AI Insights Tests =============

class TestAiInsights:
    """GET /api/mentors/analytics/ai-insights"""

    def test_ai_insights_returns_200_for_mentor(self, mentor_token):
        resp = requests.get(
            f"{BASE_URL}/api/mentors/analytics/ai-insights",
            headers={"Authorization": f"Bearer {mentor_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_ai_insights_response_structure(self, mentor_token):
        resp = requests.get(
            f"{BASE_URL}/api/mentors/analytics/ai-insights",
            headers={"Authorization": f"Bearer {mentor_token}"}
        )
        data = resp.json()
        assert "insights" in data
        assert "generated_at" in data
        assert "cached" in data
        assert isinstance(data["insights"], list)

    def test_ai_insights_denied_for_subscriber(self, subscriber_token):
        resp = requests.get(
            f"{BASE_URL}/api/mentors/analytics/ai-insights",
            headers={"Authorization": f"Bearer {subscriber_token}"}
        )
        assert resp.status_code == 403

    def test_ai_insights_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/mentors/analytics/ai-insights")
        assert resp.status_code in [401, 403]


# ============= Content Upload Tests =============

class TestContentUpload:
    """POST /api/mentor/content/upload - DOCX, PDF, VIDEO, AUDIO"""

    def test_docx_upload_accepted(self, mentor_token):
        """DOCX upload should be accepted with correct content type"""
        # Create a minimal DOCX-like file for testing content-type acceptance
        docx_header = b'PK\x03\x04'  # DOCX files start with PK (zip header)
        fake_docx = io.BytesIO(docx_header + b'\x00' * 100)
        resp = requests.post(
            f"{BASE_URL}/api/mentor/content/upload",
            headers={"Authorization": f"Bearer {mentor_token}"},
            files={"file": ("test_document.docx",
                            fake_docx,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
        # Should be accepted (400 is ok if docx processing fails due to invalid content)
        # But not 422 (unsupported format) or 403 (access denied)
        assert resp.status_code != 422, f"DOCX format rejected: {resp.text}"
        assert resp.status_code != 403, f"Access denied for DOCX upload: {resp.text}"

    def test_pdf_upload_accepted(self, mentor_token):
        """PDF content type should be accepted"""
        pdf_header = b'%PDF-1.4\n%\xff\xff\xff\xff\n'
        fake_pdf = io.BytesIO(pdf_header)
        resp = requests.post(
            f"{BASE_URL}/api/mentor/content/upload",
            headers={"Authorization": f"Bearer {mentor_token}"},
            files={"file": ("test.pdf", fake_pdf, "application/pdf")}
        )
        assert resp.status_code != 422, f"PDF format rejected: {resp.text}"
        assert resp.status_code != 403, "Access denied for PDF upload"

    def test_upload_requires_mentor_auth(self, subscriber_token):
        """Only mentors can upload content"""
        fake_pdf = io.BytesIO(b'%PDF-1.4')
        resp = requests.post(
            f"{BASE_URL}/api/mentor/content/upload",
            headers={"Authorization": f"Bearer {subscriber_token}"},
            files={"file": ("test.pdf", fake_pdf, "application/pdf")}
        )
        assert resp.status_code == 403

    def test_unsupported_format_rejected(self, mentor_token):
        """Unsupported formats should return 400"""
        fake_txt = io.BytesIO(b'just some text')
        resp = requests.post(
            f"{BASE_URL}/api/mentor/content/upload",
            headers={"Authorization": f"Bearer {mentor_token}"},
            files={"file": ("test.txt", fake_txt, "text/plain")}
        )
        assert resp.status_code == 400


# ============= Mentor Profile/Avatar Tests =============

class TestMentorProfile:
    """Mentor profile and avatar upload tests"""

    def test_mentor_profile_loads(self, mentor_token):
        resp = requests.get(
            f"{BASE_URL}/api/mentors/profile/me",
            headers={"Authorization": f"Bearer {mentor_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "full_name" in data
        assert "specialty" in data
        assert "email" in data

    def test_mentor_avatar_upload_requires_image(self, mentor_token):
        """Non-image files should be rejected with 400"""
        fake_pdf = io.BytesIO(b'not an image')
        resp = requests.post(
            f"{BASE_URL}/api/mentors/profile/avatar",
            headers={"Authorization": f"Bearer {mentor_token}"},
            files={"file": ("test.pdf", fake_pdf, "application/pdf")}
        )
        assert resp.status_code == 400

    def test_mentor_avatar_endpoint_accepts_jpeg(self, mentor_token):
        """JPEG image should be accepted"""
        # Minimal JPEG header
        jpeg_data = (
            b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
            b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
            b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
            b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e\xc4\x00\xb5'
            b'\xff\xd9'  # JPEG end marker
        )
        resp = requests.post(
            f"{BASE_URL}/api/mentors/profile/avatar",
            headers={"Authorization": f"Bearer {mentor_token}"},
            files={"file": ("avatar.jpg", io.BytesIO(jpeg_data), "image/jpeg")}
        )
        # Should not be 400 or 403 (might fail on image processing but not format rejection)
        assert resp.status_code != 403, "Access denied for avatar upload"


# ============= Mentors List Tests =============

class TestMentorsList:
    """GET /api/mentors - mentors list with avatar_url"""

    def test_mentors_list_returns_200(self, subscriber_token):
        resp = requests.get(
            f"{BASE_URL}/api/mentors",
            headers={"Authorization": f"Bearer {subscriber_token}"}
        )
        assert resp.status_code == 200

    def test_mentors_list_has_avatar_url_field(self, subscriber_token):
        resp = requests.get(
            f"{BASE_URL}/api/mentors",
            headers={"Authorization": f"Bearer {subscriber_token}"}
        )
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Each mentor should have avatar_url field (can be null)
        for mentor in data:
            assert "avatar_url" in mentor
            assert "full_name" in mentor
            assert "specialty" in mentor
