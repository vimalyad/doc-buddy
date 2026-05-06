# DocBuddy

DocBuddy is a full-stack RAG (Retrieval-Augmented Generation) application built to fulfill the requirements of Assignment 03. It is a personalized version of Google NotebookLM, allowing users to upload documents and have grounded, context-aware conversations with them.

## 📄 Problem Statement
The goal was to build an application where a user can upload any document (PDF, TXT, or CSV), which the system processes and stores intelligently. The user can then ask natural language questions and receive answers strictly grounded in the document's actual content, preventing hallucinations.

## 🚀 What was Built
A complete, end-to-end RAG pipeline featuring:
- **Ingestion:** Memory-based file upload handling for PDF, TXT, and CSV.
- **Parsing & Extraction:** High-fidelity document parsing using **LlamaParse** (primary) with local `pdf-parse` and `CSVLoader` fallbacks.
- **Chunking Strategy:** Implemented **Recursive Character Text Splitting** (Chunk Size: 1000, Overlap: 200) to maintain semantic context across segments.
- **Embedding:** Utilized **Hugging Face Inference API** (`sentence-transformers/all-MiniLM-L6-v2`) to generate vector representations of document chunks.
- **Vector Storage:** Integrated **Qdrant Cloud** as the vector database for efficient semantic indexing and retrieval.
- **Retrieval:** Semantic search implementation to fetch the most relevant document segments based on user queries.
- **Generation:** Grounded answer generation using **Groq (Llama 3.1)**, constrained by a strict system prompt to ensure responses are derived solely from the retrieved context.

## 🛠 Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend:** Node.js, Express, TypeScript.
- **Orchestration:** LangChain.js.
- **Vector Database:** Qdrant Cloud.
- **LLM:** Groq API (Llama 3.1).

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- API Keys: Groq, LlamaCloud, Qdrant, and Hugging Face.

### Steps
1. **Clone & Install:**
   ```bash
   git clone <repo-url>
   npm install
   ```
2. **Environment Configuration:**
   Configure a `.env` file in the root directory (refer to `.env.example`).
3. **Run Application:**
   ```bash
   npm run dev
   ```

## 🏗 Architecture & Code Quality
The project follows **SOLID principles** for maintainable and understandable code. It uses a **Monorepo architecture** with NPM workspaces for a clean separation of concerns between the frontend and backend. Security headers and CORS are managed via `helmet` and `cors` for production readiness.

## 🔗 Submission Links
- **GitHub Repository:** [Insert Repository Link Here]
- **Live Project:** [Insert Live Deployment Link Here]
