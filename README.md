# DocBuddy: AI-Powered NotebookLM Clone

DocBuddy is a full-stack RAG (Retrieval-Augmented Generation) application designed to mirror the Google NotebookLM experience. It allows users to upload documents and have grounded, citation-rich conversations with their data.

## 🚀 Live Demo
- **Frontend:** [Your Vercel Link Here]
- **Backend:** [Your Render Link Here]

## ✨ Key Features
- **Intelligent RAG Pipeline**: End-to-end document processing from ingestion to grounded answer generation.
- **Interactive Citations**: Hover over AI-generated citations (e.g., `[1]`, `p. 3`) to see the exact text snippet retrieved from your document.
- **Multi-Format Support**: Seamlessly parses and indexes **PDF, TXT, and CSV** files.
- **Smart Query Rewriting**: Automatically optimizes user questions into descriptive semantic search queries for higher retrieval accuracy.
- **Premium UI/UX**: A responsive, dark-mode dual-pane interface with auto-focusing chat and floating toast notifications.
- **Zero-Persistence Option**: Configure the backend to wipe state on restart or persist data for production.

## 🧠 The RAG Pipeline

### 1. Ingestion & Chunking
DocBuddy uses a **Recursive Character Splitting** strategy:
- **Chunk Size**: 2,000 characters
- **Overlap**: 400 characters
- **Strategy**: The splitter recursively tries to break text at double newlines, single newlines, and spaces. This ensures that paragraphs and sentences are kept together, providing the LLM with coherent context.

### 2. Embedding & Storage
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (via Hugging Face Inference API).
- **Vector Store**: **Qdrant Cloud**. We use 384-dimensional vectors with Cosine similarity to find the most relevant document chunks.

### 3. Retrieval & Generation
- **Retrieval**: The system fetches the top 5 most relevant chunks for every query.
- **LLM**: Powered by **Llama 3** (via Groq API) for lightning-fast, high-quality reasoning.
- **Groundedness**: A strict system prompt ensures the AI only answers based on the provided context and cites its sources using bracketed markers.

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express, TypeScript, LangChain.js.
- **Database**: Qdrant Cloud (Vector), Local JSON (Metadata).

## ⚙️ Setup & Installation

### Backend
1. `cd backend`
2. `npm install`
3. Create a `.env` file with:
   ```env
   GROQ_API_KEY=your_key
   HUGGINGFACEHUB_API_TOKEN=your_token
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_key
   PORT=5000
   ```
4. `npm run build && npm start`

### Frontend
1. `cd frontend`
2. `npm install`
3. Create a `.env` file with:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. `npm run dev`

---
*Assignment 03 — Google NotebookLM RAG*
