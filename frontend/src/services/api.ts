import { userService } from './user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Chat {
  id: string;
  title: string;
  pdf_document_id?: string;
  file_id?: string;  // Add file_id for vector search
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  content: string;
  sender: 'user' | 'assistant';
  created_at: string;
}

export interface ChatWithMessages {
  chat: Chat;
  messages: Message[];
}

class ApiService {
  // Chat APIs
  async createChat(title: string, pdfDocumentId: string, fileId: string): Promise<Chat> {
    const userId = userService.getUserId();
    
    const response = await fetch(`${API_BASE_URL}/chat/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        pdf_document_id: pdfDocumentId,
        file_id: fileId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create chat');
    }

    return response.json();
  }

  async sendMessage(chatId: string, content: string, sender: 'user' | 'assistant'): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        content,
        sender,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send message');
    }

    return response.json();
  }

  async getChatWithMessages(chatId: string): Promise<ChatWithMessages> {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch chat');
    }

    return response.json();
  }
  async getAllChats(): Promise<Chat[]> {
    const userId = userService.getUserId();
    const response = await fetch(`${API_BASE_URL}/chat/user/${userId}/chats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch chats');
    }

    return response.json();
  }

  async deleteChat(chatId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete chat');
    }
  }  // PDF APIs
  async uploadPdf(file: File): Promise<{
    file_id: string;
    document_id: string;
    filename: string;
    signed_url: string;
    processing_result: any;
  }> {
    const userId = userService.getUserId();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/pdf-upload`, {
      method: 'POST',
      headers: {
        'X-User-ID': userId,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload PDF');
    }

    return response.json();
  }  // Question API - Now returns streaming response
  async askQuestionStream(
    fileId: string, 
    question: string, 
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ask-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          question,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get streaming answer');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                onError(data.error);
                return;
              }
              
              if (data.done) {
                onComplete();
                return;
              }
              
              if (data.chunk) {
                onChunk(data.chunk);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export const apiService = new ApiService();
