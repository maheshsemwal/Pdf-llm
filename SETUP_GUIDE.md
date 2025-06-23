# AI Planet Assessment - Setup Guide

## Project Structure
```
AI planet Assessment/
├── backend/           # FastAPI backend
├── frontend/         # React + Vite frontend
├── requirements.txt  # Python dependencies
└── database_update.sql # Database schema updates
```

## Backend Setup (Python/FastAPI)

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the `backend` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
SUPABASE_BUCKET_NAME=pdfllm
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENV=us-east-1
PINECONE_INDEX_NAME=pdf-index
GROQ_API_KEY=your_groq_key
FRONTEND_URL=http://localhost:5173
```

### 4. Run Backend Server
```bash
uvicorn main:app --reload --port 8000
```

## Frontend Setup (React/Vite)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `frontend` directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

## Database Setup

### 1. Run Database Schema Update
Execute the `database_update.sql` script in your Supabase SQL Editor to fix user_id column types.

### 2. Verify Tables
Ensure you have these tables:
- `chats` (with user_id as TEXT)
- `messages` (with foreign key to chats)
- `documents` (with user_id as TEXT)

## Key Dependencies

### Backend (Python)
- **FastAPI**: Web framework
- **Supabase**: Database and storage
- **Pinecone**: Vector database
- **LlamaIndex**: AI/LLM framework
- **PyMuPDF**: PDF processing
- **Sentence Transformers**: Embeddings

### Frontend (React)
- **React + TypeScript**: UI framework
- **Vite**: Build tool
- **React Router**: Navigation
- **Radix UI**: Component library
- **Tailwind CSS**: Styling
- **Lucide React**: Icons

## Features
- ✅ PDF upload and processing
- ✅ AI-powered Q&A with PDFs
- ✅ User session management with cookies
- ✅ Chat history and persistence
- ✅ Responsive UI with dark/light mode
- ✅ Real-time chat interface
- ✅ User-specific chat isolation

## Development URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Deployment
- **Frontend**: Configured for Vercel (vercel.json included)
- **Backend**: Can be deployed to any Python hosting service
- **Database**: Supabase (cloud hosted)
- **Vector DB**: Pinecone (cloud hosted)
