import os
import uuid
from typing import Tuple
from fastapi import HTTPException, UploadFile
from clients.supabase_client import supabase
from dotenv import load_dotenv
from services.processor import process_pdf

load_dotenv()

class PDFService:
    def __init__(self):
        self.bucket_name = os.getenv("SUPABASE_BUCKET_NAME")
        
    async def upload_pdf(self, file: UploadFile) -> dict:
        """
        Upload a PDF file to Supabase storage and return file info with signed URL
        """
        try:
            # Validate file
            if not file.filename.endswith(".pdf"):
                raise HTTPException(status_code=400, detail="Only PDF files are allowed")

            # Generate unique name
            file_id = str(uuid.uuid4())
            filename = f"{file_id}_{file.filename}"

            # Read content
            content = await file.read()
            
            # Upload to Supabase
            upload_response = supabase.storage.from_(self.bucket_name).upload(
                path=filename,
                file=content,
                file_options={"content-type": file.content_type}
            )

            if hasattr(upload_response, 'error') and upload_response.error:
                raise HTTPException(status_code=500, detail=f"Supabase upload failed: {upload_response.error}")

            # Create signed URL (valid for 24 hrs)
            signed_url_res = supabase.storage.from_(self.bucket_name).create_signed_url(filename, 86400)

            if hasattr(signed_url_res, 'error') and signed_url_res.error:
                raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {signed_url_res.error}")

            # Extract the signed URL from the response
            signed_url = signed_url_res.signed_url if hasattr(signed_url_res, 'signed_url') else signed_url_res.get("signedUrl")

            # ✅ Auto trigger processing
            processed = process_pdf(file_id, filename, signed_url)
            
            return {
                "file_id": file_id,
                "filename": filename,
                "signed_url": signed_url,
                "processing_result": processed
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
