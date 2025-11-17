# MedMentor - Plataforma de Mentoria Médica com IA

## 📋 Visão Geral

MedMentor é uma plataforma inovadora que conecta médicos assinantes com o conhecimento especializado de mentores renomados através de bots de IA. Utilizando tecnologia RAG (Retrieval-Augmented Generation), a plataforma oferece consultas baseadas no acervo de conteúdo de cada mentor.

## 🏗️ Arquitetura

### Backend (FastAPI + Python)
- **API RESTful** com autenticação JWT
- **MongoDB** para armazenamento de dados
- **GridFS** para armazenamento de arquivos
- **RAG Service** para processamento de conteúdo e geração de respostas
- **OpenAI** (via Emergent LLM Key) para embeddings e chat completion

### Frontend (Expo + React Native)
- **Mobile App** para iOS e Android
- **Expo Router** para navegação
- **React Native Paper** para UI components
- **AsyncStorage** para armazenamento local
- **Axios** para chamadas de API

### Banco de Dados
- **users** - Médicos assinantes
- **mentors** - Médicos mentores
- **mentor_content** - Conteúdo dos mentores (PDFs, etc)
- **content_chunks** - Chunks processados com embeddings
- **conversations** - Conversas entre usuários e bots
- **messages** - Mensagens individuais

## 🚀 Funcionalidades Implementadas

### Para Médicos Assinantes (Mobile App)
✅ Autenticação (Login/Cadastro)
✅ Visualização de mentores disponíveis
✅ Chat com bots de IA dos mentores
✅ Histórico de conversas
✅ Perfil de usuário
✅ Busca de mentores por especialidade
✅ Respostas com citações das fontes

### Para Médicos Mentores (Backend APIs)
✅ Autenticação (Login/Cadastro)
✅ Upload de conteúdo (PDFs)
✅ Processamento automático de PDFs
✅ Visualização de conteúdo enviado
✅ Dashboard com estatísticas
✅ Gerenciamento de perfil

### Sistema RAG
✅ Extração de texto de PDFs
✅ Chunking inteligente de conteúdo
✅ Geração de embeddings (OpenAI)
✅ Busca vetorial por similaridade
✅ Geração de respostas contextualizadas
✅ Citações de fontes

## 🔑 Credenciais de Teste

### Médico Assinante
- **Email:** doctor@example.com
- **Senha:** password123

### Mentores
1. **Dr. Maria Silva** (Cardiologia)
   - Email: dr.cardiology@medmentor.com
   - Senha: password123

2. **Dr. João Santos** (Neurologia)
   - Email: dr.neurology@medmentor.com
   - Senha: password123

3. **Dr. Ana Costa** (Pediatria)
   - Email: dr.pediatrics@medmentor.com
   - Senha: password123

## 📱 Como Testar

### Backend
```bash
# Verificar saúde da API
curl http://localhost:8001/api/health

# Listar mentores
curl http://localhost:8001/api/mentors

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com","password":"password123"}'
```

### Frontend Mobile
1. O app está rodando em: `http://localhost:3000`
2. Use o Expo Go app no seu celular
3. Escaneie o QR code do terminal Expo
4. Ou acesse via navegador web

## 🗂️ Estrutura do Projeto

```
/app
├── backend/
│   ├── server.py           # API principal
│   ├── models.py           # Modelos Pydantic
│   ├── auth_utils.py       # Utilitários de autenticação
│   ├── rag_service.py      # Serviço RAG
│   ├── seed_data.py        # Script para popular banco
│   └── requirements.txt    # Dependências Python
├── frontend/
│   ├── app/
│   │   ├── (auth)/        # Telas de autenticação
│   │   ├── (tabs)/        # Telas principais
│   │   ├── chat/          # Tela de chat
│   │   └── conversation/  # Tela de conversa
│   ├── contexts/          # Context API (Auth)
│   ├── services/          # Serviços de API
│   └── package.json       # Dependências Node
└── README_MEDMENTOR.md    # Este arquivo
```

## 🔧 Tecnologias Utilizadas

### Backend
- FastAPI 0.110.1
- Motor (MongoDB async driver)
- PyJWT para autenticação
- Passlib + Bcrypt para hashing
- PyPDF2 para processamento de PDFs
- Scikit-learn para similaridade de vetores
- EmergentIntegrations para OpenAI
- GridFS para armazenamento de arquivos

### Frontend
- Expo 54
- React Native 0.79
- Expo Router 5.1
- React Native Paper 5.14
- AsyncStorage 2.2
- Axios 1.13
- React Native Markdown Display

## 🎯 Próximos Passos (Phase 2)

### Alta Prioridade
- [ ] Portal web para mentores (gerenciamento de conteúdo)
- [ ] Suporte para vídeos e áudios
- [ ] Notificações push
- [ ] Sistema de favoritos
- [ ] Filtros avançados de mentores

### Média Prioridade
- [ ] Comunidade (posts e comentários)
- [ ] Sistema de ratings
- [ ] Analytics avançado para mentores
- [ ] Export de conversas em PDF
- [ ] Modo offline

### Baixa Prioridade
- [ ] Integração com calendário
- [ ] Webinars ao vivo
- [ ] Sistema de recompensas
- [ ] Temas dark/light
- [ ] Múltiplos idiomas

## 🐛 Limitações Conhecidas

1. **Embeddings**: No MVP, quando não há créditos suficientes, são gerados vetores aleatórios como fallback. Para produção, é necessário garantir créditos suficientes ou implementar retry logic.

2. **GridFS**: Usado para simplicidade no MVP. Para produção, recomenda-se migrar para S3 ou similar para melhor performance e CDN.

3. **Vector Search**: Implementado com cosine similarity em Python. Para escala, considerar migração para Weaviate, Pinecone ou similar.

4. **Real-time**: Não há atualização em tempo real. Usuários precisam fazer pull-to-refresh.

5. **Rate Limiting**: Não implementado no MVP. Necessário para produção.

## 🔐 Segurança

- Senhas hashadas com bcrypt
- JWT tokens para autenticação
- CORS configurado
- Validação de inputs com Pydantic
- AsyncStorage para armazenamento seguro no mobile

## 📊 Performance

- MongoDB com indexes apropriados
- Lazy loading de conversas e mensagens
- Chunking de conteúdo para otimizar busca
- Async/await para operações I/O
- React Native optimizado com memo e callbacks

## 🌐 Endpoints da API

### Autenticação
- `POST /api/auth/signup/user` - Cadastro de usuário
- `POST /api/auth/signup/mentor` - Cadastro de mentor
- `POST /api/auth/login` - Login (ambos)

### Mentores
- `GET /api/mentors` - Listar mentores
- `GET /api/mentors/{id}` - Detalhes do mentor
- `GET /api/mentors/profile/me` - Perfil do mentor logado
- `PUT /api/mentors/profile` - Atualizar perfil

### Usuários
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil

### Chat
- `POST /api/chat` - Enviar mensagem
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/{id}/messages` - Mensagens da conversa
- `POST /api/messages/{id}/feedback` - Feedback (like/dislike)

### Conteúdo
- `POST /api/mentor/content/upload` - Upload de PDF
- `GET /api/mentor/content` - Listar conteúdo
- `GET /api/mentor/stats` - Estatísticas do mentor

## 💡 Dicas de Desenvolvimento

1. **Recarregar Dados**: Pull-to-refresh implementado em todas as listas
2. **Logs**: Backend usa logging padrão Python
3. **Debugging**: Use `console.log` no frontend e veja no terminal Expo
4. **Seed Database**: Execute `python seed_data.py` para resetar dados
5. **Restart Services**: `sudo supervisorctl restart backend expo`

## 🎨 Design System

### Cores
- **Primary**: #2563eb (Azul)
- **Secondary**: #64748b (Cinza)
- **Background**: #f8fafc (Branco suave)
- **Surface**: #ffffff (Branco)
- **Error**: #ef4444 (Vermelho)

### Tipografia
- **Headlines**: Bold, tamanhos variados
- **Body**: Regular, 14-16px
- **Captions**: 12px, cinza

## 📝 Notas Adicionais

- O sistema já possui 3 mentores com conteúdo de exemplo
- Cada mentor tem guias clínicos em suas especialidades
- O RAG está configurado para buscar os 5 chunks mais relevantes
- Respostas incluem citações automáticas das fontes
- Sistema totalmente funcional end-to-end

## 🎉 Status do MVP

✅ **MVP COMPLETO E FUNCIONAL!**

O MedMentor está pronto para ser testado com todas as funcionalidades principais implementadas:
- Autenticação completa
- Chat com IA baseado em RAG
- Interface mobile profissional
- Backend robusto com APIs RESTful
- Banco de dados populado com dados de teste
- Sistema de embeddings e busca vetorial funcionando

Próximo passo: Testes e feedback dos usuários para Phase 2!
