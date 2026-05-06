import { useState } from "react";
import { FileUpload } from "./components/FileUpload";
import { ChatInterface } from "./components/ChatInterface";

function App() {
  const [view, setView] = useState<"upload" | "chat">("upload");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              D
            </div>
            <span className="text-xl font-bold tracking-tight">DocBuddy</span>
          </div>
          <nav className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setView("upload")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                view === "upload"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setView("chat")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                view === "chat"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chat
            </button>
          </nav>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
          {view === "upload" ? <FileUpload /> : <ChatInterface />}
        </div>
      </div>
    </main>
  );
}

export default App;
