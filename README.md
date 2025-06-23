# AI Planet Assessment

This project is a full-stack application for PDF processing and question-answering using AI technologies. It consists of a Python backend API and a React frontend interface.

## 🏗️ Project Structure

```
AI planet Assessment/
├── backend/                 # Python Flask/FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── clients/            # External service clients
│   │   ├── pinecone_client.py
│   │   └── supabase_client.py
│   ├── routes/             # API route handlers
│   │   ├── ask_question.py
│   │   ├── pdf_routes.py
│   │   └── process.py
│   └── services/           # Business logic services
│       ├── downloader.py
│       ├── embedder.py
│       ├── extractor.py
│       ├── llama_query.py
│       ├── pdf_service.py
│       └── processor.py
└── frontend/               # React frontend application
    ├── src/
    ├── public/
    └── package.json
```

## 🚀 Features

- **PDF Processing**: Upload and process PDF documents
- **AI-Powered Q&A**: Ask questions about uploaded documents
- **Vector Storage**: Efficient document embedding and retrieval
- **Modern UI**: React-based frontend with TypeScript support

## 🛠️ Technologies Used

### Backend
- **Python** - Core programming language
- **Pinecone** - Vector database for embeddings
- **Supabase** - Database and backend services
- **LLaMA** - Large language model for question answering

### Frontend
- **React** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## 🔧 Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Add your API keys and configuration

6. Run the backend server:
   ```bash
   python main.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🔑 Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
PINECONE_API_KEY=your_pinecone_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
LLAMA_API_KEY=your_llama_api_key
```

## 📚 API Endpoints

- `POST /upload` - Upload PDF documents
- `POST /ask` - Ask questions about uploaded documents
- `GET /documents` - List uploaded documents
- `DELETE /documents/{id}` - Delete a document

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

---

Built with ❤️ for AI Planet Assessment
