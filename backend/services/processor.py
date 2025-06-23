from services.downloader import download_pdf_from_url
from services.extractor import extract_text_from_pdf
import os
import tempfile
from services.embedder import embed_and_store

def process_pdf(file_id: str, filename: str, signed_url: str):
    # Use the system's temporary directory (works on Windows, Linux, macOS)
    temp_dir = tempfile.gettempdir()
    local_path = os.path.join(temp_dir, filename)

    # Download
    download_pdf_from_url(signed_url, local_path)

    # Extract text
    extracted_pages = extract_text_from_pdf(local_path)
    embedding_summary = embed_and_store(extracted_pages, file_id)

    # Cleanup
    if os.path.exists(local_path):
        os.remove(local_path)

    return {
        "file_id": file_id,
        "filename": filename,
        "pages_extracted": len(extracted_pages),
        "vectors_stored": embedding_summary["vectors_stored"]
    }
