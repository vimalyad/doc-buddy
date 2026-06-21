# Architecture

DocBuddy is a NotebookLM-style RAG (Retrieval-Augmented Generation) app. Users upload documents, the backend indexes them into a vector database, and questions are answered **only** from the indexed content, with citations.

## High-level overview

```
┌─────────────────┐         HTTP / JSON          ┌──────────────────────────┐
│    Frontend     │ ───────────────────────────▶ │         Backend          │
│ React + Vite +  │   /api/upload  /api/ask      │  Express + TypeScript     │
│   Tailwind      │ ◀─────────────────────────── │   (LangChain.js)          │
└─────────────────┘                              └────────────┬─────────────┘
                                                              │
                          ┌───────────────────────────────────┼───────────────────────────────┐
                          ▼                                     ▼                               ▼
                 ┌─────────────────┐                 ┌─────────────────┐             ┌─────────────────┐
                 │  Hugging Face   │                 │  Qdrant Cloud   │             │      Groq       │
                 │   embeddings    │                 │  vector store   │             │   LLM (Llama)   │
                 │ all-MiniLM-L6   │                 │ dense + sparse  │             └─────────────────┘
                 └─────────────────┘                 └─────────────────┘
                                                              ▲
                                                ┌─────────────┴─────────────┐
                                                │   Cohere Rerank (opt.)     │
                                                └────────────────────────────┘

  Local JSON file (backend/files.json) tracks uploaded-file metadata.
```

## Components

| Layer | Tech | Responsibility |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS | Upload UI, chat interface, hover-able citations. Sends recent chat turns for follow-ups. |
| **Backend** | Express, TypeScript, LangChain.js | REST API, parsing, chunking, retrieval, and answer orchestration. |
| **Embeddings** | Hugging Face Inference (`all-MiniLM-L6-v2`, 384-dim) | Turns text into dense vectors. |
| **Vector store** | Qdrant Cloud | Stores dense + sparse vectors; hybrid search with RRF fusion. |
| **Reranker** | Cohere Rerank (optional) | Cross-encoder re-scoring of candidates for precision. |
| **LLM** | Groq (Llama 3.1) | Query rewriting, relevance grading (CRAG), and grounded answer generation. |
| **Realtime** | Socket.IO | Streams per-step performance events to the live activity panel; carries the boot id for restart detection. |
| **Metadata DB** | Flat JSON file (`backend/files.json`) | Tracks uploaded file names/sizes (not a real database). |

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/upload` | Parse, chunk, embed, and index a document. |
| `POST` | `/api/ask` | Answer a question from indexed content (with optional chat history). |
| `POST` | `/api/delete` | Remove a document's chunks by source filename. |
| `GET` | `/api/files` | List indexed files. |
| `GET` | `/api/health` | Health check; returns a per-process `bootId` used to detect restarts. |

A **Socket.IO** channel runs on the same port. The frontend sends its `socket.id` with each `/api/ask` and `/api/upload`; the backend streams `activity:start` / `activity:step` / `activity:end` events back to that client to drive the live activity panel.

## Ingestion flow (`POST /api/upload`)

```
File (PDF/TXT/CSV)
   │  Multer (in-memory, 50MB cap)
   ▼
Parse  →  one or more LangChain Documents (parsers/localParsers.ts)
   │
   ▼
Parent/child split (parsers/textSplitter.ts)
   • Parent windows: 2000 chars / 200 overlap   (context for the LLM)
   • Child slices:   400 chars  / 80 overlap     (embedded for precision)
   │
   ▼
Embed children (Hugging Face) + build BM25 sparse vectors (utils/sparse.ts)
   │  concurrent batches (EMBED_BATCH_SIZE × CONCURRENCY_LIMIT)
   ▼
Upsert to Qdrant (each point = dense + sparse vector; payload stores the PARENT text)
   │  re-uploading the same filename replaces its chunks first
   ▼
Summarize the document (one Groq call) → store the summary
   │
   ▼
Record metadata + summary in backend/files.json
```

## Query flow (`POST /api/ask`)

```
Question (+ recent chat history)
   │
   ▼
1. Query rewrite  (prompts/queryRewritePrompt.ts)
   history-aware: resolves "it"/"that" in follow-ups into a standalone query
   │
   ▼
2. Hybrid retrieval  (services/documentVectorStore.ts)
   • Dense (semantic) arm  ┐
   • Sparse (BM25) arm     ┘ fused with Reciprocal Rank Fusion (RRF) in Qdrant
   • child matches deduped back to distinct PARENT windows
   │
   ▼
3. Rerank (optional, services/rerankService.ts)
   Cohere cross-encoder re-scores candidates against the original question
   │
   ▼
4. Corrective RAG / CRAG  (services/qaService.ts, on by default)
   grade retrieval:
     correct   → use as-is
     ambiguous → keep only relevant sources
     incorrect → ONE corrective retry with an alternative query (back to step 2)
   │
   ▼
5. Generation  (prompts/groundedRagPrompt.ts)
   Groq LLM answers ONLY from the numbered [Source N] context, with citations.
   A "document overview" (stored per-document summaries) is also supplied so the
   model can answer summary/overview questions and, when the context doesn't
   cover the question, point the user to what the documents do cover.
   │
   ▼
Response: { answer, sources, matches }  → frontend renders hover-able citations
```

## Key design notes

- **Grounded by construction**: the LLM only sees retrieved context and is instructed to answer from it and cite sources — it does not answer from prior knowledge.
- **Graceful degradation**: query rewrite, reranking, and CRAG each fall back to the previous stage's result on any error, so a single failing step never breaks an answer.
- **Free-tier friendly**: reranking (Cohere) is optional; everything else runs on Groq + Hugging Face + Qdrant free tiers.
- **Persistence**: data persists across restarts by default. On startup `index.ts` runs only non-destructive setup (`initDb()` + `ensureQdrantCollection()`). Setting `RESET_ON_STARTUP=true` wipes `files.json` and the Qdrant collection on boot (clean-slate mode).

## Configuration

Behavior is tuned via environment variables (see `README.md`): required keys for Groq, Hugging Face, and Qdrant; optional `COHERE_API_KEY` (reranking), `ENABLE_CRAG` (Corrective RAG, on by default), and `RESET_ON_STARTUP` (wipe state on boot, off by default).
