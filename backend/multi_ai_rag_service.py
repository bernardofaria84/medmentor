"""
Multi-AI RAG Service with Personalized Agent Profiles
Supports OpenAI and Claude with automatic fallback
Uses mentor-specific personality profiles for responses
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple, Optional
import os
import asyncio
from datetime import datetime
import tiktoken
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

# API Keys and Models
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

# Tokenizer for chunking
encoding = tiktoken.get_encoding("cl100k_base")

class MultiAIRAGService:
    """Enhanced RAG Service with multi-AI support and personalized agents"""
    
    def __init__(self):
        # Use user's OpenAI key (confirmed working locally)
        self.openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        
        self.embedding_model = "text-embedding-ada-002"
        self.chunk_size = 500  # tokens
        self.chunk_overlap = 50  # tokens
        
        print(f"✓ Multi-AI RAG Service initialized - will use gpt-3.5-turbo")
        
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using user's OpenAI key (text-embedding-ada-002)
        NEVER returns random vectors - raises exception on complete failure
        """
        from exceptions import EmbeddingGenerationError
        
        try:
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
            
        except Exception as e:
            print(f"Embedding generation failed: {e}")
            # CRITICAL: Never return random vectors - raise exception
            raise EmbeddingGenerationError(
                f"Failed to generate embedding with OpenAI: {str(e)}. "
                f"Please ensure embeddings are enabled on your OpenAI account."
            )
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        tokens = encoding.encode(text)
        chunks = []
        
        start = 0
        while start < len(tokens):
            end = start + self.chunk_size
            chunk_tokens = tokens[start:end]
            chunk_text = encoding.decode(chunk_tokens)
            chunks.append(chunk_text)
            start += (self.chunk_size - self.chunk_overlap)
        
        return chunks
    
    def cosine_similarity_search(
        self, 
        query_embedding: List[float], 
        document_embeddings: List[List[float]], 
        top_k: int = 5,
        min_similarity: float = 0.3  # Minimum similarity threshold
    ) -> Tuple[List[int], List[float]]:
        """
        Find top k most similar documents using cosine similarity
        Returns: (indices, similarity_scores)
        """
        query_vec = np.array(query_embedding).reshape(1, -1)
        doc_vecs = np.array(document_embeddings)
        
        similarities = cosine_similarity(query_vec, doc_vecs)[0]
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        top_scores = similarities[top_indices]
        
        # Filter by minimum similarity
        valid_indices = [idx for idx, score in zip(top_indices, top_scores) if score >= min_similarity]
        valid_scores = [score for score in top_scores if score >= min_similarity]
        
        return valid_indices, valid_scores
    
    async def generate_rag_response(
        self, 
        question: str, 
        context_chunks: List[Dict[str, str]],
        mentor_name: str,
        mentor_profile: Optional[str] = None,
        preferred_ai: str = "openai"
    ) -> Tuple[str, List[Dict], str]:
        """
        Generate a response using RAG with personalized agent profile
        Returns: (response_text, citations, ai_used)
        """
        
        # Build context with citations
        context_text = ""
        citations_map = {}
        
        for i, chunk in enumerate(context_chunks, 1):
            source_id = f"source_{i}"
            context_text += f"\n[{source_id}] {chunk['text']}\n"
            citations_map[source_id] = {
                "source_id": chunk['content_id'],
                "title": chunk['title'],
                "excerpt": chunk['text'][:200] + "..."
            }
        
        # Build system prompt with personality profile
        if mentor_profile:
            system_message = f"""{mentor_profile}

PROVIDED KNOWLEDGE BASE:
{context_text}

Remember: Answer based ONLY on the provided sources above. Cite every claim using [source_N] format."""
        else:
            # Fallback to basic prompt if no profile exists yet
            system_message = f"""You are an AI assistant representing Dr. {mentor_name}, a renowned medical expert.

Your role is to answer medical questions based EXCLUSIVELY on the knowledge provided below.

CRITICAL RULES:
1. Only use information from the provided sources
2. For every statement you make, cite the source using [source_N] format
3. If the provided sources don't contain enough information, say so clearly
4. Do not invent or hallucinate information
5. Maintain a professional, helpful tone appropriate for medical consultation

PROVIDED KNOWLEDGE:
{context_text}"""
        
        user_message_text = f"Question: {question}\n\nPlease provide a detailed answer based on the sources above, with proper citations."
        
        # Try preferred AI first, then fallback
        if preferred_ai == "openai":
            response, ai_used = await self._try_openai_then_claude(system_message, user_message_text)
        else:
            response, ai_used = await self._try_claude_then_openai(system_message, user_message_text)
        
        # Extract citations used in response
        used_citations = []
        for source_id, citation_data in citations_map.items():
            if f"[{source_id}]" in response:
                used_citations.append(citation_data)
        
        return response, used_citations, ai_used
    
    async def _try_openai_then_claude(self, system_message: str, user_message: str) -> Tuple[str, str]:
        """Try OpenAI first, fallback to Claude if it fails"""
        try:
            response = await self._generate_with_openai(system_message, user_message)
            return response, "openai"
        except Exception as e:
            print(f"OpenAI failed: {e}, trying Claude...")
            try:
                response = await self._generate_with_claude(system_message, user_message)
                return response, "claude"
            except Exception as e2:
                print(f"Claude also failed: {e2}")
                return "I apologize, but I'm currently unable to process your question due to technical issues. Please try again later.", "none"
    
    async def _try_claude_then_openai(self, system_message: str, user_message: str) -> Tuple[str, str]:
        """Try Claude first, fallback to OpenAI if it fails"""
        try:
            response = await self._generate_with_claude(system_message, user_message)
            return response, "claude"
        except Exception as e:
            print(f"Claude failed: {e}, trying OpenAI...")
            try:
                response = await self._generate_with_openai(system_message, user_message)
                return response, "openai"
            except Exception as e2:
                print(f"OpenAI also failed: {e2}")
                return "I apologize, but I'm currently unable to process your question due to technical issues. Please try again later.", "none"
    
    async def _generate_with_openai(self, system_message: str, user_message: str) -> str:
        """Generate response using user's OpenAI Key (gpt-4o-mini)"""
        response = await self.openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
    
    async def _generate_with_claude(self, system_message: str, user_message: str) -> str:
        """Generate response using Claude"""
        response = await self.anthropic_client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2000,
            temperature=0.7,
            system=system_message,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        return response.content[0].text
    
    async def process_pdf_content(
        self, 
        pdf_text: str, 
        mentor_id: str, 
        content_id: str, 
        title: str, 
        db
    ) -> int:
        """Process PDF content: chunk it, generate embeddings, and store"""
        
        # Chunk the text
        chunks = self.chunk_text(pdf_text)
        
        processed_count = 0
        
        for i, chunk in enumerate(chunks):
            try:
                # Generate embedding
                embedding = await self.generate_embedding(chunk)
                
                # Store chunk with embedding
                chunk_doc = {
                    "content_id": content_id,
                    "mentor_id": mentor_id,
                    "title": title,
                    "chunk_index": i,
                    "text": chunk,
                    "embedding": embedding,
                    "created_at": datetime.utcnow()
                }
                
                await db.content_chunks.insert_one(chunk_doc)
                processed_count += 1
                
            except Exception as e:
                print(f"Error processing chunk {i}: {e}")
                continue
        
        return processed_count


# Singleton instance
multi_ai_rag_service = MultiAIRAGService()
