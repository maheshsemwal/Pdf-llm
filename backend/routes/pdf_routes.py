from fastapi import APIRouter, File, UploadFile, Header
from typing import Optional
from services.pdf_service import PDFService

router = APIRouter()
pdf_service = PDFService()

@router.get("/")
def read_root():
    return {"Hello": "World"}

@router.post("/pdf-upload")
async def upload_pdf(
    file: UploadFile = File(...), 
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Upload a PDF file to Supabase storage
    """
    return await pdf_service.upload_pdf(file, user_id)
