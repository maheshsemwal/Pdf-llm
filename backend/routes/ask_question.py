from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llama_query import ask_question_stream
import json

router = APIRouter()

class QuestionRequest(BaseModel):
    file_id: str
    question: str

@router.post("/ask-question")
async def ask_q(payload: QuestionRequest):
    """
    Ask a question about a specific PDF file using AI with streaming response
    """
    if not payload.file_id or not payload.question:
        raise HTTPException(status_code=400, detail="file_id and question are required")
    
    async def generate_stream():
        try:
            async for chunk in ask_question_stream(payload.file_id, payload.question):
                # Format as Server-Sent Events
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield f"data: {json.dumps({'done': True})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )
