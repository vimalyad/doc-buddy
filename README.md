# DocBuddy

DocBuddy is a full-stack RAG (Retrieval-Augmented Generation) application designed to mirror the Google NotebookLM experience. It allows users to upload documents and have grounded, citation-rich conversations with their data.

## ✨ Key Features
- **Advanced RAG Pipeline**: Hybrid retrieval, parent-document context expansion, optional cross-encoder reranking, self-correcting retrieval (CRAG), and conversational follow-ups (see below).
- **Self-Correcting Retrieval (CRAG)**: Before answering, the system grades whether the retrieved context is actually relevant and re-retrieves with an alternative query when it isn't — reducing answers based on irrelevant chunks.
- **Interactive Citations**: Hover over AI-generated citations (e.g., `[1]`, `p. 3`) to see the exact text snippet retrieved from your document.
- **Multi-Format Support**: Seamlessly parses and indexes **PDF, TXT, and CSV** files.
- **Conversational Memory**: Follow-up questions ("what about its limits?") are resolved against the chat history, so retrieval understands references and pronouns.
- **Premium UI/UX**: A responsive, dark-mode dual-pane interface with auto-focusing chat and floating toast notifications.
- **Persistent by Default**: Uploaded documents survive restarts. Optionally wipe everything on boot with `RESET_ON_STARTUP=true` for a clean slate.

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

### 5. Corrective RAG (CRAG)
Before generating, a single Groq call grades whether the retrieved sources can actually answer the question:
- **Correct** → answer from the retrieved context as-is.
- **Ambiguous** → keep only the sources graded relevant.
- **Incorrect** → run one bounded corrective retry with an alternative query, then answer (or abstain).

CRAG is **enabled by default** and powered by the existing Groq key (no extra service). It fails open — any grading hiccup is treated as "correct" so an answer is never blocked — and the corrective retry is capped at one (no loops). Set `ENABLE_CRAG=false` to disable.

### 6. Query Rewriting & Generation
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

   # Optional — Corrective RAG is on by default; set false to disable
   # ENABLE_CRAG=false

   # Optional — data persists by default; set true to wipe on every restart
   # RESET_ON_STARTUP=true
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
