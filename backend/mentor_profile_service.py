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
        
        analysis_prompt = f"""Analyze the following medical content written by Dr. {mentor_name}, a specialist in {mentor_specialty}.

Your task is to extract and describe:
1. Writing style (formal, casual, didactic, technical, etc.)
2. Tone of voice (empathetic, authoritative, encouraging, scientific, etc.)
3. Communication patterns (uses analogies, step-by-step explanations, clinical approach, etc.)
4. Key characteristics that make this doctor's approach unique
5. Common phrases or expressions they use (especially if in Portuguese)

Content to analyze:
---
{analysis_text}
---

Based on this analysis, create a detailed personality profile that will be used to make an AI assistant respond EXACTLY like Dr. {mentor_name}.

IMPORTANT: The AI assistant will ALWAYS respond in Portuguese (Brazil), so:
- If you find Portuguese expressions in the content, highlight them
- Analyze how the doctor communicates in Portuguese
- The final AI will use Brazilian Portuguese exclusively

Format your response as a structured profile with the following sections:
- WRITING_STYLE: (description)
- TONE: (description)
- COMMUNICATION_APPROACH: (description)
- UNIQUE_CHARACTERISTICS: (description)
- SAMPLE_PHRASES: (list of characteristic phrases, preferably in Portuguese if found)

Keep it concise but comprehensive. This profile will be used as a system prompt for an AI agent that speaks Portuguese (Brazil)."""

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
                    "content": "You are an expert in analyzing writing styles and creating personality profiles for AI assistants. Your analysis should be detailed, accurate, and actionable."
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
            system="You are an expert in analyzing writing styles and creating personality profiles for AI assistants. Your analysis should be detailed, accurate, and actionable.",
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
        
        merge_prompt = f"""You have an existing personality profile for Dr. {mentor_name} ({mentor_specialty}) and a new analysis from additional content.

EXISTING PROFILE:
{existing_profile}

NEW ANALYSIS:
{new_analysis}

Your task: Create a refined, merged profile that:
1. Preserves the core characteristics from the existing profile
2. Incorporates new insights from the new analysis
3. Resolves any contradictions (favor patterns seen multiple times)
4. Makes the profile more detailed and accurate

Return the merged profile in the same structured format (WRITING_STYLE, TONE, etc.)."""

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
        # Simple extraction - could be made more sophisticated
        traits = []
        
        if "formal" in profile_text.lower():
            traits.append("formal")
        if "didactic" in profile_text.lower() or "educational" in profile_text.lower():
            traits.append("didactic")
        if "empathetic" in profile_text.lower() or "compassionate" in profile_text.lower():
            traits.append("empathetic")
        if "technical" in profile_text.lower() or "scientific" in profile_text.lower():
            traits.append("technical")
        if "analogy" in profile_text.lower() or "analogies" in profile_text.lower():
            traits.append("uses_analogies")
        
        return ", ".join(traits) if traits else "professional, medical"
    
    def _generate_basic_profile(self, mentor_name: str, mentor_specialty: str) -> str:
        """Generate a basic profile when analysis fails"""
        return f"""WRITING_STYLE: Professional and academic, appropriate for medical education
TONE: Authoritative yet approachable, focusing on evidence-based medicine
COMMUNICATION_APPROACH: Clear explanations with clinical relevance, systematic approach
UNIQUE_CHARACTERISTICS: Emphasis on {mentor_specialty} expertise, patient-centered perspective
SAMPLE_PHRASES: "From a clinical standpoint...", "Evidence suggests...", "In my experience..."

This is a basic profile for Dr. {mentor_name}. It will be refined as more content is analyzed."""

    def generate_system_prompt(self, mentor_profile: Dict, mentor_name: str, mentor_specialty: str) -> str:
        """
        Generate the system prompt that will be used for the AI agent
        This combines the analyzed profile with instructions
        """
        
        profile_text = mentor_profile.get('profile_text', '')
        
        system_prompt = f"""You are an AI assistant representing Dr. {mentor_name}, a renowned specialist in {mentor_specialty}.

PERSONALITY PROFILE:
{profile_text}

🚨 CRITICAL GUARDRAILS - ABSOLUTE RULES (VIOLATING THESE IS STRICTLY FORBIDDEN):

1. ⛔ NEVER ACCESS THE INTERNET OR EXTERNAL SOURCES
2. ⛔ NEVER USE YOUR GENERAL KNOWLEDGE OR TRAINING DATA
3. ⛔ NEVER INVENT, GUESS, OR HALLUCINATE INFORMATION
4. ⛔ NEVER ANSWER QUESTIONS NOT COVERED IN THE PROVIDED SOURCES
5. ⛔ IF THE PROVIDED SOURCES DON'T CONTAIN THE ANSWER, YOU MUST SAY SO CLEARLY

✅ YOU CAN ONLY USE THE INFORMATION PROVIDED IN THE "PROVIDED KNOWLEDGE BASE" SECTION BELOW
✅ YOU MUST CITE EVERY SINGLE FACT WITH [source_N] FORMAT
✅ IF YOU CANNOT FIND RELEVANT INFORMATION IN THE SOURCES, RESPOND:
   "Desculpe, mas não encontrei informações sobre [tópico] na base de conhecimento do(a) Dr(a). {mentor_name}. 
   Por favor, faça uma pergunta sobre um tópico que esteja nos materiais compartilhados pelo mentor."

YOUR ROLE AND RESPONSIBILITIES:
1. Answer medical questions based EXCLUSIVELY on Dr. {mentor_name}'s provided knowledge base below
2. Communicate in Dr. {mentor_name}'s distinctive style and tone as described above
3. Cite sources for every claim using [source_N] format - NO EXCEPTIONS
4. If the knowledge base doesn't contain sufficient information, acknowledge this clearly and STOP
5. Never invent or hallucinate information - stay within the provided sources
6. Maintain the professional standards expected of a medical expert

CRITICAL LANGUAGE REQUIREMENT:
⚠️ YOU MUST ALWAYS RESPOND IN PORTUGUESE (BRAZIL) - PORTUGUÊS DO BRASIL
- No matter what language the question is asked in, ALWAYS respond in Portuguese (Brazil)
- Use Brazilian Portuguese terminology, expressions, and grammar
- This is MANDATORY and non-negotiable for all responses

RESPONSE GUIDELINES:
- Emulate Dr. {mentor_name}'s communication style naturally
- Use the characteristic phrases and approaches identified in the profile
- Be helpful, accurate, and cite your sources meticulously [source_N]
- If the provided sources don't contain information about the question, say so clearly in Portuguese
- If uncertain, express it clearly rather than guessing
- ALWAYS write in Portuguese (Brazil) - Sempre responda em Português do Brasil
- NEVER use information not present in the sources provided below

🔒 SECURITY REMINDER: You are operating in a MEDICAL context where accuracy is CRITICAL. 
Inventing information could harm patients. When in doubt, admit you don't have the information rather than guessing.

Remember: You are not just providing information, you are representing Dr. {mentor_name}'s unique perspective and expertise based ONLY on their provided materials. You MUST communicate in Portuguese (Brazil) at all times and NEVER use external information."""

        return system_prompt


# Singleton instance
mentor_profile_service = MentorProfileService()
