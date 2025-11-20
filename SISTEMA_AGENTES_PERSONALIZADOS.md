# 🤖 Sistema de Agentes Personalizados - MedMentor

## 📋 Visão Geral

Sistema implementado que cria **agentes de IA personalizados** para cada mentor, que aprendem automaticamente o estilo, tom e características de comunicação de cada médico mentor através da análise do conteúdo que eles enviam.

---

## ✨ Funcionalidades Implementadas

### 1. **Análise Automática de Conteúdo**
Quando um mentor faz upload de PDF:
- ✅ O sistema analisa o conteúdo automaticamente
- ✅ Identifica o estilo de escrita (formal, didático, técnico, etc.)
- ✅ Detecta o tom de voz (empático, autoritário, científico, etc.)
- ✅ Extrai padrões de comunicação (uso de analogias, explicações passo a passo, etc.)
- ✅ Gera um **perfil de personalidade** único para o agente

### 2. **Sistema Multi-IA com Redundância**
- ✅ **OpenAI GPT-4o-mini** como IA principal
- ✅ **Claude Sonnet 4** como backup automático
- ✅ Fallback inteligente: se uma IA falhar, usa a outra automaticamente
- ✅ Alta disponibilidade e robustez do sistema

### 3. **Perfis de Agente Personalizados**
Cada mentor tem um agente único que:
- ✅ Responde com o estilo característico do mentor
- ✅ Usa frases e expressões típicas do mentor
- ✅ Mantém o tom profissional do mentor
- ✅ Se aperfeiçoa com cada novo conteúdo enviado

### 4. **Refinamento Progressivo**
- ✅ Primeiro upload: cria perfil inicial
- ✅ Uploads subsequentes: refina e melhora o perfil
- ✅ Quanto mais conteúdo, mais preciso fica o agente
- ✅ Merge inteligente de análises múltiplas

---

## 🏗️ Arquitetura Técnica

### Novos Componentes

#### 1. `mentor_profile_service.py`
**Responsabilidades:**
- Analisar conteúdo dos PDFs
- Gerar perfis de personalidade
- Fazer merge de perfis existentes com novas análises
- Criar prompts de sistema personalizados

**Funções principais:**
```python
analyze_content_and_generate_profile()  # Analisa conteúdo e cria perfil
generate_system_prompt()                # Cria prompt para o agente
_merge_profiles()                       # Refina perfil com novo conteúdo
```

#### 2. `multi_ai_rag_service.py`
**Responsabilidades:**
- Geração de embeddings (OpenAI)
- Respostas com OpenAI ou Claude (com fallback)
- RAG com perfis personalizados
- Processamento de PDFs

**Funções principais:**
```python
generate_rag_response()          # Gera resposta com perfil personalizado
_try_openai_then_claude()        # Tenta OpenAI, fallback para Claude
_try_claude_then_openai()        # Vice-versa
process_pdf_content()            # Processa e indexa PDFs
```

### Atualiz

ações no Backend

#### `models.py`
Adicionados novos campos ao `MentorProfile`:
```python
agent_profile: Optional[str]    # Perfil completo do agente IA
style_traits: Optional[str]     # Resumo rápido do estilo
```

#### `server.py`
**Endpoint de Upload (`/api/mentor/content/upload`):**
1. Processa PDF (chunks + embeddings)
2. **Analisa conteúdo e gera/atualiza perfil do agente**
3. Salva perfil no banco de dados

**Endpoint de Chat (`/api/chat`):**
1. Busca chunks relevantes (RAG)
2. **Carrega perfil do agente do mentor**
3. **Gera resposta usando perfil personalizado**
4. Usa OpenAI primeiro, fallback para Claude se necessário

---

## 🔄 Fluxo de Funcionamento

### Fluxo 1: Upload de Conteúdo (Criação/Refinamento do Agente)

```
1. Mentor faz upload de PDF no portal
   ↓
2. Sistema extrai texto do PDF
   ↓
3. Texto é dividido em chunks
   ↓
4. Embeddings são gerados para cada chunk
   ↓
5. Chunks são salvos no banco
   ↓
6. 🆕 ANÁLISE DO PERFIL:
   ├─ Sistema analisa o texto usando GPT-4o-mini
   ├─ Identifica estilo, tom, características únicas
   ├─ Se já existe perfil: merge com novo conteúdo
   ├─ Se não existe: cria perfil inicial
   └─ Salva perfil no banco (campo agent_profile)
   ↓
7. Upload completo - Agente atualizado! ✅
```

### Fluxo 2: Chat com Agente Personalizado

```
1. Usuário envia pergunta para mentor
   ↓
2. Sistema gera embedding da pergunta
   ↓
3. Busca top-5 chunks similares (RAG)
   ↓
4. 🆕 CARREGA PERFIL DO AGENTE:
   ├─ Busca agent_profile do mentor no banco
   ├─ Gera system prompt personalizado
   └─ Combina perfil + contexto RAG
   ↓
5. 🆕 GERAÇÃO COM MULTI-IA:
   ├─ Tenta OpenAI GPT-4o-mini primeiro
   ├─ Se falhar: fallback automático para Claude
   └─ Resposta no estilo do mentor
   ↓
6. Salva resposta com citações
   ↓
7. Retorna resposta ao usuário ✅
```

---

## 🔑 API Keys Configuradas

### `.env` do Backend
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
WHISPER_MODEL=whisper-1

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

**Nota:** As API keys reais devem ser configuradas no arquivo `.env` do backend e **NUNCA** devem ser commitadas no Git.

---

## 📊 Database Schema Atualizado

### Collection: `mentors`
```javascript
{
  _id: String,
  email: String,
  full_name: String,
  specialty: String,
  bio: String,
  
  // 🆕 NOVOS CAMPOS
  agent_profile: String,        // Perfil completo de personalidade do agente
  style_traits: String,         // Resumo: "formal, didático, empático"
  profile_updated_at: Date      // Última atualização do perfil
}
```

---

## 🎯 Exemplo de Perfil Gerado

Quando um mentor faz upload, o sistema pode gerar um perfil como:

```
WRITING_STYLE: Didático e acessível, com uso frequente de analogias do cotidiano
TONE: Empático e encorajador, sempre validando preocupações do paciente
COMMUNICATION_APPROACH: Explicações passo a passo, começando do básico
UNIQUE_CHARACTERISTICS: 
- Uso de analogias mecânicas (compara coração a uma bomba)
- Sempre menciona "no meu consultório, vejo muito..."
- Foco em prevenção antes de tratamento
SAMPLE_PHRASES:
- "Vamos entender isso de forma simples..."
- "Pense no coração como uma bomba..."
- "Na minha prática clínica..."
```

E o agente usará isso para responder como se fosse o próprio mentor!

---

## 🧪 Como Testar

### 1. Fazer Upload de Conteúdo
```bash
# Login como mentor
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.cardiology@medmentor.com","password":"password123"}'

# Upload PDF (vai gerar/atualizar perfil automaticamente)
curl -X POST http://localhost:8001/api/mentor/content/upload \
  -H "Authorization: Bearer {TOKEN}" \
  -F "title=Guia de Cardiologia" \
  -F "file=@/path/to/document.pdf"
```

### 2. Verificar Perfil Gerado
```bash
# Ver perfil do mentor
curl http://localhost:8001/api/mentors/profile/me \
  -H "Authorization: Bearer {TOKEN}"

# Vai retornar o agent_profile e style_traits
```

### 3. Testar Chat com Agente Personalizado
```bash
# Login como usuário
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com","password":"password123"}'

# Enviar mensagem
curl -X POST http://localhost:8001/api/chat \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mentor_id": "uuid-do-mentor",
    "question": "Quais os sintomas de insuficiência cardíaca?"
  }'

# Resposta virá no estilo personalizado do mentor!
```

---

## 🚀 Próximos Passos Sugeridos

### Melhorias Futuras
1. **Dashboard de Perfil no Portal do Mentor**
   - Mostrar o perfil gerado automaticamente
   - Permitir ajustes manuais (opcional)
   - Visualizar "style_traits"

2. **Analytics de Agente**
   - Mostrar quantas vezes cada IA foi usada (OpenAI vs Claude)
   - Taxa de sucesso de cada IA
   - Métricas de qualidade das respostas

3. **Múltiplas Versões de Perfil**
   - Manter histórico de perfis
   - Poder reverter para versão anterior
   - A/B testing de perfis

4. **Fine-tuning Real (Opcional)**
   - Para mentores premium
   - Treinar modelo dedicado no estilo do mentor
   - Ainda mais personalização

---

## 📝 Arquivos Criados/Modificados

### Novos Arquivos
- ✅ `/backend/mentor_profile_service.py` - Serviço de análise de perfil
- ✅ `/backend/multi_ai_rag_service.py` - RAG com multi-IA
- ✅ `/backend/.env` - Atualizado com API keys

### Arquivos Modificados
- ✅ `/backend/server.py` - Integração dos novos serviços
- ✅ `/backend/models.py` - Novos campos no MentorProfile
- ✅ `/backend/requirements.txt` - Adicionado `anthropic`

---

## ✅ Status da Implementação

- ✅ Sistema Multi-IA (OpenAI + Claude) com fallback
- ✅ Análise automática de conteúdo
- ✅ Geração de perfis de personalidade
- ✅ Refinamento progressivo de perfis
- ✅ Chat com agentes personalizados
- ✅ Integração completa no fluxo de upload e chat
- ✅ API keys configuradas e funcionando
- ✅ Backend rodando sem erros

**Sistema 100% operacional e pronto para uso! 🎉**

---

**Desenvolvido com IA para revolucionar a mentoria médica personalizada!**
