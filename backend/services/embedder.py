from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import uuid
from typing import List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ✅ Load embedding model (you can load this once)
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

# ✅ Initialize Pinecone with new API
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))


def chunk_text(text: str, max_length=300, overlap=50) -> List[str]:
    """
    Splits long text into overlapping chunks for better embedding context.
    """
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_length, len(words))
        chunks.append(" ".join(words[start:end]))
        start += max_length - overlap
    return chunks


def embed_and_store(pages: List[dict], file_id: str):
    """
    Chunk text, generate embeddings, and store in Pinecone.
    """
    try:
        print(f"Processing {len(pages)} pages for file_id: {file_id}")
        vectors_to_upsert = []

        for page in pages:
            page_number = page["page"]
            chunks = chunk_text(page["text"])
            print(f"Page {page_number}: {len(chunks)} chunks")

            if not chunks:
                continue

            embeddings = model.encode(chunks)

            for i, emb in enumerate(embeddings):
                vector_id = str(uuid.uuid4())
                metadata = {
                    "file_id": file_id,
                    "page": page_number,
                    "chunk_index": i,
                    "text": chunks[i]
                }

                # Use new Pinecone API format
                vectors_to_upsert.append({
                    "id": vector_id,
                    "values": emb.tolist(),
                    "metadata": metadata
                })

        if not vectors_to_upsert:
            print("No vectors to upsert!")
            return {"vectors_stored": 0}

        print(f"Upserting {len(vectors_to_upsert)} vectors to namespace: {file_id}")
        # ✅ Upsert into Pinecone with new API format and namespace
        index.upsert(vectors=vectors_to_upsert, namespace=file_id)
        print(f"Successfully stored {len(vectors_to_upsert)} vectors")

        return {
            "vectors_stored": len(vectors_to_upsert)
        }
    
    except Exception as e:
        print(f"Error in embed_and_store: {e}")
        raise e
