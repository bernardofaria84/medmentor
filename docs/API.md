# 📡 MedMentor API Documentation

## Base URL

```
Production: https://api.medmentor.com
Development: http://localhost:8001
```

## Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação. Todos os endpoints (exceto login e signup) requerem o token no header:

```http
Authorization: Bearer {seu-token-jwt}
```

---

## 🔐 Autenticação

### Cadastro de Usuário (Médico Assinante)

```http
POST /api/auth/signup/user
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "senha-segura-123",
  "full_name": "Dr. João Silva",
  "crm": "CRM-12345-SP",
  "specialty": "Cardiologia"  // opcional
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": "uuid-do-usuario",
  "user_type": "user"
}
```

**Errors:**
- `400`: Email já cadastrado
- `422`: Dados inválidos

---

### Cadastro de Mentor

```http
POST /api/auth/signup/mentor
```

**Request Body:**
```json
{
  "email": "mentor@example.com",
  "password": "senha-segura-123",
  "full_name": "Dr. Maria Santos",
  "specialty": "Cardiologia",
  "bio": "Especialista em cardiologia com 20 anos de experiência..."  // opcional
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": "uuid-do-mentor",
  "user_type": "mentor"
}
```

---

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "senha-123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": "uuid",
  "user_type": "user" // ou "mentor"
}
```

**Errors:**
- `401`: Credenciais inválidas

---

## 👤 Perfil de Usuário

### Obter Perfil

```http
GET /api/users/profile
```

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "doctor@example.com",
  "full_name": "Dr. João Silva",
  "crm": "CRM-12345-SP",
  "specialty": "Cardiologia",
  "profile_picture_url": null,
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### Atualizar Perfil

```http
PUT /api/users/profile
```

**Request Body:**
```json
{
  "full_name": "Dr. João Silva Junior",
  "specialty": "Cardiologia Intervencionista",
  "profile_picture_url": "data:image/png;base64,..."
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully"
}
```

---

## 👨‍⚕️ Mentores

### Listar Todos os Mentores

```http
GET /api/mentors
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "full_name": "Dr. Maria Silva",
    "specialty": "Cardiologia",
    "avatar_url": null,
    "bio": "Especialista em cardiologia..."
  },
  {
    "id": "uuid-2",
    "full_name": "Dr. João Santos",
    "specialty": "Neurologia",
    "avatar_url": null,
    "bio": "Expert em doenças neurodegenerativas..."
  }
]
```

---

### Obter Detalhes do Mentor

```http
GET /api/mentors/{mentor_id}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "mentor@example.com",
  "full_name": "Dr. Maria Silva",
  "specialty": "Cardiologia",
  "bio": "Especialista em cardiologia com 20 anos...",
  "avatar_url": null,
  "created_at": "2025-01-10T08:00:00Z"
}
```

---

### Obter Perfil do Mentor Logado

```http
GET /api/mentors/profile/me
```

**Headers:**
```http
Authorization: Bearer {token-mentor}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "mentor@example.com",
  "full_name": "Dr. Maria Silva",
  "specialty": "Cardiologia",
  "bio": "Especialista em cardiologia...",
  "avatar_url": null,
  "created_at": "2025-01-10T08:00:00Z"
}
```

---

### Atualizar Perfil do Mentor

```http
PUT /api/mentors/profile
```

**Request Body:**
```json
{
  "full_name": "Dr. Maria Silva Costa",
  "specialty": "Cardiologia e Hemodinâmica",
  "bio": "Atualização da biografia..."
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully"
}
```

---

## 💬 Chat e Conversas

### Enviar Mensagem (Chat com Mentor Bot)

```http
POST /api/chat
```

**Request Body:**
```json
{
  "mentor_id": "uuid-do-mentor",
  "question": "Quais são os principais sintomas de insuficiência cardíaca?",
  "conversation_id": "uuid-conversa"  // opcional, para continuar conversa existente
}
```

**Response (200):**
```json
{
  "conversation_id": "uuid-nova-ou-existente",
  "message_id": "uuid-mensagem",
  "response": "A insuficiência cardíaca apresenta sintomas como dispneia [source_1], fadiga [source_2], edema periférico [source_1]...",
  "citations": [
    {
      "source_id": "uuid-conteudo",
      "title": "Guia de Cardiologia",
      "excerpt": "A insuficiência cardíaca é caracterizada por..."
    }
  ],
  "mentor_name": "Dr. Maria Silva"
}
```

**Errors:**
- `403`: Apenas assinantes podem enviar mensagens
- `404`: Mentor não encontrado

---

### Listar Conversas do Usuário

```http
GET /api/conversations
```

**Response (200):**
```json
[
  {
    "id": "uuid-conversa",
    "mentor_id": "uuid-mentor",
    "mentor_name": "Dr. Maria Silva",
    "mentor_avatar": null,
    "title": "Quais são os principais sintomas de insu...",
    "last_message": "A insuficiência cardíaca apresenta...",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:35:00Z"
  }
]
```

---

### Obter Mensagens de uma Conversa

```http
GET /api/conversations/{conversation_id}/messages
```

**Response (200):**
```json
[
  {
    "id": "uuid-msg-1",
    "sender_type": "USER",
    "content": "Quais são os principais sintomas de insuficiência cardíaca?",
    "citations": [],
    "feedback": "NONE",
    "sent_at": "2025-01-15T10:30:00Z"
  },
  {
    "id": "uuid-msg-2",
    "sender_type": "MENTOR_BOT",
    "content": "A insuficiência cardíaca apresenta sintomas como...",
    "citations": [
      {
        "source_id": "uuid",
        "title": "Guia de Cardiologia",
        "excerpt": "Trecho relevante..."
      }
    ],
    "feedback": "LIKE",
    "sent_at": "2025-01-15T10:30:15Z"
  }
]
```

---

### Dar Feedback em Mensagem

```http
POST /api/messages/{message_id}/feedback?feedback=LIKE
```

**Query Parameters:**
- `feedback`: `LIKE`, `DISLIKE`, ou `NONE`

**Response (200):**
```json
{
  "message": "Feedback updated successfully"
}
```

---

## 📚 Gestão de Conteúdo (Mentores)

### Upload de Conteúdo

```http
POST /api/mentor/content/upload
```

**Headers:**
```http
Authorization: Bearer {token-mentor}
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (string): Título do conteúdo
- `file` (file): Arquivo PDF

**Response (200):**
```json
{
  "content_id": "uuid",
  "title": "Guia de Cardiologia Avançada",
  "status": "COMPLETED",
  "message": "Content uploaded and processed successfully. 45 chunks indexed."
}
```

**Errors:**
- `400`: Apenas PDFs são suportados
- `403`: Apenas mentores podem fazer upload
- `500`: Erro no processamento

---

### Listar Conteúdo do Mentor

```http
GET /api/mentor/content
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "Guia de Cardiologia",
    "content_type": "PDF",
    "status": "COMPLETED",
    "uploaded_at": "2025-01-10T09:00:00Z"
  },
  {
    "id": "uuid-2",
    "title": "Manual de Emergências",
    "content_type": "PDF",
    "status": "PROCESSING",
    "uploaded_at": "2025-01-15T10:00:00Z"
  }
]
```

---

## 📊 Analytics (Mentores)

### Analytics de Consultas

```http
GET /api/mentor/analytics/queries
```

**Response (200):**
```json
{
  "total_queries": 150,
  "daily_data": [
    {"date": "2025-01-01", "count": 5},
    {"date": "2025-01-02", "count": 8}
  ],
  "hourly_distribution": [0, 0, 0, 2, 5, 8, 12, 15, ...],
  "recent_queries": [
    {
      "date": "2025-01-15T10:30:00Z",
      "question": "Quais são os principais sintomas...",
      "response_preview": "A insuficiência cardíaca apresenta..."
    }
  ],
  "weekly_growth": 15.5,
  "last_week_total": 45,
  "previous_week_total": 39
}
```

---

### Analytics de Avaliações

```http
GET /api/mentor/analytics/ratings
```

**Response (200):**
```json
{
  "total_feedbacks": 120,
  "like_count": 102,
  "dislike_count": 18,
  "like_percentage": 85.0,
  "dislike_percentage": 15.0,
  "average_rating": 4.25,
  "rating_timeline": [
    {"date": "2025-01-01", "rating": 4.2},
    {"date": "2025-01-02", "rating": 4.3}
  ],
  "best_responses": [
    {
      "content": "Resposta bem avaliada...",
      "date": "2025-01-15T10:30:00Z",
      "citations_count": 3
    }
  ]
}
```

---

### Analytics de Conteúdo

```http
GET /api/mentor/analytics/content
```

**Response (200):**
```json
{
  "total_content": 5,
  "status_distribution": {
    "COMPLETED": 4,
    "PROCESSING": 1,
    "ERROR": 0,
    "UPLOADING": 0
  },
  "content_details": [
    {
      "id": "uuid",
      "title": "Guia de Cardiologia",
      "type": "PDF",
      "status": "COMPLETED",
      "uploaded_at": "2025-01-10T09:00:00Z",
      "chunks_count": 45
    }
  ],
  "upload_timeline": [
    {"date": "2025-01-10", "count": 1},
    {"date": "2025-01-11", "count": 2}
  ],
  "top_content": [
    {"title": "Guia de Cardiologia", "usage_count": 45},
    {"title": "Manual de Emergências", "usage_count": 38}
  ],
  "total_chunks": 203
}
```

---

### Dashboard Stats

```http
GET /api/mentor/stats
```

**Response (200):**
```json
{
  "total_queries": 150,
  "average_rating": 4.25,
  "total_content": 5,
  "top_topics": []
}
```

---

## 🏥 Health Check

```http
GET /api/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "service": "MedMentor API"
}
```

---

## ❌ Códigos de Erro

| Código | Descrição |
|--------|----------|
| 200 | Sucesso |
| 400 | Requisição inválida |
| 401 | Não autorizado (token inválido/expirado) |
| 403 | Acesso negado (permissões insuficientes) |
| 404 | Recurso não encontrado |
| 422 | Dados inválidos (validação falhou) |
| 500 | Erro interno do servidor |

---

## 📝 Notas Importantes

1. **Rate Limiting**: Em produção, implemente rate limiting (ex: 100 req/min por IP)
2. **CORS**: Configurado para aceitar todas as origens em desenvolvimento
3. **Tokens JWT**: Expiram em 24 horas por padrão
4. **Uploads**: Limite de 50MB por arquivo
5. **Paginação**: Implementar para listas grandes em produção

---

## 🔧 Exemplos de Uso

### Python

```python
import requests

# Login
response = requests.post(
    "http://localhost:8001/api/auth/login",
    json={"email": "doctor@example.com", "password": "password123"}
)
token = response.json()["access_token"]

# Listar mentores
headers = {"Authorization": f"Bearer {token}"}
mentors = requests.get(
    "http://localhost:8001/api/mentors",
    headers=headers
).json()
```

### JavaScript/TypeScript

```javascript
// Login
const response = await fetch('http://localhost:8001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@example.com',
    password: 'password123'
  })
});
const { access_token } = await response.json();

// Enviar mensagem
const chatResponse = await fetch('http://localhost:8001/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mentor_id: 'uuid-do-mentor',
    question: 'Qual o tratamento para hipertensão?'
  })
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com","password":"password123"}'

# Upload de conteúdo
curl -X POST http://localhost:8001/api/mentor/content/upload \
  -H "Authorization: Bearer {token}" \
  -F "title=Guia de Cardiologia" \
  -F "file=@/path/to/document.pdf"
```

---

**Documentação gerada automaticamente via Swagger UI**: `http://localhost:8001/docs`
