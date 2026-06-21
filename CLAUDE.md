# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git & commit conventions

- Commits follow Conventional Commits (`feat:`, `fix:`, `perf:`, `docs(scope):`, etc.).
- **Never reference Claude, Claude Code, AI, coding agents, or co-authorship in any git artifact** — commit messages, commit bodies, PR titles/descriptions, or branch names. Do not add `Co-Authored-By` trailers or "Generated with" footers. Write commits as if authored entirely by a human developer.
- **One improvement per branch.** Each enhancement (e.g. an advanced-RAG feature) is developed on its own dedicated branch off `main` and shipped via its own PR — never bundle multiple improvements into one branch.

## Project layout

Two independent npm packages, each with its own `package.json`, `tsconfig`, and `.env`:

- `backend/` — Express + TypeScript RAG API.
- `frontend/` — React 19 + Vite + Tailwind CSS v4 single-page app.

There is no root-level package or workspace; install and run each side separately.

## Commands

### Backend (`cd backend`)
- `npm run dev` — run with hot reload via `nodemon src/index.ts`.
- `npm run build` — compile TypeScript to `dist/` (`tsc`).
- `npm start` — run the compiled `dist/index.js` (requires `build` first).
- No test runner or linter is configured for the backend.

### Frontend (`cd frontend`)
- `npm run dev` — Vite dev server.
- `npm run build` — type-check then bundle (`tsc -b && vite build`).
- `npm run lint` — ESLint over the project.
- `npm run preview` — preview the production build.
- No test runner is configured for the frontend.

## Environment variables

Backend `.env` (loaded from `backend/.env`, falling back to a root `../.env`):
- `GROQ_API_KEY` — required; LLM via Groq.
- `HUGGINGFACEHUB_API_KEY` — required; embeddings. **Note:** the code reads `HUGGINGFACEHUB_API_KEY` (see `config/embeddings.ts`), but `README.md` documents `HUGGINGFACEHUB_API_TOKEN`. The code name wins.
- `QDRANT_URL`, `QDRANT_API_KEY` — required; Qdrant Cloud connection.
- `PORT` — server port (defaults to 3000 in code, README uses 5000).
- Optional tuning: `GROQ_MODEL` (default `llama-3.1-8b-instant`), `QDRANT_COLLECTION_NAME` (default `docbuddy_documents`), `EMBED_BATCH_SIZE` (default 20), `CONCURRENCY_LIMIT` (default 3; keep ≤3 on the HuggingFace free tier).

Frontend `.env`:
- `VITE_API_URL` — backend base URL (e.g. `http://localhost:5000`). Empty string means same-origin.

## Architecture

The system is a NotebookLM-style RAG pipeline. Backend endpoints (`backend/src/index.ts`):
`POST /api/upload`, `POST /api/ask`, `POST /api/delete`, `GET /api/files`, `GET /api/health`.

### Ingestion flow (`POST /api/upload`)
1. `middleware/upload.ts` — Multer with **in-memory storage** (files live as Buffers, never written to disk), 50MB limit, restricted to PDF/TXT/CSV by MIME type or extension.
2. `parsers/localParsers.ts` — dispatches by extension to LangChain `PDFLoader` (one Document per page), raw `text`, or `CSVLoader`. Each Document gets `metadata.source = originalname`.
3. `parsers/textSplitter.ts` — `RecursiveCharacterTextSplitter`, chunk size **2000**, overlap **400**.
4. `services/documentVectorStore.ts` `upsertDocumentChunks` — embeds and upserts in **concurrent batches** (`runWithConcurrency` over `EMBED_BATCH_SIZE` batches, `CONCURRENCY_LIMIT` in flight). Re-uploading the same filename first calls `deleteDocumentBySource` so chunks are replaced, not duplicated.
5. `config/database.ts` — file metadata is tracked in a flat-file JSON DB at `backend/files.json` (not a real database).

### Query flow (`POST /api/ask`)
`controllers/askController.ts` → `services/qaService.ts` `answerQuestion`:
1. **Query rewrite** — the raw question is rewritten into a retrieval-optimized query (`prompts/queryRewritePrompt.ts`); silently falls back to the original on any failure.
2. **Retrieval** — `searchSimilarChunks` runs **hybrid search**: a dense (semantic) arm using the HF embedding of the rewritten query and a sparse (BM25 keyword) arm from `utils/sparse.ts`, each prefetching `PREFETCH_LIMIT` (20) candidates, fused server-side with Qdrant **Reciprocal Rank Fusion (RRF)** down to the requested limit (top 5 default, capped at 10 via `MAX_MATCH_LIMIT`).
3. **Generation** — `prompts/groundedRagPrompt.ts` builds a strict grounded prompt with numbered `[Source N]` context; the Groq LLM (`temperature: 0`) answers with bracketed citations.
4. Response includes `answer`, `sources` (metadata), and `matches` (full chunks) so the frontend can render hover-able citations.

### Vector store conventions (`config/vectorStore.ts`)
- Collection `docbuddy_documents` uses **named vectors**: a dense vector `dense` (**384-dim**, Cosine — must match the `all-MiniLM-L6-v2` embedding model) and a sparse vector `bm25` (`modifier: "idf"`, so Qdrant computes IDF and the app only sends raw term frequencies). Upserts write both per point; this requires the Qdrant Query API (`client.query` with `prefetch` + `fusion`), not the legacy `client.search`.
- A `keyword` payload index on `source` enables per-file deletion.

### State reset on startup (important gotcha)
`index.ts` calls `resetDb()` **and** `resetQdrantCollection()` on every server boot — this **wipes `files.json` and the entire Qdrant collection** each restart (zero-persistence mode). Removing these calls is the switch to make ingested data persist across restarts.

### Config singletons
`config/groq.ts`, `config/embeddings.ts`, and `config/qdrant.ts` use lazy singletons that read env vars on first use and throw a descriptive error if a required key is missing.

### Frontend
`src/App.tsx` is a two-pane shell: `FileUpload` sidebar (`components/FileUpload.tsx`) and `ChatInterface` (`components/ChatInterface.tsx`). All backend calls go through `axios` against `VITE_API_URL`. File list state lives in `App` and is refreshed via the `onRefresh` callback after uploads/deletes.
