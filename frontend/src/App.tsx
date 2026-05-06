import { FileUpload } from "./components/FileUpload";
import { ChatInterface } from "./components/ChatInterface";

function App() {
  return (
    <main className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      {/* Top Navigation Bar */}
      <header className="flex-none px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            D
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            DocBuddy
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded uppercase tracking-wider">
            RAG Pipeline v1.0
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Document Ingestion */}
        <aside className="w-80 lg:w-96 flex-none border-r border-slate-800 bg-slate-900 overflow-y-auto">
          <div className="p-6">
            <FileUpload />
          </div>
        </aside>

        {/* Right Content: Chat Interface */}
        <section className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 bg-slate-950 overflow-y-auto">
          <ChatInterface />
        </section>
      </div>
    </main>
  );
}

export default App;
