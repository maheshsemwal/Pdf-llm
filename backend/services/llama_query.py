import os
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import VectorStoreIndex, Settings
from llama_index.llms.groq import Groq
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
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


async def ask_question(file_id: str, question: str) -> str:
    try:
        print(f"Querying for file_id: {file_id}, question: {question}")
        
        # ✅ Connect LlamaIndex to Pinecone vector store
        vector_store = PineconeVectorStore(
            pinecone_index=pinecone_index,
            namespace=file_id  # 🧠 Filters chunks related to this file only
        )

        # ✅ Create index object - no need for service_context with Settings
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

        # ✅ Set up retriever with top-k chunks
        retriever = VectorIndexRetriever(
            index=index,
            similarity_top_k=5
        )

        # ✅ Create a query engine - no need for service_context with Settings
        query_engine = RetrieverQueryEngine.from_args(retriever=retriever)

        # ✅ Ask the question
        print(f"Executing query...")
        response = query_engine.query(question)
        print(f"Query response: {response}")
        
        # Check if response is empty or contains no useful information
        response_str = str(response)
        if not response_str or response_str.strip() == "" or "Empty Response" in response_str:
            # Fallback: Try querying without namespace to see if vectors exist
            print(f"No results with namespace, trying without namespace...")
            vector_store_no_ns = PineconeVectorStore(pinecone_index=pinecone_index)
            index_no_ns = VectorStoreIndex.from_vector_store(vector_store=vector_store_no_ns)
            retriever_no_ns = VectorIndexRetriever(index=index_no_ns, similarity_top_k=5)
            query_engine_no_ns = RetrieverQueryEngine.from_args(retriever=retriever_no_ns)
            response = query_engine_no_ns.query(f"file_id:{file_id} {question}")
            response_str = str(response)
        
        return response_str
        
    except Exception as e:
        print(f"Error in ask_question: {e}")
        return f"Error processing question: {str(e)}"
