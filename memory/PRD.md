# MedMentor - Product Requirements Document

## Visão Geral
Plataforma de mentoria médica com IA que conecta médicos assinantes a mentores especialistas. O mentor alimenta a plataforma com conteúdo (PDFs), e a IA responde consultas usando RAG sobre esse conteúdo.

## Personas
- **Médico Assinante**: faz perguntas clínicas ao mentor via chat (texto/áudio)
- **Médico Mentor**: especialista que alimenta a plataforma com conteúdo e responde indiretamente via IA

## Identidade Visual (Brand Guidelines 2026)
- **Cor Primária**: #0D7377 (Teal)
- **Azul Marinho**: #14213D (texto principal)
- **Acento Ciano**: #00B4D8
- **Branco Suave**: #F8FAFB (background)
- **Cinza Neutro**: #6B7280
- **Tipografia**: Inter Bold (headings) + Inter Regular (body)
- **Logo**: Ícone de cruz médica com circuitos + "MedMentor"

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
│   │   ├── chat.py         # /api/conversations, /api/chat, /api/transcribe (Whisper)
│   │   └── analytics.py    # /api/mentor/impactometer
│   └── tests/              # pytest suite ~70% coverage
├── frontend/
│   ├── app/
│   │   ├── (auth)/login.tsx          # Login subscriber + BrandLogo LARGE
│   │   ├── (auth)/signup.tsx
│   │   ├── (mentor)/login.tsx        # Login mentor + BrandLogo LARGE
│   │   ├── (tabs)/
│   │   │   ├── home.tsx              # Grid 2 colunas + saudação personalizada
│   │   │   ├── history.tsx           # Histórico + busca + Continue/Nova Consulta
│   │   │   ├── saved.tsx             # Aba de mensagens salvas
│   │   │   └── profile.tsx           # Perfil + upload de avatar
│   │   ├── chat/[mentorId].tsx       # Nova conversa + bookmarks + WhisperSpinner
│   │   ├── conversation/[conversationId].tsx  # Continuar conversa + WhisperSpinner
│   │   └── onboarding.tsx            # Onboarding 3 slides
│   ├── components/
│   │   ├── BrandLogo.tsx             # SVG circuit-board cross logo (3 sizes)
│   │   ├── WhisperSpinner.tsx        # Animated 3-bar spinner para transcrição
│   │   └── EmptyState.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Multi-user login (subscriber/mentor)
│   │   └── ThemeContext.tsx          # Brand colors: primary=#0D7377, secondary=#00B4D8
│   ├── hooks/
│   │   ├── useAudioRecorder.ts       # MediaRecorder + Whisper backend (web)
│   │   └── useBookmarks.ts           # AsyncStorage bookmarks
│   ├── services/
│   │   └── api.ts                    # API service
│   └── auto-repair.sh               # Self-healing script
```

## Stack Técnica
- **Frontend**: Expo 54, React Native, Expo Router, react-native-paper, @expo-google-fonts/inter
- **Backend**: FastAPI (modular), Motor (async MongoDB)
- **DB**: MongoDB
- **IA**: OpenAI GPT-3.5 + Embeddings, Anthropic Claude Sonnet, OpenAI Whisper (transcrição)
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

### Features de UX/UI (2026-03-05)
- [x] **Busca no histórico**: campo de busca + botões "Continuar" e "Nova Consulta"
- [x] **Favoritar respostas**: hook useBookmarks + aba "Salvos" + ícone nos messages
- [x] **Markdown nas mensagens**: react-native-markdown-display
- [x] **Avatar/foto de perfil**: upload base64
- [x] **Onboarding**: 3 slides, exibido apenas na primeira vez
- [x] **Tab order**: Início → Histórico → Salvos → Perfil

### Transcrição de Áudio (2026-03-05)
- [x] Migração de Web Speech API → MediaRecorder + OpenAI Whisper backend (/api/transcribe)
- [x] Fix duplicação de texto: eliminação de Web Speech API

### Redesign Visual Brand Guidelines 2026 (2026-03-07)
- [x] **ThemeContext**: cores de marca aplicadas (primary #0D7377, secondary #00B4D8, text #14213D)
- [x] **BrandLogo.tsx**: componente SVG circuit-board cross (3 tamanhos)
- [x] **Login Assinante**: BrandLogo LARGE + branding completo
- [x] **Login Mentor**: BrandLogo LARGE + branding completo
- [x] **Home**: saudação personalizada "Bom dia/Boa tarde, Dr. [Nome]" + grid 2 colunas + botões "Consultar"
- [x] **WhisperSpinner.tsx**: indicador animado de transcrição de áudio
- [x] **Tipografia**: Inter Bold + Inter Regular via @expo-google-fonts/inter
- [x] **Todas as telas**: cores teal propagadas via ThemeContext

## Backlog

### P1 - Alta Prioridade
- [ ] **Limite de 3 min na gravação de áudio** (regressão após migração para MediaRecorder)
- [ ] **Transcrição nativa iOS/Android** (hook useAudioRecorder.ts caminho nativo quebrado)

### P2 - Média Prioridade
- [ ] Exportar conversa como PDF
- [ ] Toggle de Dark Mode visível no perfil
- [ ] Busca avançada por conteúdo das mensagens

### P3 - Backlog
- [ ] Rating system (1-5 estrelas) para respostas do mentor
- [ ] Notificações push
- [ ] Status da fonte do conhecimento nas consultas
- [ ] Aumentar cobertura de testes backend de ~70% para 90%+
