from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import tempfile
from services.downloader import download_pdf_from_url
from services.extractor import extract_text_from_pdf
from services.embedder import embed_and_store

router = APIRouter()

class ProcessRequest(BaseModel):
    filename: str
    file_id: str
    signed_url: str

@router.post("/process")
async def process_pdf(req: ProcessRequest):
    try:
        # Use the system's temporary directory (works on Windows, Linux, macOS)
        temp_dir = tempfile.gettempdir()
        local_path = os.path.join(temp_dir, req.filename)

        # Step 1: Download the PDF
        download_pdf_from_url(req.signed_url, local_path)

        # Step 2: Extract text
        extracted_pages = extract_text_from_pdf(local_path)        # After text extraction:
        embedding_summary = embed_and_store(extracted_pages, req.file_id)
        # Optional: Clean up
        if os.path.exists(local_path):
            os.remove(local_path)

        return {
            "file_id": req.file_id,
            "filename": req.filename,
            "pages_extracted": len(extracted_pages),
            "vectors_stored": embedding_summary["vectors_stored"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
