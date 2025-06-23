const API_BASE_URL = 'http://localhost:8000';

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
  async createChat(title: string, pdfDocumentId: string, fileId: string, userId?: string): Promise<Chat> {
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
    const response = await fetch(`${API_BASE_URL}/chat/all`);

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
  }
  // PDF APIs
  async uploadPdf(file: File): Promise<{
    file_id: string;
    document_id: string;
    filename: string;
    signed_url: string;
    processing_result: any;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/pdf-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload PDF');
    }

    return response.json();
  }

  // Question API
  async askQuestion(fileId: string, question: string): Promise<{ answer: string }> {
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
      throw new Error(error.detail || 'Failed to get answer');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
