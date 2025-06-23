from fastapi import APIRouter, File, UploadFile
from services.pdf_service import PDFService

router = APIRouter()
pdf_service = PDFService()

@router.get("/")
def read_root():
    return {"Hello": "World"}

@router.post("/pdf-upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file to Supabase storage
    """
    return await pdf_service.upload_pdf(file)
