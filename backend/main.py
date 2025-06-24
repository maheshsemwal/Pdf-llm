from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pdf_routes import router as pdf_router
from routes import process
from routes.ask_question import router as question_router
from routes.chat_routes import router as chat_router
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf_router)
app.include_router(process.router)
app.include_router(question_router)
app.include_router(chat_router)
