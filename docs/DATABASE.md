# 🗄️ MedMentor - Database Schema

## Banco de Dados: MongoDB

### Visão Geral

O MedMentor utiliza **MongoDB** como banco de dados NoSQL. A estrutura é baseada em collections (equivalentes a tabelas em SQL) com documentos JSON flexíveis.

**Nome do Banco**: `medmentor_db`

---

## Collections

### 1. **users** - Médicos Assinantes

**Descrição**: Armazena informações dos médicos que usam o app mobile.

**Schema**:
```javascript
{
  _id: String (UUID),              // Chave primária
  email: String (unique),          // Email do usuário
  password_hash: String,           // Senha hasheada com bcrypt
  full_name: String,               // Nome completo
  crm: String,                     // Número do CRM
  specialty: String (optional),    // Especialidade médica
  profile_picture_url: String (optional),  // URL da foto (base64)
  created_at: Date,                // Data de criação
  updated_at: Date                 // Data da última atualização
}
```

**Exemplo**:
```json
{
  "_id": "7bc359ee-5d51-4eca-a54b-a8fda5f4be5d",
  "email": "doctor@example.com",
  "password_hash": "$2b$12$Kix...",
  "full_name": "Dr. João Silva",
  "crm": "CRM-12345-SP",
  "specialty": "Cardiologia",
  "profile_picture_url": null,
  "created_at": "2025-01-15T10:00:00.000Z",
  "updated_at": "2025-01-15T10:00:00.000Z"
}
```

**Índices**:
```javascript
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "created_at": -1 })
```

---

### 2. **mentors** - Médicos Mentores

**Descrição**: Armazena informações dos mentores que criam conteúdo.

**Schema**:
```javascript
{
  _id: String (UUID),
  email: String (unique),
  password_hash: String,
  full_name: String,
  specialty: String,
  bio: String (optional),
  avatar_url: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Exemplo**:
```json
{
  "_id": "00ac0a6f-12d4-4e9b-afee-85b003cbea35",
  "email": "dr.cardiology@medmentor.com",
  "password_hash": "$2b$12$...",
  "full_name": "Dr. Maria Silva",
  "specialty": "Cardiologia",
  "bio": "Cardiologista renomada com 20 anos de experiência...",
  "avatar_url": null,
  "created_at": "2025-01-10T08:00:00.000Z",
  "updated_at": "2025-01-10T08:00:00.000Z"
}
```

**Índices**:
```javascript
db.mentors.createIndex({ "email": 1 }, { unique: true })
db.mentors.createIndex({ "specialty": 1 })
db.mentors.createIndex({ "created_at": -1 })
```

---

### 3. **mentor_content** - Conteúdo dos Mentores

**Descrição**: Armazena metadados dos conteúdos enviados (PDFs, vídeos, etc).

**Schema**:
```javascript
{
  _id: String (UUID),
  mentor_id: String,                    // FK para mentors._id
  title: String,
  content_type: String,                 // "PDF", "VIDEO", "AUDIO", "TEXT"
  status: String,                       // "UPLOADING", "PROCESSING", "COMPLETED", "ERROR"
  original_file_url: String (optional), // Referência GridFS
  processed_text: String (optional),    // Texto extraído
  uploaded_at: Date
}
```

**Exemplo**:
```json
{
  "_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "mentor_id": "00ac0a6f-12d4-4e9b-afee-85b003cbea35",
  "title": "Guia de Cardiologia Avançada",
  "content_type": "PDF",
  "status": "COMPLETED",
  "original_file_url": "67890abcdef12345",
  "processed_text": "Conteúdo completo do PDF...",
  "uploaded_at": "2025-01-12T14:30:00.000Z"
}
```

**Índices**:
```javascript
db.mentor_content.createIndex({ "mentor_id": 1 })
db.mentor_content.createIndex({ "status": 1 })
db.mentor_content.createIndex({ "uploaded_at": -1 })
```

---

### 4. **content_chunks** - Chunks Indexados (RAG)

**Descrição**: Armazena os chunks de texto com seus embeddings para busca vetorial.

**Schema**:
```javascript
{
  _id: ObjectId,                   // MongoDB ObjectId automático
  content_id: String,              // FK para mentor_content._id
  mentor_id: String,               // FK para mentors._id
  title: String,                   // Título do conteúdo original
  chunk_index: Integer,            // Índice do chunk no documento
  text: String,                    // Texto do chunk (~500 tokens)
  embedding: Array[Float],         // Vetor de embedding (3072 dimensões)
  created_at: Date
}
```

**Exemplo**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "content_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "mentor_id": "00ac0a6f-12d4-4e9b-afee-85b003cbea35",
  "title": "Guia de Cardiologia Avançada",
  "chunk_index": 0,
  "text": "A insuficiência cardíaca é uma síndrome clínica complexa...",
  "embedding": [0.123, -0.456, 0.789, ...],  // 3072 valores
  "created_at": "2025-01-12T14:35:00.000Z"
}
```

**Índices**:
```javascript
db.content_chunks.createIndex({ "mentor_id": 1 })
db.content_chunks.createIndex({ "content_id": 1 })
db.content_chunks.createIndex({ "created_at": -1 })
```

**Nota**: Para busca vetorial eficiente em produção, considere usar MongoDB Atlas Vector Search ou migrar para Pinecone/Weaviate.

---

### 5. **conversations** - Conversas

**Descrição**: Armazena as conversas entre usuários e bots de mentores.

**Schema**:
```javascript
{
  _id: String (UUID),
  user_id: String,          // FK para users._id
  mentor_id: String,        // FK para mentors._id
  title: String,            // Título da conversa (primeira pergunta)
  created_at: Date,
  updated_at: Date          // Atualizado a cada nova mensagem
}
```

**Exemplo**:
```json
{
  "_id": "conv-uuid-1234",
  "user_id": "7bc359ee-5d51-4eca-a54b-a8fda5f4be5d",
  "mentor_id": "00ac0a6f-12d4-4e9b-afee-85b003cbea35",
  "title": "Quais são os principais sintomas de insuficiência...",
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:35:00.000Z"
}
```

**Índices**:
```javascript
db.conversations.createIndex({ "user_id": 1, "updated_at": -1 })
db.conversations.createIndex({ "mentor_id": 1 })
db.conversations.createIndex({ "created_at": -1 })
```

---

### 6. **messages** - Mensagens

**Descrição**: Armazena as mensagens individuais dentro de conversas.

**Schema**:
```javascript
{
  _id: String (UUID),
  conversation_id: String,       // FK para conversations._id
  sender_type: String,           // "USER" ou "MENTOR_BOT"
  content: String,               // Conteúdo da mensagem
  citations: Array[Object],      // Array de citações (apenas para bot)
  feedback: String,              // "LIKE", "DISLIKE", "NONE"
  sent_at: Date
}
```

**Exemplo (Mensagem do Usuário)**:
```json
{
  "_id": "msg-uuid-user-1",
  "conversation_id": "conv-uuid-1234",
  "sender_type": "USER",
  "content": "Quais são os principais sintomas de insuficiência cardíaca?",
  "citations": [],
  "feedback": "NONE",
  "sent_at": "2025-01-15T10:30:00.000Z"
}
```

**Exemplo (Mensagem do Bot)**:
```json
{
  "_id": "msg-uuid-bot-1",
  "conversation_id": "conv-uuid-1234",
  "sender_type": "MENTOR_BOT",
  "content": "A insuficiência cardíaca apresenta sintomas como dispneia [source_1], fadiga [source_2]...",
  "citations": [
    {
      "source_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
      "title": "Guia de Cardiologia",
      "excerpt": "A insuficiência cardíaca é caracterizada por..."
    }
  ],
  "feedback": "LIKE",
  "sent_at": "2025-01-15T10:30:15.000Z"
}
```

**Índices**:
```javascript
db.messages.createIndex({ "conversation_id": 1, "sent_at": 1 })
db.messages.createIndex({ "sender_type": 1, "feedback": 1 })
db.messages.createIndex({ "sent_at": -1 })
```

---

## GridFS - Armazenamento de Arquivos

**Collections Automáticas**:
- `fs.files`: Metadados dos arquivos
- `fs.chunks`: Chunks binários dos arquivos

**Uso**: Armazena PDFs e outros arquivos grandes (>16MB).

**Exemplo de Referência**:
```javascript
// Upload
const fileId = fs.put(fileBuffer, {
  filename: "document.pdf",
  contentType: "application/pdf",
  content_id: "uuid-do-conteudo"
});

// Download
const fileBuffer = fs.get(fileId);
```

---

## Relacionamentos

```
users (1) ---< (N) conversations
mentors (1) ---< (N) conversations
mentors (1) ---< (N) mentor_content
mentor_content (1) ---< (N) content_chunks
conversations (1) ---< (N) messages
```

**Diagrama**:
```
      users                    mentors
        |                         |
        |                         |
        +-----------+-------------+
                    |
              conversations
                    |
                 messages

                 mentors
                    |
              mentor_content
                    |
              content_chunks
```

---

## Scripts de Setup

### Criar Índices

```javascript
// users
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "created_at": -1 });

// mentors
db.mentors.createIndex({ "email": 1 }, { unique: true });
db.mentors.createIndex({ "specialty": 1 });
db.mentors.createIndex({ "created_at": -1 });

// mentor_content
db.mentor_content.createIndex({ "mentor_id": 1 });
db.mentor_content.createIndex({ "status": 1 });
db.mentor_content.createIndex({ "uploaded_at": -1 });

// content_chunks
db.content_chunks.createIndex({ "mentor_id": 1 });
db.content_chunks.createIndex({ "content_id": 1 });
db.content_chunks.createIndex({ "created_at": -1 });

// conversations
db.conversations.createIndex({ "user_id": 1, "updated_at": -1 });
db.conversations.createIndex({ "mentor_id": 1 });
db.conversations.createIndex({ "created_at": -1 });

// messages
db.messages.createIndex({ "conversation_id": 1, "sent_at": 1 });
db.messages.createIndex({ "sender_type": 1, "feedback": 1 });
db.messages.createIndex({ "sent_at": -1 });
```

### Seed de Dados (Python)

Ver arquivo: `/backend/seed_data.py`

---

## Migração e Backup

### Backup do Banco

```bash
# Exportar todas as collections
mongodump --uri="mongodb://localhost:27017/medmentor_db" --out=/backup/medmentor-$(date +%Y%m%d)

# Exportar collection específica
mongodump --uri="mongodb://localhost:27017/medmentor_db" --collection=users --out=/backup
```

### Restore do Banco

```bash
# Restaurar todas as collections
mongorestore --uri="mongodb://localhost:27017/medmentor_db" /backup/medmentor-20250115

# Restaurar collection específica
mongorestore --uri="mongodb://localhost:27017/medmentor_db" --collection=users /backup/medmentor_db/users.bson
```

### Export para JSON

```bash
# Exportar para JSON legível
mongoexport --uri="mongodb://localhost:27017/medmentor_db" --collection=users --out=users.json --pretty
```

---

## Considerações de Produção

### 1. **Escalabilidade**
- Use **MongoDB Atlas** (cloud) para gerenciamento automático
- Configure **Replica Sets** para alta disponibilidade
- Implemente **Sharding** quando ultrapassar 100GB

### 2. **Performance**
- Monitore queries lentas com `db.setProfilingLevel(1)`
- Use **projection** para buscar apenas campos necessários
- Implemente **paginação** em listagens grandes
- Cache de queries frequentes (Redis)

### 3. **Segurança**
- Habilite **autenticação** no MongoDB
- Use **SSL/TLS** para conexões
- Crie usuários com privilégios mínimos
- Backup automático diário

### 4. **Monitoramento**
- Configure alertas para uso de disco
- Monitore latência de queries
- Acompanhe taxa de crescimento

---

## Estatísticas do Banco

### Comandos Úteis

```javascript
// Tamanho do banco
db.stats();

// Estatísticas de uma collection
db.users.stats();

// Contar documentos
db.users.countDocuments();

// Índices de uma collection
db.users.getIndexes();

// Queries lentas (profiling)
db.system.profile.find().sort({ts: -1}).limit(10).pretty();
```

---

**Documentação oficial MongoDB**: https://docs.mongodb.com/
