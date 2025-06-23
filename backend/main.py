from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pdf_routes import router as pdf_router
from routes import process
from routes.ask_question import router as question_router
from routes.chat_routes import router as chat_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf_router)
app.include_router(process.router)
app.include_router(question_router)
app.include_router(chat_router)