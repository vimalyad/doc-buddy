# DocBuddy 📝🤖

DocBuddy is a full-stack, production-ready **Retrieval-Augmented Generation (RAG)** application. Designed as a personalized version of Google's NotebookLM, it allows users to upload their own documents (PDFs, TXTs, CSVs) and have highly grounded, context-aware conversations with them.

It features a sleek, minimalist dark-mode UI with inline NotebookLM-style citations that let you instantly trace AI answers back to their exact source documents.

---

## ✨ Key Features

- **Sleek Minimalist UI:** A beautiful, dark-themed interface built with Tailwind CSS, focusing purely on reading and chatting.
- **NotebookLM-Style Page Citations:** The AI cites its claims with small badges (e.g., `p. 12`). The backend parses PDFs natively page-by-page, allowing the UI to instantly trace AI answers back to their exact page number and source text via an interactive hover tooltip.
- **Persistent State:** Chat history and knowledge base metadata are automatically saved to your browser's local storage so you don't lose your work on refresh.
- **Zero-Duplicate Ingestion:** Uploading the same file automatically wipes old versions to keep your vector database clean. The database is also automatically wiped on server startup to guarantee a clean slate.
- **Smart Query Rewriting:** Before searching, the AI silently rewrites your raw question into an optimized semantic search query, drastically improving retrieval accuracy.

---

## 🏗 Architecture & Tech Stack

The project follows a Monorepo architecture separating the frontend and backend.

### Frontend
- **React 18 & TypeScript**
- **Vite** for fast bundling
- **Tailwind CSS** for modern, responsive styling
- **Axios** for clean, robust API communication
- **Lucide React** for crisp, scalable icons

### Backend

- **Node.js & Express** with TypeScript
- **LangChain.js** for AI orchestration and text splitting
- **Qdrant Cloud** for lightning-fast Vector Database operations
- **Hugging Face (`all-MiniLM-L6-v2`)** for creating high-quality document embeddings
- **Groq (Llama 3.1 8B/70B)** for blazing-fast LLM inference
- **LlamaParse & PDF-Parse** for robust document ingestion

---

## ⚙️ Setup & Installation

### Prerequisites

Make sure you have **Node.js (v18+)** installed. You will also need API keys from the following services:

1. **Groq API Key** (for Llama 3.1)
2. **Hugging Face Token** (for Inference Embeddings)
3. **Qdrant Cloud URL & API Key** (for the Vector Database)
4. **LlamaCloud API Key** (for LlamaParse PDF extraction)

### 1. Clone the Repository

```bash
git clone https://github.com/vimalyad/doc-buddy.git
cd doc-buddy
```

### 2. Install Dependencies

Install dependencies for both the frontend and backend.

```bash
# In the root directory (if using npm workspaces) or inside both folders:
npm install
```

### 3. Environment Variables

Create a `.env` file in the **root** of the project and add your API keys:

```env
# Server
PORT=3000

# LLM & Parsers
GROQ_API_KEY="your_groq_api_key"
LLAMA_CLOUD_API_KEY="your_llamacloud_api_key"

# Vector Database
QDRANT_URL="your_qdrant_cluster_url"
QDRANT_API_KEY="your_qdrant_api_key"
QDRANT_COLLECTION_NAME="docbuddy_documents"

# Embeddings
HUGGINGFACEHUB_API_KEY="your_hf_token"
```

### 4. Running the Application

You need to run both the backend and frontend servers.

**Start the Backend:**

```bash
cd backend
npm run dev
```

**Start the Frontend:**

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 💡 How to Use

1. **Upload a Document:** On the left sidebar, click "Select file" or drag-and-drop a PDF, TXT, or CSV file. The backend will parse, split, embed, and store the document in Qdrant.
2. **Ask a Question:** Type a question in the chat interface.
3. **Check the Sources:** When DocBuddy answers, look for the small citation numbers (e.g., `[1]`). Hover over them to see the exact text it referenced.
4. **Clear Chat:** Use the "Clear Chat" button in the top right to wipe your local conversation history.
5. **Delete Sources:** Click the "X" next to an uploaded document to permanently remove it from the vector database.

_Note: Every time the backend server restarts, the Qdrant database is automatically wiped to ensure a completely fresh slate for development._
