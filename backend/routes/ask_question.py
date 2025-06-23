from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llama_query import ask_question

router = APIRouter()

class QuestionRequest(BaseModel):
    file_id: str
    question: str

@router.post("/ask-question")
async def ask_q(payload: QuestionRequest):
    """
    Ask a question about a specific PDF file using AI
    """
    if not payload.file_id or not payload.question:
        raise HTTPException(status_code=400, detail="file_id and question are required")
    
    answer = await ask_question(payload.file_id, payload.question)
    return {"answer": answer}
