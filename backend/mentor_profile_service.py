"""
Mentor Profile Service - Automatic AI Agent Profile Generation
Analyzes mentor's content to create personalized AI agent profiles
"""

import os
from typing import Dict, Optional
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

class MentorProfileService:
    """Service for generating and managing AI agent profiles for mentors"""
    
    def __init__(self):
        # Use user's OpenAI key
        self.openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        print("✓ Mentor Profile Service initialized with user's OpenAI key")
        
    async def analyze_content_and_generate_profile(
        self, 
        content_text: str, 
        mentor_name: str,
        mentor_specialty: str,
        existing_profile: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Analyze mentor's content to extract writing style, tone, and personality
        Returns a comprehensive profile for the AI agent
        """
        
        # Limit content analysis to first 10000 characters to avoid token limits
        analysis_text = content_text[:10000] if len(content_text) > 10000 else content_text
        
        analysis_prompt = f"""Você é um especialista em análise de perfis médicos. Analise o seguinte conteúdo médico escrito pelo(a) Dr(a). {mentor_name}, especialista em {mentor_specialty}.

Sua tarefa é extrair e descrever:
1. Estilo de escrita (formal, casual, didático, técnico, etc.)
2. Tom de voz (empático, autoritativo, encorajador, científico, etc.)
3. Padrões de comunicação (usa analogias, explicações passo-a-passo, abordagem clínica, etc.)
4. Características-chave que tornam a abordagem deste(a) médico(a) única
5. Frases e expressões comuns que ele(a) utiliza

Conteúdo para análise:
---
{analysis_text}
---

Com base nessa análise, crie um perfil de personalidade detalhado que será usado para fazer um assistente de IA responder EXATAMENTE como o(a) Dr(a). {mentor_name}.

IMPORTANTE: Todo o perfil DEVE ser escrito inteiramente em Português do Brasil (pt-BR). Não use inglês em nenhuma parte da resposta.

Formate sua resposta como um perfil estruturado com as seguintes seções:
- ESTILO_DE_ESCRITA: (descrição)
- TOM_DE_VOZ: (descrição)
- ABORDAGEM_DE_COMUNICACAO: (descrição)
- CARACTERISTICAS_UNICAS: (descrição)
- FRASES_EXEMPLO: (lista de frases características encontradas no conteúdo)

Seja conciso mas abrangente. Este perfil será usado como prompt de sistema para um agente de IA que se comunica exclusivamente em Português do Brasil."""

        try:
            # Try OpenAI first
            response = await self._analyze_with_openai(analysis_prompt)
            source = "openai"
        except Exception as e:
            print(f"OpenAI analysis failed: {e}, falling back to Claude")
            try:
                # Fallback to Claude
                response = await self._analyze_with_claude(analysis_prompt)
                source = "claude"
            except Exception as e2:
                print(f"Claude analysis also failed: {e2}")
                # Return a basic profile as last resort
                return {
                    "profile_text": self._generate_basic_profile(mentor_name, mentor_specialty),
                    "analysis_source": "fallback",
                    "style_traits": "professional, medical, informative"
                }
        
        # If we already have an existing profile, merge insights
        if existing_profile:
            merged_profile = await self._merge_profiles(existing_profile, response, mentor_name, mentor_specialty)
            return {
                "profile_text": merged_profile,
                "analysis_source": f"{source}_merged",
                "style_traits": self._extract_style_traits(merged_profile)
            }
        
        return {
            "profile_text": response,
            "analysis_source": source,
            "style_traits": self._extract_style_traits(response)
        }
    
    async def _analyze_with_openai(self, prompt: str) -> str:
        """Analyze content using OpenAI GPT"""
        response = await self.openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system", 
                    "content": "Você é um especialista em análise de estilos de escrita e criação de perfis de personalidade para assistentes de IA médicos. Sua análise deve ser detalhada, precisa e prática. Responda SEMPRE em Português do Brasil (pt-BR)."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        return response.choices[0].message.content
    
    async def _analyze_with_claude(self, prompt: str) -> str:
        """Analyze content using Anthropic Claude"""
        response = await self.anthropic_client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1500,
            temperature=0.7,
            system="Você é um especialista em análise de estilos de escrita e criação de perfis de personalidade para assistentes de IA médicos. Sua análise deve ser detalhada, precisa e prática. Responda SEMPRE em Português do Brasil (pt-BR).",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.content[0].text
    
    async def _merge_profiles(
        self, 
        existing_profile: str, 
        new_analysis: str,
        mentor_name: str,
        mentor_specialty: str
    ) -> str:
        """Merge existing profile with new content analysis to refine the agent's personality"""
        
        merge_prompt = f"""Você tem um perfil de personalidade existente do(a) Dr(a). {mentor_name} ({mentor_specialty}) e uma nova análise de conteúdo adicional.

PERFIL EXISTENTE:
{existing_profile}

NOVA ANÁLISE:
{new_analysis}

Sua tarefa: Crie um perfil refinado e mesclado que:
1. Preserve as características centrais do perfil existente
2. Incorpore novos insights da nova análise
3. Resolva contradições (favoreça padrões vistos múltiplas vezes)
4. Torne o perfil mais detalhado e preciso

IMPORTANTE: Escreva TODO o perfil em Português do Brasil (pt-BR).

Retorne o perfil mesclado no mesmo formato estruturado (ESTILO_DE_ESCRITA, TOM_DE_VOZ, ABORDAGEM_DE_COMUNICACAO, CARACTERISTICAS_UNICAS, FRASES_EXEMPLO)."""

        try:
            # Use OpenAI for merging
            response = await self.openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at synthesizing personality profiles."
                    },
                    {"role": "user", "content": merge_prompt}
                ],
                temperature=0.5,
                max_tokens=1500
            )
            return response.choices[0].message.content
        except:
            # If merging fails, return the new analysis
            return new_analysis
    
    def _extract_style_traits(self, profile_text: str) -> str:
        """Extract a short summary of style traits from the profile"""
        traits = []
        lower = profile_text.lower()
        
        if "formal" in lower:
            traits.append("formal")
        if "didático" in lower or "didatic" in lower or "educacional" in lower:
            traits.append("didático")
        if "empático" in lower or "empathetic" in lower or "acolhedor" in lower:
            traits.append("empático")
        if "técnico" in lower or "científico" in lower or "technical" in lower:
            traits.append("técnico")
        if "analogia" in lower or "analogies" in lower:
            traits.append("usa_analogias")
        
        return ", ".join(traits) if traits else "profissional, médico"
    
    def _generate_basic_profile(self, mentor_name: str, mentor_specialty: str) -> str:
        """Generate a basic profile when analysis fails"""
        return f"""ESTILO_DE_ESCRITA: Profissional e acadêmico, adequado para educação médica
TOM_DE_VOZ: Autoritativo porém acessível, com foco em medicina baseada em evidências
ABORDAGEM_DE_COMUNICACAO: Explicações claras com relevância clínica, abordagem sistemática
CARACTERISTICAS_UNICAS: Ênfase em expertise em {mentor_specialty}, perspectiva centrada no paciente
FRASES_EXEMPLO: "Do ponto de vista clínico...", "As evidências sugerem...", "Na minha experiência..."

Este é um perfil básico do(a) Dr(a). {mentor_name}. Será refinado conforme mais conteúdo for analisado."""

    def generate_system_prompt(self, mentor_profile: Dict, mentor_name: str, mentor_specialty: str) -> str:
        """
        Generate the system prompt that will be used for the AI agent
        This combines the analyzed profile with instructions
        """
        
        profile_text = mentor_profile.get('profile_text', '')
        
        system_prompt = f"""Você é um assistente de IA representando o(a) Dr(a). {mentor_name}, especialista renomado(a) em {mentor_specialty}.

PERFIL DE PERSONALIDADE:
{profile_text}

REGRAS ABSOLUTAS - VIOLÁ-LAS É ESTRITAMENTE PROIBIDO:

1. NUNCA acesse a internet ou fontes externas
2. NUNCA use seu conhecimento geral ou dados de treinamento
3. NUNCA invente, adivinhe ou alucine informações
4. NUNCA responda perguntas não cobertas pelas fontes fornecidas
5. Se as fontes NÃO contêm a resposta, DIGA ISSO CLARAMENTE

VOCÊ SÓ PODE usar as informações da "BASE DE CONHECIMENTO FORNECIDA" abaixo.
VOCÊ DEVE citar CADA FATO com o formato [source_N].
Se NÃO encontrar informações relevantes nas fontes, responda:
"Desculpe, mas não encontrei informações sobre [tópico] na base de conhecimento do(a) Dr(a). {mentor_name}. 
Por favor, faça uma pergunta sobre um tópico que esteja nos materiais compartilhados pelo mentor."

SEU PAPEL E RESPONSABILIDADES:
1. Responda perguntas médicas baseado EXCLUSIVAMENTE na base de conhecimento do(a) Dr(a). {mentor_name}
2. Comunique-se no estilo e tom distintivo do(a) Dr(a). {mentor_name} conforme o perfil acima
3. Cite fontes para CADA afirmação usando formato [source_N] - SEM EXCEÇÕES
4. Se a base de conhecimento não contém informação suficiente, reconheça isso e PARE
5. Nunca invente ou alucine informações - fique dentro das fontes fornecidas
6. Mantenha os padrões profissionais esperados de um especialista médico

IDIOMA OBRIGATÓRIO:
VOCÊ DEVE SEMPRE RESPONDER EM PORTUGUÊS DO BRASIL (pt-BR).
- Não importa em qual idioma a pergunta seja feita, SEMPRE responda em Português do Brasil
- Use terminologia, expressões e gramática do Português Brasileiro
- Isso é OBRIGATÓRIO e inegociável para todas as respostas

DIRETRIZES DE RESPOSTA:
- Emule o estilo de comunicação do(a) Dr(a). {mentor_name} naturalmente
- Use as frases e abordagens características identificadas no perfil
- Seja prestativo, preciso e cite suas fontes meticulosamente [source_N]
- Se as fontes não contêm informação sobre a pergunta, diga claramente
- Se tiver dúvida, expresse claramente ao invés de adivinhar
- NUNCA use informações que não estejam nas fontes fornecidas abaixo

LEMBRETE DE SEGURANÇA: Você está operando em um contexto MÉDICO onde a precisão é CRÍTICA.
Inventar informações pode prejudicar pacientes. Na dúvida, admita que não possui a informação ao invés de adivinhar.

Lembre-se: Você não está apenas fornecendo informações, está representando a perspectiva e expertise única do(a) Dr(a). {mentor_name} baseado APENAS nos materiais fornecidos."""

        return system_prompt


# Singleton instance
mentor_profile_service = MentorProfileService()
