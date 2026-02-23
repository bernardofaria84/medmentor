# MedMentor v2.0 - Product Requirements Document

## Original Problem Statement
MedMentor is a medical mentoring platform powered by AI. It connects specialist doctors (mentors) with healthcare professionals (subscribers) through intelligent bots that learn from each mentor's exclusive content.

## Core Architecture
- **Frontend**: React Native (Expo) with Expo Router, React Native Paper
- **Backend**: FastAPI + MongoDB
- **AI/RAG**: Multi-AI RAG with OpenAI GPT-3.5 Turbo + Anthropic Claude fallback
- **Speech-to-Text**: Web Speech API (browser-based)

## What's Been Implemented

### Phase 1: Core Features (Complete)
- User authentication (JWT-based) for subscribers and mentors
- Chat with AI mentors powered by RAG
- SOAP Notes generation from conversations
- Universal Semantic Search across all mentor knowledge bases
- Audio-to-Text input (Web Speech API - web only)
- Impactometer Dashboard for mentors
- Human Validation of Bot Profile workflow
- PII Anonymization (regex-based, replaced spaCy)

### Phase 2: 9-Point Improvement Plan (Complete - Feb 2026)
1. **Mentor Onboarding** - Guided 3-step flow for new mentors (MentorOnboarding.tsx)
2. **Empty States** - Reusable EmptyState component across all screens
3. **About + Terms of Use** - Full about page with features, terms, and privacy policy
4. **Form Validation** - Password strength indicator, email format check, required field validation
5. **SOAP PDF Export** - Export SOAP notes as PDF via browser print dialog
6. **History with Filters** - Date filters (Today/Week/Month) and mentor-based filtering
7. **Dark Mode** - Manual toggle with AsyncStorage persistence via ThemeContext
8. **Animations** - Splash screen transition with branded loading animation
9. **Custom Splash Screen** - Branded splash with stethoscope icon and MedMentor branding

## Key Screens
- Login/Signup (auth flow with validation)
- Home (search, recent conversations, mentor list)
- Chat (real-time AI conversation with voice input)
- Conversation detail (SOAP generation + PDF export)
- History (filtered conversation list)
- Profile (dark mode toggle, about/terms links)
- About (app info, features, terms, privacy)
- Mentor Dashboard (Impactometer with KPIs, charts, topics)
- Mentor Profile (bot approval, settings, dark mode)
- Mentor Onboarding (3-step guided setup)

## Known Issues
- **Native Audio Transcription (P2)**: Audio-to-text only works on web (Web Speech API). Native mobile path (iOS/Android) is non-functional as it references a broken `/api/transcribe` endpoint.
- **Expo Tunnel Instability**: ngrok tunnel has intermittent connectivity issues. Using `--web` mode for stable preview. For deployment, tunnel mode should be used when ngrok is stable.

## Deployment Readiness (Feb 2026)
- Backend: All endpoints optimized with DB projections and limits
- Frontend: app.config.js created to expose env vars properly
- Dependencies: Removed dead spaCy packages from requirements.txt
- DB_NAME: Uses os.environ['DB_NAME'] directly (no fallback)
- Mentor list: Excludes password_hash via projection

## Database Schema
- **users**: id, email, full_name, crm, specialty, user_type
- **mentors**: id, email, full_name, specialty, bio, agent_profile, agent_profile_pending, profile_status
- **conversations**: id, user_id, mentor_id, title, messages, created_at, updated_at
- **content**: id, mentor_id, title, content_type, file_url, embeddings

## Key API Endpoints
- POST /api/auth/login, /api/auth/signup
- GET /api/mentors, /api/mentors/profile/me
- POST /api/chat
- GET /api/conversations, /api/conversations/:id/messages
- POST /api/conversations/:id/summarize (SOAP)
- GET /api/search/universal
- POST /api/mentor/impactometer
- POST /api/mentors/profile/approve
