# DocBuddy

DocBuddy is a full-stack RAG (Retrieval-Augmented Generation) application designed to mirror the Google NotebookLM experience. It allows users to upload documents and have grounded, citation-rich conversations with their data.

## ✨ Key Features
- **Advanced RAG Pipeline**: Hybrid retrieval, parent-document context expansion, optional cross-encoder reranking, and conversational follow-ups (see below).
- **Interactive Citations**: Hover over AI-generated citations (e.g., `[1]`, `p. 3`) to see the exact text snippet retrieved from your document.
- **Multi-Format Support**: Seamlessly parses and indexes **PDF, TXT, and CSV** files.
- **Conversational Memory**: Follow-up questions ("what about its limits?") are resolved against the chat history, so retrieval understands references and pronouns.
- **Premium UI/UX**: A responsive, dark-mode dual-pane interface with auto-focusing chat and floating toast notifications.
- **Zero-Persistence Option**: Configure the backend to wipe state on restart or persist data for production.

## 🧠 The RAG Pipeline

### 1. Ingestion & Parent/Child Chunking
DocBuddy uses **parent-document splitting** to balance retrieval precision with answer context:
- **Parent windows**: 2,000 characters / 200 overlap — the large, context-rich passages fed to the LLM.
- **Child slices**: 400 characters / 80 overlap — small, focused units that are embedded and indexed.
- **Strategy**: Recursive character splitting keeps paragraphs and sentences together. Small children sharpen retrieval precision; the surrounding parent gives the LLM enough context to answer.

### 2. Embedding & Storage
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (via Hugging Face Inference API), 384-dimensional.
- **Vector Store**: **Qdrant Cloud** with **named vectors** — a dense semantic vector (Cosine) plus a sparse BM25 keyword vector (Qdrant computes IDF server-side).

### 3. Hybrid Retrieval
Every query runs two retrieval arms that are fused with **Reciprocal Rank Fusion (RRF)**:
- **Dense (semantic)**: embedding similarity — great for paraphrases and concepts.
- **Sparse (BM25 keyword)**: exact-term matching — great for names, IDs, and acronyms.

Because matches are child slices, results are deduped back to distinct **parent** windows before they reach the LLM.

### 4. Reranking (optional)
When a `COHERE_API_KEY` is configured, the top hybrid candidates are re-scored by a **Cohere cross-encoder reranker**, which jointly evaluates each `(question, passage)` pair for higher precision. If no key is set, retrieval gracefully falls back to the hybrid ordering.

### 5. Query Rewriting & Generation
- **Conversational query rewriting**: the raw question (plus recent chat turns) is rewritten into a standalone, retrieval-optimized search query.
- **LLM**: Powered by **Llama 3** (via Groq API) for fast, high-quality reasoning.
- **Groundedness**: A strict system prompt ensures the AI only answers based on the provided context and cites its sources using bracketed markers.

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express, TypeScript, LangChain.js.
- **Database**: Qdrant Cloud (Vector), Local JSON (Metadata).
- **AI Services**: Groq (LLM), Hugging Face (embeddings), Cohere (reranking, optional).

## ⚙️ Setup & Installation

### Backend
1. `cd backend`
2. `npm install`
3. Create a `.env` file with:
   ```env
   GROQ_API_KEY=your_key
   HUGGINGFACEHUB_API_KEY=your_token
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_key
   PORT=5000

   # Optional — enables cross-encoder reranking
   COHERE_API_KEY=your_cohere_key
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

## 🔑 Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | ✅ | — | LLM via Groq |
| `HUGGINGFACEHUB_API_KEY` | ✅ | — | Embeddings via Hugging Face |
| `QDRANT_URL` | ✅ | — | Qdrant Cloud endpoint |
| `QDRANT_API_KEY` | ✅ | — | Qdrant Cloud API key |
| `PORT` | ❌ | `3000` | Backend server port |
| `COHERE_API_KEY` | ❌ | — | Enables cross-encoder reranking |
| `GROQ_MODEL` | ❌ | `llama-3.1-8b-instant` | Groq model id |
| `QDRANT_COLLECTION_NAME` | ❌ | `docbuddy_documents` | Qdrant collection |
| `EMBED_BATCH_SIZE` | ❌ | `20` | Chunks per embedding call |
| `CONCURRENCY_LIMIT` | ❌ | `3` | Concurrent embed/upsert batches (keep ≤3 on the HF free tier) |
| `RERANK_MODEL` | ❌ | `rerank-v3.5` | Cohere rerank model |
| `RERANK_CANDIDATE_LIMIT` | ❌ | `20` | Candidates fetched before reranking |

> **Note:** The backend reads `HUGGINGFACEHUB_API_KEY` (not `HUGGINGFACEHUB_API_TOKEN`).

---
