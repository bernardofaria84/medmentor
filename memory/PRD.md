# MedMentor v2.0 - Product Requirements Document

## Problema Original
O MedMentor e uma plataforma de mentoria medica com IA que conecta estudantes e profissionais de saude a mentores especializados. A plataforma utiliza RAG (Retrieval-Augmented Generation) para fornecer respostas baseadas no conteudo do mentor.

## Arquitetura

### Backend (FastAPI + MongoDB)
```
backend/
├── main.py                 # Entry point da aplicacao
├── dependencies.py         # Dependencias compartilhadas (DB, GridFS, Logger)
├── models.py               # Modelos Pydantic
├── pytest.ini              # Configuracao do pytest
├── routers/
│   ├── auth.py             # Autenticacao (signup, login)
│   ├── users.py            # Perfil de usuario
│   ├── mentors.py          # Listagem, perfil, conteudo de mentores
│   ├── chat.py             # Chat, conversas, SOAP, busca, feedback
│   └── analytics.py        # Impactometro e analytics
├── tests/
│   ├── conftest.py         # Fixtures compartilhadas
│   ├── test_auth.py        # Testes de autenticacao
│   ├── test_users.py       # Testes de perfil de usuario
│   ├── test_mentors.py     # Testes de mentores e conteudo
│   ├── test_chat.py        # Testes de chat, conversas, feedback
│   └── test_analytics.py   # Testes de analytics
├── multi_ai_rag_service.py
├── mentor_profile_service.py
├── anonymization_service.py
└── exceptions.py
```

### Frontend (React Native / Expo)
```
frontend/
├── app/                    # Expo Router pages
├── context/
│   └── ThemeContext.tsx     # Dark/Light mode
├── components/
│   └── EmptyState.tsx      # Componente reutilizavel
├── hooks/
│   └── useAudioRecording.ts
└── app.config.js           # Env vars para Expo builds
```

## O que foi implementado

### Sessao Atual (Fev 2026)
- [x] Correcao layout chips de filtro na tela Historico (chips eram sobrepostos pela lista de conversas)
  - Reescrito `dependencies.py` com _DBProxy e lazy init
  - Reescrito `conftest.py` com fixtures async corretas
  - Configurado `asyncio_default_test_loop_scope = session` no pytest.ini
  - Corrigido `main.py` (AnonymizationService como instancia)
- [x] Suite completa de testes automatizados
  - 75 testes passando em 5 arquivos
  - Cobertura total: 70%
  - auth.py: 98%, analytics.py: 90%, users.py: 94%, mentors.py: 69%, chat.py: 55%

### Sessoes Anteriores
- [x] Refatoracao do backend monolitico → modular (routers/)
- [x] Plano de 9 pontos UI/UX (Splash, Dark Mode, Empty States, About, Validacao, PDF, Filtros)
- [x] Deploy readiness (otimizacao queries, env vars)
- [x] Estabilidade do tunnel ngrok

## Integracoes
- OpenAI GPT-3.5-turbo (RAG)
- OpenAI Embeddings
- Anthropic Claude Sonnet
- Web Speech API
- jspdf / html2canvas (PDF)

## Backlog
- [ ] P1: Corrigir audio-to-text nativo (iOS/Android)
- [ ] P2: Aumentar cobertura de testes (chat flow completo com mocking)
- [ ] P3: Migrar `on_event` para `lifespan` handlers (FastAPI deprecation)
- [ ] P3: Corrigir `.dict()` → `.model_dump()` (Pydantic v2 deprecation)

## Endpoints Principais
- POST /api/auth/signup, /api/auth/login, /api/auth/mentor/signup, /api/auth/mentor/login
- GET/PUT /api/users/profile
- GET /api/mentors, /api/mentors/{id}
- POST /api/chat, GET /api/conversations, /api/conversations/{id}/messages
- POST /api/conversations/{id}/summarize
- POST /api/messages/{id}/feedback
- GET /api/search/universal
- GET /api/mentor/impactometer, /api/mentor/stats
- GET /api/mentor/analytics/queries, /ratings, /content, /feedback-details
- GET/DELETE /api/mentor/content/{id}, POST /api/mentor/content/bulk-delete

## Credenciais de Teste
- Email: teste@teste.com / Senha: 123456
