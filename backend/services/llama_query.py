"""
LLaMA Query Service

This module provides AI-powered question answering capabilities that combine:
1. Document-specific context from uploaded PDFs (via Pinecone vector search)
2. General knowledge from the LLaMA language model
3. Real-time streaming responses for ChatGPT-like experience

The system intelligently classifies questions and provides natural responses
without explicitly mentioning the source of information. Server-side streaming
ensures the typing effect only occurs once when the response is first generated.
"""

import os
import asyncio
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import VectorStoreIndex, Settings
from llama_index.llms.groq import Groq
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.llms import ChatMessage
from dotenv import load_dotenv
from pinecone import Pinecone

# Load environment variables
load_dotenv()

# ✅ Set up Pinecone with modern API
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))

# ✅ Set up embedding model using sentence-transformers directly
from sentence_transformers import SentenceTransformer
from llama_index.core.embeddings import BaseEmbedding
from typing import List

class SentenceTransformerEmbedding(BaseEmbedding):
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", **kwargs):
        super().__init__(**kwargs)
        self._model = SentenceTransformer(model_name)
        
    def _get_query_embedding(self, query: str) -> List[float]:
        return self._model.encode([query])[0].tolist()
        
    def _get_text_embedding(self, text: str) -> List[float]:
        return self._model.encode([text])[0].tolist()
        
    async def _aget_query_embedding(self, query: str) -> List[float]:
        return self._get_query_embedding(query)
        
    async def _aget_text_embedding(self, text: str) -> List[float]:
        return self._get_text_embedding(text)

embed_model = SentenceTransformerEmbedding()

# ✅ Set up LLM (Groq + LLaMA3)
llm = Groq(api_key=os.getenv("GROQ_API_KEY"), model="llama3-8b-8192")

# ✅ Configure global settings for LlamaIndex
Settings.llm = llm
Settings.embed_model = embed_model


def classify_question_type(question: str) -> str:
    """
    Classify the question to determine the best answering approach
    """
    question_lower = question.lower()
    
    # Document-specific indicators
    doc_indicators = [
        "in this document", "pdf", "in the pdf", "according to this", "in the file",
        "what does this say", "summarize this", "what is this about",
        "in the text", "the document says", "this paper", "this report", "document"
    ]
    
    # General knowledge indicators  
    general_indicators = [
        "what is", "how does", "why does", "explain", "define",
        "what are the benefits", "what are the advantages", "tell me about",
        "how to", "what causes", "what happens when"
    ]
    
    # Check for document-specific language
    for indicator in doc_indicators:
        if indicator in question_lower:
            return "document_specific"
    
    # Check for general knowledge language
    for indicator in general_indicators:
        if indicator in question_lower:
            return "general_knowledge"
    
    # Default to hybrid approach
    return "hybrid"


async def _ask_question_internal(file_id: str, question: str) -> str:
    try:
        print(f"Querying for file_id: {file_id}, question: {question}")
        
        # Validate file_id
        if not file_id or file_id.strip() == "":
            print("Error: Empty file_id provided")
            return "I apologize, but I don't see a PDF document attached to this conversation. Could you please upload a PDF file first, or provide more context about what document you're referring to?"
        
        # ✅ Connect LlamaIndex to Pinecone vector store
        vector_store = PineconeVectorStore(
            pinecone_index=pinecone_index,
            namespace=file_id  # 🧠 Filters chunks related to this file only
        )

        # ✅ Create index object
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

        # ✅ Set up retriever with top-k chunks
        retriever = VectorIndexRetriever(
            index=index,
            similarity_top_k=5
        )        # Classify the question type
        question_type = classify_question_type(question)
        print(f"Question classified as: {question_type}")
        
        # ✅ Get relevant context from PDF
        print(f"Retrieving context from PDF...")
        retrieved_nodes = retriever.retrieve(question)
        
        # Extract text context from retrieved nodes
        pdf_context = ""
        if retrieved_nodes:
            pdf_context = "\n\n".join([node.text for node in retrieved_nodes])
            print(f"Retrieved {len(retrieved_nodes)} relevant chunks from PDF")
        else:
            print("No relevant context found in PDF")
        # ✅ Create prompts based on question type and available context
        if question_type == "document_specific":
            # User explicitly asking about the document
            if pdf_context.strip():
                prompt = f"""Answer the following question based on the provided context. Be natural and conversational in your response.

Context:
{pdf_context}

Question: {question}

Answer:"""
            else:
                # Return response directly instead of sending to LLM
                return "I apologize, but I don't see a PDF document attached to this conversation. Could you please upload a PDF file first, or provide more context about what document you're referring to?"
                
        elif question_type == "general_knowledge":
            # User asking general knowledge question
            prompt = f"""Answer the following question in a helpful and informative way.

Question: {question}

Answer:"""
            
        else:  # hybrid approach
            # Question could benefit from both document context and general knowledge
            if pdf_context.strip():
                prompt = f"""Answer the following question using the provided context and your knowledge. Be natural and comprehensive in your response.

Context:
{pdf_context}

Question: {question}

Answer:"""
            else:
                prompt = f"""Answer the following question in a helpful and informative way.

Question: {question}

Answer:"""        # ✅ Query the LLM directly with our custom prompt
        print(f"Querying LLM with {question_type} approach...")
        
        messages = [ChatMessage(role="user", content=prompt)]
        response = await llm.achat(messages)
        response_str = str(response)
        
        print(f"LLM response: {response_str[:200]}...")
        return response_str
        
    except Exception as e:
        print(f"Error in ask_question: {e}")
        # Fallback: Try with just general knowledge
        try:
            print("Falling back to general knowledge only...")
            fallback_prompt = f"""Answer the following question in a helpful and informative way.

Question: {question}

Answer:"""

            messages = [ChatMessage(role="user", content=fallback_prompt)]
            response = await llm.achat(messages)
            return str(response)
        except Exception as fallback_error:
            print(f"Fallback error: {fallback_error}")
            return "I apologize, but I encountered an error processing your question. Please try rephrasing your question or try again later."


async def ask_question_stream(file_id: str, question: str):
    """
    Stream the response character by character for real-time display
    """
    try:
        # Get the full response first
        full_response = await _ask_question_internal(file_id, question)
        
        # Stream character by character with a slight delay for realistic typing effect
        for char in full_response:
            yield char
            await asyncio.sleep(0.02)  # 20ms delay between characters for natural typing
            
    except Exception as e:
        print(f"Error in ask_question_stream: {e}")
        yield f"Error processing question: {str(e)}"
