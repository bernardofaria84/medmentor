import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import asyncio
from datetime import datetime
import tiktoken

# Initialize OpenAI through emergentintegrations
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

# Tokenizer for chunking
encoding = tiktoken.get_encoding("cl100k_base")

class RAGService:
    """Service for Retrieval-Augmented Generation"""
    
    def __init__(self):
        self.embedding_model = "text-embedding-3-large"
        self.chat_model = "gpt-4"
        self.chunk_size = 500  # tokens
        self.chunk_overlap = 50  # tokens
        
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a piece of text using OpenAI"""
        try:
            # Use emergentintegrations for embeddings
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id="embedding_session",
                system_message="You are an embedding generator."
            ).with_model("openai", "text-embedding-3-large")
            
            # For embeddings, we'll use the OpenAI client directly
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=EMERGENT_LLM_KEY)
            
            response = await client.embeddings.create(
                model="text-embedding-3-large",
                input=text
            )
            
            embedding = response.data[0].embedding
            return embedding
            
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Return a zero vector as fallback
            return [0.0] * 3072  # text-embedding-3-large dimension
    
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
        top_k: int = 5
    ) -> List[int]:
        """Find top k most similar documents using cosine similarity"""
        query_vec = np.array(query_embedding).reshape(1, -1)
        doc_vecs = np.array(document_embeddings)
        
        similarities = cosine_similarity(query_vec, doc_vecs)[0]
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        return top_indices.tolist()
    
    async def generate_rag_response(
        self, 
        question: str, 
        context_chunks: List[Dict[str, str]],
        mentor_name: str
    ) -> Tuple[str, List[Dict]]:
        """Generate a response using RAG with the provided context"""
        
        # Build the context section with citations
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
        
        # Build the prompt
        system_message = f"""You are an AI assistant representing Dr. {mentor_name}, a renowned medical expert. 

Your role is to answer medical questions based EXCLUSIVELY on the knowledge provided below. 

CRITICAL RULES:
1. Only use information from the provided sources
2. For every statement you make, cite the source using [source_N] format
3. If the provided sources don't contain enough information to answer the question, say so clearly
4. Do not invent or hallucinate information
5. Maintain a professional, helpful tone appropriate for medical consultation
6. If you're unsure, acknowledge uncertainty

PROVIDED KNOWLEDGE:
{context_text}
"""
        
        user_message_text = f"Question: {question}\n\nPlease provide a detailed answer based on the sources above, with proper citations."
        
        try:
            # Use emergentintegrations for chat completion
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"rag_chat_{datetime.utcnow().isoformat()}",
                system_message=system_message
            ).with_model("openai", "gpt-4")
            
            user_message = UserMessage(text=user_message_text)
            response = await chat.send_message(user_message)
            
            # Extract citations used in the response
            used_citations = []
            for source_id, citation_data in citations_map.items():
                if f"[{source_id}]" in response:
                    used_citations.append(citation_data)
            
            return response, used_citations
            
        except Exception as e:
            print(f"Error generating RAG response: {e}")
            return f"I apologize, but I encountered an error while processing your question. Please try again later.", []
    
    async def process_pdf_content(self, pdf_text: str, mentor_id: str, content_id: str, title: str, db) -> int:
        """Process PDF content: chunk it, generate embeddings, and store"""
        
        # Chunk the text
        chunks = self.chunk_text(pdf_text)
        
        processed_count = 0
        
        for i, chunk in enumerate(chunks):
            try:
                # Generate embedding
                embedding = await self.generate_embedding(chunk)
                
                # Store chunk with embedding in database
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
rag_service = RAGService()
