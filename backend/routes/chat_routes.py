from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from clients.supabase_client import supabase

router = APIRouter(prefix="/chat", tags=["chat"])

class CreateChatRequest(BaseModel):
    title: str
    pdf_document_id: str
    file_id: str  # Add file_id for vector search
    user_id: Optional[str] = None

class SendMessageRequest(BaseModel):
    chat_id: str
    content: str
    sender: str  # 'user' or 'assistant'

class ChatResponse(BaseModel):
    id: str
    title: str
    pdf_document_id: Optional[str]
    file_id: Optional[str]  # Add file_id to response
    user_id: Optional[str]
    created_at: datetime
    updated_at: datetime

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    content: str
    sender: str
    created_at: datetime

class ChatWithMessagesResponse(BaseModel):
    chat: ChatResponse
    messages: List[MessageResponse]

@router.post("/create", response_model=ChatResponse)
async def create_chat(request: CreateChatRequest):
    """
    Create a new chat session when PDF is uploaded
    """
    try:        # Insert new chat
        chat_data = {
            "title": request.title,
            "pdf_document_id": request.pdf_document_id,
            "file_id": request.file_id,
            "user_id": request.user_id
        }
        
        response = supabase.table("chats").insert(chat_data).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=500, detail=f"Failed to create chat: {response.error}")
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="No data returned from chat creation")
        
        chat = response.data[0]
        return ChatResponse(**chat)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message", response_model=MessageResponse)
async def send_message(request: SendMessageRequest):
    """
    Store a message in the database
    """
    try:
        # Validate sender
        if request.sender not in ['user', 'assistant']:
            raise HTTPException(status_code=400, detail="Sender must be 'user' or 'assistant'")
        
        # Check if chat exists
        chat_response = supabase.table("chats").select("id").eq("id", request.chat_id).execute()
        if not chat_response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Insert message
        message_data = {
            "chat_id": request.chat_id,
            "content": request.content,
            "sender": request.sender
        }
        
        response = supabase.table("messages").insert(message_data).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=500, detail=f"Failed to send message: {response.error}")
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="No data returned from message creation")
        
        # Update chat's updated_at timestamp
        supabase.table("chats").update({"updated_at": datetime.now().isoformat()}).eq("id", request.chat_id).execute()
        
        message = response.data[0]
        return MessageResponse(**message)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all", response_model=List[ChatResponse])
async def get_all_chats():
    """
    Get all chats (for when user_id is empty)
    """
    try:
        response = supabase.table("chats").select("*").order("updated_at", desc=True).execute()
        
        chats = response.data if response.data else []
        return [ChatResponse(**chat) for chat in chats]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/chats", response_model=List[ChatResponse])
async def get_user_chats(user_id: str):
    """
    Get all chats for a specific user
    """
    try:
        response = supabase.table("chats").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
        
        chats = response.data if response.data else []
        return [ChatResponse(**chat) for chat in chats]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{chat_id}", response_model=ChatWithMessagesResponse)
async def get_chat_with_messages(chat_id: str):
    """
    Fetch a chat with all its messages
    """
    try:
        # Get chat details
        chat_response = supabase.table("chats").select("*").eq("id", chat_id).execute()
        
        if not chat_response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat = chat_response.data[0]
        
        # Get messages for this chat
        messages_response = supabase.table("messages").select("*").eq("chat_id", chat_id).order("created_at", desc=False).execute()
        
        messages = messages_response.data if messages_response.data else []
        
        return ChatWithMessagesResponse(
            chat=ChatResponse(**chat),
            messages=[MessageResponse(**msg) for msg in messages]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{chat_id}")
async def delete_chat(chat_id: str):
    """
    Delete a chat and all its messages
    """
    try:
        # Delete chat (messages will be deleted automatically due to CASCADE)
        response = supabase.table("chats").delete().eq("id", chat_id).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=500, detail=f"Failed to delete chat: {response.error}")
        
        return {"message": "Chat deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
