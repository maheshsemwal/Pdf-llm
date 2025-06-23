from fastapi import FastAPI
from routes.pdf_routes import router as pdf_router
from routes import process
from routes.ask_question import router as question_router

app = FastAPI()

# Include routers
app.include_router(pdf_router)
app.include_router(process.router)
app.include_router(question_router)