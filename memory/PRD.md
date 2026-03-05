# MedMentor - Product Requirements Document

## Visão Geral
Plataforma de mentoria médica com IA que conecta médicos assinantes a mentores especialistas. O mentor alimenta a plataforma com conteúdo (PDFs), e a IA responde consultas usando RAG sobre esse conteúdo.

## Personas
- **Médico Assinante**: faz perguntas clínicas ao mentor via chat (texto/áudio)
- **Médico Mentor**: especialista que alimenta a plataforma com conteúdo e responde indiretamente via IA

## Arquitetura
```
/app
├── backend/
│   ├── main.py
│   ├── dependencies.py
│   ├── models.py
│   ├── routers/
│   │   ├── auth.py         # /api/auth/login, /api/auth/mentor/login
│   │   ├── users.py        # /api/users/profile (GET/PUT)
│   │   ├── mentors.py      # /api/mentors, /api/mentors/profile/me
│   │   ├── chat.py         # /api/conversations, /api/chat
│   │   └── analytics.py    # /api/mentor/impactometer
│   └── tests/              # pytest suite ~70% coverage
├── frontend/
│   ├── app/
│   │   ├── (auth)/login.tsx          # Login subscriber (com onboarding redirect)
│   │   ├── (auth)/signup.tsx
│   │   ├── (mentor)/login.tsx        # Login mentor
│   │   ├── (tabs)/
│   │   │   ├── home.tsx              # Lista de mentores
│   │   │   ├── history.tsx           # Histórico + busca + Continue/Nova Consulta
│   │   │   ├── saved.tsx             # Aba de mensagens salvas (NEW)
│   │   │   └── profile.tsx           # Perfil + upload de avatar
│   │   ├── chat/[mentorId].tsx       # Nova conversa + bookmarks
│   │   ├── conversation/[conversationId].tsx  # Continuar conversa + bookmarks
│   │   └── onboarding.tsx            # Onboarding 3 slides (NEW)
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Multi-user login (subscriber/mentor)
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useAudioRecorder.ts       # Web Speech API com auto-restart (3 min)
│   │   └── useBookmarks.ts           # AsyncStorage bookmarks (NEW)
│   ├── services/
│   │   └── api.ts                    # API service (process.env.EXPO_PUBLIC_BACKEND_URL)
│   └── auto-repair.sh               # Self-healing script para dependências
```

## Stack Técnica
- **Frontend**: Expo 54, React Native, Expo Router, react-native-paper
- **Backend**: FastAPI (modular), Motor (async MongoDB)
- **DB**: MongoDB
- **IA**: OpenAI GPT-3.5 + Embeddings, Anthropic Claude Sonnet
- **DevOps**: Supervisor, auto-repair.sh

## Credenciais de Teste
- **Assinante**: goulart.faria@gmail.com / MedMentor@2025
- **Mentor**: dra.priscillafrauches@medmentor.com / MedMentor@2025
- **Test Subscriber**: doctor@example.com / password123

## O que foi implementado

### Estabilidade e Infraestrutura (sessões anteriores)
- [x] Backend modular FastAPI (routers separados)
- [x] Suite pytest com ~70% de cobertura
- [x] Script auto-repair.sh para self-healing do frontend
- [x] Fix: login flows subscriber vs mentor (redirecionamentos corretos)
- [x] Fix: processamento de PDFs (crash resolvido)
- [x] Fix: perfis de mentor gerados em pt-BR
- [x] Fix: endpoints save/approve do perfil do mentor
- [x] Fix: URL de API no bundle (cache Metro com URL antiga)

### Features de UX/UI (implementadas 2026-03-05)
- [x] **Gravação de áudio**: auto-restart com nova instância a cada sessão Web Speech API (3 min)
- [x] **Fix duplicação de texto no áudio**: `lastProcessedFinalIndex` evita re-processar resultados finalizados
- [x] **Busca no histórico**: campo de busca existente com botões "Continuar" e "Nova Consulta" em cada card
- [x] **Favoritar respostas**: hook useBookmarks (AsyncStorage) + aba "Salvos" + ícone nos messages
- [x] **Markdown nas mensagens**: react-native-markdown-display em ambos os chat screens
- [x] **Avatar/foto de perfil**: upload via file input nativo web, compressão em canvas, salvo como base64
- [x] **Onboarding**: 3 slides com ícones e navegação, exibido apenas na primeira vez (AsyncStorage flag)
- [x] **Tab order**: Início → Histórico → Salvos → Perfil

## Backlog

### P1 - Alta Prioridade
- [ ] Transcrição de áudio nativo iOS/Android (endpoint /api/transcribe está depreciado)
  - Solução: Integrar OpenAI Whisper no backend

### P2 - Média Prioridade
- [ ] Exportar conversa como PDF
- [ ] Dark mode toggle visível na UI de perfil
- [ ] Notificações push quando nova conversa inicia

### P3 - Backlog
- [ ] Status do mentor nas consultas (fonte do conhecimento usada)
- [ ] Busca avançada por conteúdo das mensagens (via backend /api/search/universal)
- [ ] Pydantic v2 migration no backend
