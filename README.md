# DocBuddy

DocBuddy is a full-stack RAG (Retrieval-Augmented Generation) application designed as a zero-cost alternative to NotebookLM.

## Architecture & Tech Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Orchestration:** LangChain.js
- **Document Parser:** LlamaParse API (Primary) + `pdf-parse` (PDF Fallback) + `CSVLoader` (for CSVs)
- **Embeddings:** Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`)
- **Vector Database:** Qdrant Cloud (via `@qdrant/js-client-rest`)
- **LLM:** Groq API (Llama 3 8B or 70B)
- **Deployment Targets:** Vercel (Frontend), Render (Backend)

## Current Status

- Done: Phase 1 - Scaffolding
- Done: Phase 2 - Ingestion Pipeline
- Done: Phase 3 - Embeddings & Vector Store
- Done: Phase 4 - RAG Retrieval & Generation
- Done: Phase 5 - Frontend UI
- Next: Phase 6 - Deployment Polish

## Getting Started

1. Clone the repository.
2. Run `npm install` to install monorepo dependencies.
3. Configure the `.env` based on `.env.example`.
4. Run `npm run dev` to start the frontend and backend workspaces.
