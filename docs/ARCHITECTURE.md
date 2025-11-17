# 🏗️ MedMentor - Arquitetura do Sistema

## Visão Geral

MedMentor é uma aplicação full-stack moderna que utiliza arquitetura de microsserviços com separação clara entre frontend, backend e camada de dados.

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APRESENTAÇÃO                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────┐     │
│  │   Mobile App (Expo)  │        │   Web Portal         │     │
│  │   - React Native     │        │   - Expo Web         │     │
│  │   - iOS/Android      │        │   - Mentores         │     │
│  │   - Médicos          │        │   - Dashboard        │     │
│  └──────────────────────┘        └──────────────────────┘     │
│           │                                │                    │
│           └────────────────┬───────────────┘                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CAMADA DE API                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────────┐                          │
│                    │   API Gateway   │                          │
│                    │   (FastAPI)     │                          │
│                    └─────────────────┘                          │
│                            │                                     │
│           ┌────────────────┼────────────────┐                   │
│           │                │                │                   │
│    ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐           │
│    │   Auth      │  │    RAG    │  │  Analytics  │           │
│    │   Service   │  │  Service  │  │   Service   │           │
│    └─────────────┘  └───────────┘  └─────────────┘           │
│           │                │                │                   │
└───────────┼────────────────┼────────────────┼───────────────────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE DADOS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   MongoDB    │    │   GridFS     │    │  Vector DB   │    │
│  │  (Principal) │    │  (Storage)   │    │  (Embeddings)│    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVIÇOS EXTERNOS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐                          │
│  │  OpenAI API  │    │   AWS S3     │                          │
│  │  (GPT-4)     │    │  (Future)    │                          │
│  └──────────────┘    └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes Principais

### 1. Frontend (Expo)

**Tecnologias**:
- React Native 0.79
- Expo SDK 54
- Expo Router (file-based routing)
- React Native Paper (UI)

**Estrutura**:
```
app/
├── (auth)/           # Autenticação
│   ├── login.tsx
│   └── signup.tsx
├── (tabs)/           # App mobile
│   ├── home.tsx
│   ├── history.tsx
│   └── profile.tsx
├── (mentor)/         # Portal do mentor
│   ├── dashboard.tsx
│   ├── content.tsx
│   ├── upload.tsx
│   └── analytics-*.tsx
├── chat/             # Chat screens
└── conversation/     # Conversation view
```

**Responsabilidades**:
- Interface do usuário
- Gestão de estado local (Context API)
- Comunicação com backend via REST
- Armazenamento offline (AsyncStorage)

---

### 2. Backend (FastAPI)

**Tecnologias**:
- FastAPI 0.110+
- Python 3.11+
- Motor (MongoDB async)
- Uvicorn (ASGI server)

**Estrutura**:
```
backend/
├── server.py              # API principal
├── models.py              # Modelos Pydantic
├── auth_utils.py          # JWT & Auth
├── rag_service.py         # RAG (IA)
├── analytics_service.py   # Analytics
└── seed_data.py           # Seed DB
```

**Módulos**:

#### a) Auth Service
- JWT token generation/validation
- Password hashing (bcrypt)
- User/Mentor authentication
- Session management

#### b) RAG Service
- PDF text extraction (PyPDF2)
- Text chunking (500 tokens)
- Embedding generation (OpenAI)
- Vector similarity search
- Response generation (GPT-4)

#### c) Analytics Service
- Query analytics (daily/hourly)
- Rating analytics (feedback)
- Content analytics (usage)
- Statistical calculations

---

### 3. Banco de Dados (MongoDB)

**Collections**:
- `users` - Médicos assinantes
- `mentors` - Médicos mentores
- `mentor_content` - Conteúdos
- `content_chunks` - Chunks + embeddings
- `conversations` - Conversas
- `messages` - Mensagens

**GridFS**:
- Armazenamento de PDFs (>16MB)
- `fs.files` e `fs.chunks`

---

## Fluxos de Dados

### Fluxo 1: Upload de Conteúdo

```
1. Mentor faz upload de PDF no portal web
   ↓
2. Frontend envia arquivo para /api/mentor/content/upload
   ↓
3. Backend salva PDF no GridFS
   ↓
4. Backend extrai texto do PDF (PyPDF2)
   ↓
5. Texto é dividido em chunks de ~500 tokens
   ↓
6. Para cada chunk:
   - Gera embedding via OpenAI
   - Salva em content_chunks com embedding
   ↓
7. Marca conteúdo como COMPLETED
   ↓
8. Retorna sucesso para frontend
```

### Fluxo 2: Chat com Mentor Bot (RAG)

```
1. Usuário envia pergunta no app mobile
   ↓
2. Frontend envia para /api/chat
   ↓
3. Backend gera embedding da pergunta
   ↓
4. Busca top-5 chunks similares (cosine similarity)
   ↓
5. Monta prompt com contexto:
   - Instrução do sistema
   - Chunks relevantes
   - Pergunta do usuário
   ↓
6. Envia para GPT-4 via OpenAI
   ↓
7. Recebe resposta com citações
   ↓
8. Salva mensagens no banco
   ↓
9. Retorna resposta para frontend
```

### Fluxo 3: Analytics

```
1. Mentor acessa dashboard analytics
   ↓
2. Frontend carrega dados de /api/mentor/analytics/*
   ↓
3. Backend agrega dados:
   - Queries: conta mensagens por dia/hora
   - Ratings: calcula médias e percentuais
   - Content: analisa uso por conteúdo
   ↓
4. Retorna dados estruturados
   ↓
5. Frontend renderiza gráficos
```

---

## Padrões de Design

### 1. Repository Pattern
- Abstração de acesso a dados
- Queries centralizadas
- Facilita testes

### 2. Service Layer
- Lógica de negócio isolada
- Reutilizável entre endpoints
- Testável independentemente

### 3. DTO Pattern
- Modelos Pydantic para validação
- Type safety
- Documentação automática

### 4. Context API (Frontend)
- Estado global compartilhado
- Evita prop drilling
- AuthContext para autenticação

---

## Segurança

### Autenticação
```
┌──────────┐        ┌──────────┐        ┌──────────┐
│  Client  │───────>│   API    │───────>│    DB    │
└──────────┘        └──────────┘        └──────────┘
     │                   │                    │
     │ 1. POST /login    │                    │
     │ email + password  │                    │
     │──────────────────>│                    │
     │                   │ 2. Verify password │
     │                   │───────────────────>│
     │                   │<───────────────────│
     │                   │ 3. Generate JWT    │
     │<──────────────────│                    │
     │   JWT token       │                    │
     │                   │                    │
     │ 4. API requests   │                    │
     │ + Bearer token    │                    │
     │──────────────────>│ 5. Validate JWT    │
     │                   │ 6. Process request │
     │<──────────────────│                    │
```

### Camadas de Segurança

1. **Transport Layer**
   - HTTPS obrigatório em produção
   - SSL/TLS certificates

2. **Application Layer**
   - JWT tokens (24h expiration)
   - Bcrypt password hashing
   - Input validation (Pydantic)
   - CORS configurado

3. **Database Layer**
   - MongoDB authentication
   - Network isolation
   - Backup automático

---

## Escalabilidade

### Horizontal Scaling

**Backend**:
```
       Load Balancer
            │
    ┌───────┼───────┐
    │       │       │
  API-1   API-2   API-3
    │       │       │
    └───────┼───────┘
            │
       MongoDB
```

**Estratégias**:
- Stateless API (JWT em cada request)
- MongoDB Replica Set
- Redis para cache (futuro)
- CDN para assets estáticos

### Vertical Scaling
- Aumentar recursos do servidor
- Otimizar queries MongoDB
- Implementar índices eficientes

---

## Performance

### Otimizações Implementadas

1. **Backend**
   - Async/await (FastAPI + Motor)
   - Connection pooling (MongoDB)
   - Pydantic validation cache

2. **Frontend**
   - Code splitting (Expo Router)
   - Lazy loading de telas
   - Image optimization
   - AsyncStorage para cache

3. **Database**
   - Índices em campos frequentes
   - Projection (buscar apenas campos necessários)
   - Agregação eficiente

### Métricas
- API response time: <200ms (média)
- Chat response: 2-5s (depende do LLM)
- Dashboard load: <1s
- Mobile app size: ~50MB

---

## Monitoramento

### Logs
```python
# Backend logging
import logging

logger = logging.getLogger(__name__)
logger.info("API request processed")
logger.error("Database error", exc_info=True)
```

### Métricas Importantes
- Request rate (req/min)
- Error rate (%)
- Response time (p50, p95, p99)
- Database connections
- Memory usage
- CPU usage

### Ferramentas Recomendadas
- **Logs**: CloudWatch, ELK Stack
- **APM**: New Relic, Datadog
- **Uptime**: Pingdom, UptimeRobot
- **Errors**: Sentry

---

## Deployment

### Ambientes

```
Development → Staging → Production
    ↓            ↓          ↓
  Local      Test Env    AWS
```

### CI/CD Pipeline

```
1. Git Push
   ↓
2. GitHub Actions / GitLab CI
   ↓
3. Run Tests
   ↓
4. Build Docker Image
   ↓
5. Push to Registry
   ↓
6. Deploy to Environment
   ↓
7. Health Check
   ↓
8. Notify Team
```

---

## Tecnologias Futuras

### Short-term
- Redis (cache)
- WebSockets (real-time)
- Elasticsearch (busca avançada)
- Weaviate/Pinecone (vector DB dedicado)

### Long-term
- Kubernetes (orquestração)
- GraphQL (alternativa REST)
- gRPC (comunicação interna)
- Kafka (event streaming)

---

## Decisões Arquiteturais

### Por que FastAPI?
- Performance superior (async)
- Type hints nativos
- Documentação automática (Swagger)
- Validação com Pydantic
- Comunidade ativa

### Por que Expo?
- Desenvolvimento rápido
- Code sharing (iOS/Android/Web)
- Hot reload
- Over-the-air updates
- Ecossistema rico

### Por que MongoDB?
- Schema flexível
- Escalável horizontalmente
- JSON nativo
- GridFS para arquivos
- Atlas (cloud managed)

### Por que OpenAI?
- GPT-4 state-of-the-art
- Embeddings de alta qualidade
- API estável e documentada
- Suporte empresarial

---

## Limitações Conhecidas

1. **Vector Search**: Implementado em Python (cosine similarity). Para produção em escala, migrar para Weaviate/Pinecone.

2. **File Storage**: GridFS adequado para MVP. Para produção, considerar S3 + CloudFront.

3. **Real-time**: Não há atualizações em tempo real. Implementar WebSockets para notificações.

4. **Rate Limiting**: Não implementado. Adicionar em produção.

5. **Caching**: Sem camada de cache. Redis recomendado para queries frequentes.

---

## Referências

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)
- [OpenAI API Reference](https://platform.openai.com/docs/)
