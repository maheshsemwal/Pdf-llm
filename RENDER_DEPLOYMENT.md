# Render Deployment Guide

This guide will help you deploy the PDF-LLM backend to Render.

## Prerequisites

1. A Render account (free tier available)
2. Environment variables configured (see below)
3. External services set up:
   - Supabase (database and storage)
   - Pinecone (vector database)
   - Groq (AI model API)

## Deployment Options

### Option 1: Using render.yaml (Recommended)

1. Fork this repository or push to your own repo
2. Connect your repository to Render
3. Set up the required environment variables in Render dashboard
4. Deploy using the included `render.yaml` configuration

### Option 2: Manual Service Creation

1. Create a new Web Service in Render
2. Connect your repository
3. Configure the following settings:
   - **Runtime**: Python 3
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Health Check Path**: `/health`

## Required Environment Variables

Set these in your Render service environment variables:

```
ENVIRONMENT=production
FRONTEND_URL=http://localhost:5173
FRONTEND_PROD_URL=https://your-frontend-domain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=pdfllm
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENV=us-east-1
PINECONE_INDEX_NAME=pdf-index
GROQ_API_KEY=your-groq-api-key
```

## Deployment Features

- ✅ Automatic health checks at `/health` endpoint
- ✅ Graceful error handling for missing dependencies
- ✅ Production-ready CORS configuration
- ✅ Proper PORT environment variable handling
- ✅ Gunicorn with Uvicorn workers for production performance

## Troubleshooting

### Common Issues

1. **Build fails with dependency conflicts**: 
   - The requirements.txt has been optimized for compatibility
   - If issues persist, try deploying with minimal dependencies first

2. **Health check fails**:
   - Check that the `/health` endpoint returns 200 status
   - Verify the application starts without errors

3. **CORS issues**:
   - Update `FRONTEND_PROD_URL` environment variable
   - Ensure your frontend domain is correctly configured

### Minimal Mode

If full functionality doesn't deploy initially, the application will run in minimal mode with basic endpoints:
- `GET /` - API status
- `GET /health` - Health check

Advanced features requiring external services will be disabled until all dependencies are properly configured.

## Next Steps

After successful deployment:

1. Test the health endpoint: `https://your-app.onrender.com/health`
2. Configure your frontend to use the deployed backend URL
3. Set up the required external services (Supabase, Pinecone, Groq)
4. Add the environment variables to enable full functionality