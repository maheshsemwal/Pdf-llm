from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
allowed_origins = [frontend_url]

# For production, allow the frontend URL from environment
if os.getenv("ENVIRONMENT") == "production":
    frontend_prod_url = os.getenv("FRONTEND_PROD_URL")
    if frontend_prod_url:
        allowed_origins.append(frontend_prod_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint for health check
@app.get("/")
async def root():
    return {"message": "PDF LLM API is running", "status": "healthy"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Basic test endpoint
@app.get("/test")
async def test_endpoint():
    return {"message": "Server is working", "environment": os.getenv("ENVIRONMENT", "development")}

# TODO: Include routers once dependencies are resolved
# app.include_router(pdf_router)
# app.include_router(question_router)
# app.include_router(chat_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)