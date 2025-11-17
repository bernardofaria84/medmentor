# 🏥 MedMentor - Plataforma de Mentoria Médica com IA

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![Expo SDK 54](https://img.shields.io/badge/expo-SDK%2054-000020.svg)](https://expo.dev/)

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Execução](#execução)
- [Deployment](#deployment)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Documentation](#api-documentation)
- [Tecnologias](#tecnologias)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## 🎯 Visão Geral

MedMentor é uma plataforma inovadora que conecta médicos assinantes com o conhecimento especializado de médicos mentores através de assistentes de IA. Utilizando tecnologia RAG (Retrieval-Augmented Generation), a plataforma oferece consultas baseadas no acervo de conteúdo de cada mentor.

### 🌟 Principais Funcionalidades

- **App Mobile**: Interface nativa para iOS e Android
- **Portal Web**: Dashboard administrativo para mentores
- **IA Conversacional**: Chat inteligente baseado em RAG
- **Analytics Avançado**: Dashboard com métricas e gráficos
- **Gestão de Conteúdo**: Upload e processamento automático de PDFs
- **Sistema de Feedback**: Avaliação de respostas da IA

---

## ✨ Características

### Para Médicos Assinantes (Mobile App)
- ✅ Autenticação segura (JWT)
- ✅ Lista de mentores disponíveis
- ✅ Chat em tempo real com bots de IA
- ✅ Histórico de conversas
- ✅ Busca por especialidade
- ✅ Sistema de feedback (like/dislike)
- ✅ Perfil personalizável

### Para Médicos Mentores (Web Portal)
- ✅ Dashboard com estatísticas em tempo real
- ✅ Upload de conteúdo (PDFs)
- ✅ Gestão de materiais
- ✅ Analytics avançado:
  - Análise de consultas (gráficos diários e horários)
  - Análise de avaliações (feedback e evolução)
  - Análise de conteúdo (status e uso)
- ✅ Gerenciamento de perfil

### Sistema RAG (IA)
- ✅ Processamento automático de PDFs
- ✅ Chunking inteligente de conteúdo
- ✅ Geração de embeddings (OpenAI)
- ✅ Busca vetorial por similaridade
- ✅ Respostas com citações das fontes
- ✅ Contexto específico por mentor

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Expo)                      │
│  ┌──────────────┐           ┌──────────────┐          │
│  │  Mobile App  │           │  Web Portal  │          │
│  │  (iOS/Android)│           │  (Mentores)  │          │
│  └──────────────┘           └──────────────┘          │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓ REST API
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   Auth   │  │    RAG   │  │ Analytics│            │
│  │  Service │  │  Service │  │  Service │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (MongoDB)                     │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐│
│  │  Users  │ │ Mentors  │ │  Content  │ │ Messages ││
│  └─────────┘ └──────────┘ └───────────┘ └──────────┘│
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                          │
│  ┌────────────────┐        ┌──────────────┐           │
│  │ OpenAI API     │        │  GridFS      │           │
│  │ (GPT-4 + Embed)│        │  (Storage)   │           │
│  └────────────────┘        └──────────────┘           │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Pré-requisitos

### Software Necessário

- **Python**: 3.11 ou superior
- **Node.js**: 18.x ou superior
- **MongoDB**: 6.0 ou superior
- **Yarn**: 1.22 ou superior (gerenciador de pacotes)
- **Expo CLI**: Para desenvolvimento mobile

### Contas e Credenciais

- **OpenAI API Key** ou **Emergent LLM Key**
- **Conta Expo** (para build mobile)
- **MongoDB** (local ou MongoDB Atlas)

---

## 🚀 Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/medmentor.git
cd medmentor
```

### 2. Instale Dependências do Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Instale Dependências do Frontend

```bash
cd ../frontend
yarn install
```

---

## ⚙️ Configuração

### Backend (.env)

Crie um arquivo `.env` em `/backend`:

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=medmentor_db

# JWT Authentication
JWT_SECRET=seu-secret-key-super-seguro-aqui
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# OpenAI / Emergent LLM
EMERGENT_LLM_KEY=sk-emergent-seu-key-aqui
# OU
OPENAI_API_KEY=sk-seu-key-openai-aqui
```

### Frontend (.env)

Crie um arquivo `.env` em `/frontend`:

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

### MongoDB

**Opção 1: MongoDB Local**
```bash
# Instale MongoDB: https://www.mongodb.com/docs/manual/installation/
mongod --dbpath /caminho/para/dados
```

**Opção 2: MongoDB Atlas (Cloud)**
- Crie uma conta em https://www.mongodb.com/cloud/atlas
- Crie um cluster gratuito
- Obtenha a connection string
- Atualize `MONGO_URL` no `.env`

---

## 🏃 Execução

### Desenvolvimento

#### Backend
```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Acesse: http://localhost:8001/docs (Swagger UI)

#### Frontend
```bash
cd frontend
yarn start
```

Opções:
- Pressione `w` para abrir no navegador web
- Pressione `a` para abrir no Android emulator
- Pressione `i` para abrir no iOS simulator
- Escaneie o QR code com Expo Go app

### Seed do Banco de Dados

Popule o banco com dados de teste:

```bash
cd backend
python seed_data.py
```

Credenciais criadas:
- **Usuário**: doctor@example.com / password123
- **Mentor 1**: dr.cardiology@medmentor.com / password123
- **Mentor 2**: dr.neurology@medmentor.com / password123
- **Mentor 3**: dr.pediatrics@medmentor.com / password123

---

## 🚢 Deployment

### Backend (AWS)

**Ver documentação completa**: [docs/DEPLOYMENT_BACKEND.md](docs/DEPLOYMENT_BACKEND.md)

**Resumo:**
1. Configure EC2 ou Lambda
2. Instale dependências
3. Configure variáveis de ambiente
4. Use Nginx como reverse proxy
5. Configure SSL/TLS

### Frontend Mobile

**Ver documentação completa**: [docs/DEPLOYMENT_MOBILE.md](docs/DEPLOYMENT_MOBILE.md)

**Resumo:**
```bash
# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

### Frontend Web

```bash
cd frontend
EXPO_PUBLIC_BACKEND_URL=https://api.seudominio.com yarn build:web
```

Hostedar em:
- AWS S3 + CloudFront
- Vercel
- Netlify

---

## 📁 Estrutura do Projeto

```
medmentor/
├── backend/                    # Backend FastAPI
│   ├── server.py              # Aplicação principal
│   ├── models.py              # Modelos Pydantic
│   ├── auth_utils.py          # Autenticação JWT
│   ├── rag_service.py         # Serviço RAG (IA)
│   ├── analytics_service.py   # Serviço de Analytics
│   ├── seed_data.py           # Script de seed
│   ├── requirements.txt       # Dependências Python
│   └── .env                   # Variáveis de ambiente
│
├── frontend/                   # Frontend Expo
│   ├── app/                   # Rotas (Expo Router)
│   │   ├── (auth)/           # Telas de autenticação
│   │   ├── (tabs)/           # App mobile (tabs)
│   │   ├── (mentor)/         # Portal do mentor
│   │   ├── chat/             # Tela de chat
│   │   └── conversation/     # Conversa específica
│   ├── contexts/             # Context API
│   ├── services/             # Serviços de API
│   ├── assets/               # Imagens, ícones
│   ├── app.json              # Configuração Expo
│   ├── package.json          # Dependências Node
│   └── .env                  # Variáveis de ambiente
│
├── docs/                      # Documentação
│   ├── API.md                # Documentação da API
│   ├── ARCHITECTURE.md       # Arquitetura detalhada
│   ├── DEPLOYMENT_BACKEND.md # Deploy backend
│   ├── DEPLOYMENT_MOBILE.md  # Deploy mobile
│   └── DATABASE.md           # Schema do banco
│
├── scripts/                   # Scripts úteis
│   ├── deploy_backend.sh     # Deploy backend AWS
│   ├── deploy_frontend.sh    # Deploy frontend
│   └── backup_database.sh    # Backup MongoDB
│
├── .gitignore                # Arquivos ignorados
├── README.md                 # Este arquivo
└── LICENSE                   # Licença MIT
```

---

## 📚 API Documentation

### Base URL
```
Production: https://api.medmentor.com
Development: http://localhost:8001
```

### Autenticação

Todos os endpoints (exceto login/signup) requerem token JWT:

```bash
Authorization: Bearer {seu-token-jwt}
```

### Principais Endpoints

#### Autenticação
```http
POST /api/auth/signup/user       # Cadastro de usuário
POST /api/auth/signup/mentor     # Cadastro de mentor
POST /api/auth/login             # Login
```

#### Mentores
```http
GET  /api/mentors                # Listar mentores
GET  /api/mentors/{id}           # Detalhes do mentor
GET  /api/mentors/profile/me     # Perfil do mentor logado
PUT  /api/mentors/profile        # Atualizar perfil
```

#### Chat
```http
POST /api/chat                   # Enviar mensagem
GET  /api/conversations          # Listar conversas
GET  /api/conversations/{id}/messages  # Mensagens da conversa
```

#### Conteúdo
```http
POST /api/mentor/content/upload  # Upload de PDF
GET  /api/mentor/content         # Listar conteúdo
```

#### Analytics
```http
GET  /api/mentor/analytics/queries   # Análise de consultas
GET  /api/mentor/analytics/ratings   # Análise de avaliações
GET  /api/mentor/analytics/content   # Análise de conteúdo
```

**Documentação completa**: Acesse `/docs` quando o servidor estiver rodando (Swagger UI)

---

## 🛠️ Tecnologias

### Backend
- **FastAPI** 0.110.1 - Framework web moderno e rápido
- **Motor** - Driver MongoDB async para Python
- **PyJWT** - JSON Web Tokens
- **Passlib + Bcrypt** - Hashing de senhas
- **PyPDF2** - Processamento de PDFs
- **Scikit-learn** - Busca vetorial (cosine similarity)
- **OpenAI API** - GPT-4 e embeddings
- **GridFS** - Armazenamento de arquivos

### Frontend
- **Expo** 54 - Framework React Native
- **React Native** 0.79 - Framework mobile
- **Expo Router** 5.1 - Roteamento file-based
- **React Native Paper** 5.14 - Componentes UI Material Design
- **AsyncStorage** - Armazenamento local
- **Axios** - Cliente HTTP
- **React Native Gifted Charts** - Gráficos e visualizações
- **React Native Markdown** - Renderização de markdown

### Database
- **MongoDB** 6.0+ - Banco de dados NoSQL

### DevOps
- **Docker** (opcional) - Containerização
- **Nginx** - Reverse proxy
- **Supervisor** - Gerenciador de processos

---

## 🧪 Testes

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
yarn test
```

---

## 📊 Métricas e Monitoramento

### Health Check
```bash
curl http://localhost:8001/api/health
```

### Logs
- Backend: Logs aparecem no console do uvicorn
- Frontend: Logs no Metro Bundler
- Produção: Configure CloudWatch (AWS) ou similar

---

## 🔒 Segurança

- ✅ Senhas hasheadas com bcrypt
- ✅ JWT tokens com expiração
- ✅ Validação de inputs com Pydantic
- ✅ CORS configurado
- ✅ HTTPS obrigatório em produção
- ✅ Variáveis de ambiente para secrets
- ✅ Rate limiting (implementar em produção)

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Autores

- **Seu Nome** - Desenvolvedor Principal

---

## 📞 Suporte

- 📧 Email: suporte@medmentor.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/medmentor/issues)
- 📖 Docs: [Documentação Completa](docs/)

---

## 🗺️ Roadmap

### Fase 1 (Concluída) ✅
- [x] App mobile para assinantes
- [x] Portal web para mentores
- [x] Sistema RAG completo
- [x] Dashboard analítico
- [x] Upload e processamento de PDFs

### Fase 2 (Em Desenvolvimento) 🚧
- [ ] Suporte para vídeos e áudios
- [ ] Notificações push
- [ ] Sistema de pagamentos
- [ ] Comunidade de médicos

### Fase 3 (Planejado) 📋
- [ ] Webinars ao vivo
- [ ] Certificados de conclusão
- [ ] Marketplace de cursos
- [ ] Integração com prontuários eletrônicos

---

## ⭐ Star History

Se este projeto te ajudou, considere dar uma estrela! ⭐

---

**Desenvolvido com ❤️ para revolucionar a educação médica**
