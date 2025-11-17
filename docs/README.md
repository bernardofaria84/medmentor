# 📚 MedMentor - Documentação Completa

Bem-vindo à documentação do **MedMentor**, plataforma de mentoria médica com IA.

---

## 📑 Índice da Documentação

### 📖 Documentação Técnica

1. **[API Documentation](API.md)**
   - Endpoints completos
   - Autenticação e segurança
   - Exemplos de requests/responses
   - Códigos de erro

2. **[Arquitetura do Sistema](ARCHITECTURE.md)**
   - Visão geral da arquitetura
   - Fluxos de dados (RAG, Chat, Analytics)
   - Padrões de design
   - Decisões técnicas

3. **[Database Schema](DATABASE.md)**
   - Collections MongoDB
   - Relacionamentos
   - Índices e otimizações
   - Scripts de setup e migrations

---

### 🚀 Guias de Deployment

4. **[Deploy Backend (AWS)](DEPLOYMENT_BACKEND.md)**
   - Configuração EC2
   - MongoDB Atlas/local
   - Nginx + SSL
   - Supervisor
   - Monitoramento e backup

5. **[Deploy Mobile App (Play Store)](DEPLOYMENT_MOBILE.md)**
   - EAS Build (Expo)
   - Google Play Console
   - Assets e screenshots
   - Processo de aprovação
   - OTA Updates

---

## 🏗️ Estrutura do Projeto

```
medmentor/
├── backend/              # FastAPI API
├── frontend/             # Expo Mobile/Web App
├── docs/                 # Esta documentação
└── scripts/              # Scripts de deployment
```

---

## 🎯 Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

### Seed Database
```bash
cd backend
python seed_data.py
```

---

## 📊 Visão Geral do Sistema

**MedMentor** é uma plataforma full-stack que conecta médicos assinantes com bots de IA treinados no conhecimento de mentores especialistas.

### Componentes Principais

1. **Backend (FastAPI)**
   - API RESTful
   - Sistema RAG (Retrieval-Augmented Generation)
   - Autenticação JWT
   - Analytics em tempo real

2. **Frontend (Expo)**
   - App Mobile (iOS/Android)
   - Portal Web (Mentores)
   - UI/UX moderna
   - Offline-first

3. **Database (MongoDB)**
   - Armazenamento NoSQL
   - GridFS para arquivos
   - Vector embeddings

4. **IA (OpenAI)**
   - GPT-4 para respostas
   - Embeddings para busca
   - Suporte via Emergent LLM Key

---

## 🔑 Funcionalidades

### Para Médicos Assinantes (Mobile)
- ✅ Chat com bots de mentores
- ✅ Histórico de conversas
- ✅ Busca por especialidade
- ✅ Sistema de feedback
- ✅ Perfil personalizável

### Para Mentores (Web Portal)
- ✅ Dashboard analítico
- ✅ Upload de conteúdo (PDFs)
- ✅ Gestão de materiais
- ✅ Analytics detalhado:
  - Consultas (diárias/horárias)
  - Avaliações (feedback)
  - Conteúdo (uso e status)
- ✅ Gerenciamento de perfil

### Sistema RAG (IA)
- ✅ Processamento de PDFs
- ✅ Chunking inteligente
- ✅ Embeddings vetoriais
- ✅ Busca por similaridade
- ✅ Respostas com citações

---

## 🛠️ Stack Tecnológica

### Backend
- **FastAPI** 0.110+ - Framework web
- **Motor** - MongoDB async driver
- **PyJWT** - Autenticação
- **Bcrypt** - Segurança de senhas
- **PyPDF2** - Processamento de PDFs
- **OpenAI API** - GPT-4 e embeddings

### Frontend
- **Expo** 54 - Framework React Native
- **React Native** 0.79
- **Expo Router** 5.1 - Roteamento
- **React Native Paper** - UI components
- **Axios** - Cliente HTTP
- **Gifted Charts** - Visualizações

### Infraestrutura
- **MongoDB** 6.0+ - Banco de dados
- **Nginx** - Reverse proxy
- **Supervisor** - Gerenciamento de processos
- **AWS** - Cloud hosting

---

## 📖 Documentação por Tópico

### Autenticação
Consulte: [API.md - Autenticação](API.md#-autenticação)
- Sistema JWT
- Cadastro de usuários/mentores
- Login e refresh tokens

### Chat e RAG
Consulte: [ARCHITECTURE.md - Fluxo 2](ARCHITECTURE.md#fluxo-2-chat-com-mentor-bot-rag)
- Como funciona o RAG
- Upload de conteúdo
- Geração de embeddings
- Busca vetorial

### Analytics
Consulte: [API.md - Analytics](API.md#-analytics-mentores)
- Métricas de consultas
- Análise de ratings
- Uso de conteúdo

### Deploy
- **Backend**: [DEPLOYMENT_BACKEND.md](DEPLOYMENT_BACKEND.md)
- **Mobile**: [DEPLOYMENT_MOBILE.md](DEPLOYMENT_MOBILE.md)

### Database
Consulte: [DATABASE.md](DATABASE.md)
- Schema completo
- Collections e índices
- Backup e restore

---

## 🔐 Segurança

O sistema implementa múltiplas camadas de segurança:

1. **Transport Layer**
   - HTTPS obrigatório em produção
   - SSL/TLS certificates

2. **Application Layer**
   - JWT tokens com expiração
   - Senhas hasheadas (bcrypt)
   - Validação de inputs (Pydantic)
   - CORS configurado

3. **Database Layer**
   - Autenticação MongoDB
   - Network isolation
   - Backups automáticos

Detalhes completos: [ARCHITECTURE.md - Segurança](ARCHITECTURE.md#segurança)

---

## 📈 Performance

### Métricas Esperadas
- **API response time**: <200ms (média)
- **Chat response**: 2-5s (depende do LLM)
- **Dashboard load**: <1s
- **Mobile app size**: ~50MB

### Otimizações
- Async/await (FastAPI + Motor)
- Connection pooling
- Code splitting (Expo Router)
- AsyncStorage para cache
- Índices MongoDB

Detalhes: [ARCHITECTURE.md - Performance](ARCHITECTURE.md#performance)

---

## 🧪 Testes

### Backend
```bash
cd backend
pytest tests/
```

### Frontend
```bash
cd frontend
yarn test
```

### Health Check
```bash
curl http://localhost:8001/api/health
```

---

## 🔄 Workflows Comuns

### 1. Adicionar Novo Mentor
```bash
# Via seed script
cd backend
python seed_data.py

# Ou via API
curl -X POST http://localhost:8001/api/auth/signup/mentor \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"...","full_name":"...","specialty":"..."}'
```

### 2. Upload de Conteúdo
Ver: [API.md - Upload de Conteúdo](API.md#upload-de-conteúdo)

### 3. Atualizar App
Ver: [DEPLOYMENT_MOBILE.md - OTA Updates](DEPLOYMENT_MOBILE.md#over-the-air-ota-updates)

### 4. Backup Database
```bash
./scripts/backup_database.sh
```

---

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verificar logs
sudo supervisorctl tail medmentor-backend stderr

# Testar manualmente
cd backend
source venv/bin/activate
uvicorn server:app --port 8001
```

### Frontend não conecta
- Verificar `EXPO_PUBLIC_BACKEND_URL` em `.env`
- Confirmar backend está rodando
- Testar curl: `curl http://localhost:8001/api/health`

### Database connection error
- Verificar MongoDB está rodando: `sudo systemctl status mongod`
- Testar connection string
- Verificar firewall/network rules

Mais detalhes:
- [DEPLOYMENT_BACKEND.md - Troubleshooting](DEPLOYMENT_BACKEND.md#troubleshooting)
- [DEPLOYMENT_MOBILE.md - Troubleshooting](DEPLOYMENT_MOBILE.md#troubleshooting)

---

## 📞 Suporte e Recursos

### Contato
- 📧 **Email**: suporte@medmentor.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/seu-usuario/medmentor/issues)

### Recursos Externos
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [OpenAI API Reference](https://platform.openai.com/docs/)

### Scripts Úteis
Ver pasta `/scripts`:
- `deploy_backend.sh` - Deploy automático do backend
- `deploy_frontend.sh` - Deploy automático do frontend
- `backup_database.sh` - Backup do MongoDB

---

## 🗺️ Roadmap

### ✅ Fase 1 (Concluída)
- App mobile para assinantes
- Portal web para mentores
- Sistema RAG completo
- Dashboard analítico
- Upload e processamento de PDFs

### 🚧 Fase 2 (Planejado)
- Suporte para vídeos e áudios
- Notificações push
- Sistema de pagamentos
- Comunidade de médicos

### 📋 Fase 3 (Futuro)
- Webinars ao vivo
- Certificados de conclusão
- Marketplace de cursos
- Integração com prontuários

---

## 📝 Changelog

### v1.0.0 - Lançamento Inicial
- ✅ App mobile completo
- ✅ Portal do mentor
- ✅ Sistema RAG
- ✅ Analytics completo
- ✅ Documentação completa

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

Ver mais em: [CONTRIBUTING.md](../CONTRIBUTING.md) (quando existir)

---

## 📜 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](../LICENSE) para mais detalhes.

---

## ⭐ Agradecimentos

Desenvolvido com ❤️ para revolucionar a educação médica.

---

**Última atualização**: Janeiro 2025
**Versão da documentação**: 1.0.0
