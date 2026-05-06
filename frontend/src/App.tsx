import { FileUpload } from "./components/FileUpload";
import { ChatInterface } from "./components/ChatInterface";

function App() {
  return (
    <main className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden text-neutral-200">
      {/* Top Navigation Bar */}
      <header className="flex-none px-6 py-4 bg-[#0a0a0a] border-b border-neutral-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="DocBuddy Icon"
            className="w-8 h-8 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
          <span className="text-[15px] font-semibold tracking-tight text-neutral-100">
            DocBuddy
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Document Ingestion */}
        <aside className="w-80 lg:w-96 flex-none border-r border-neutral-900 bg-[#0f0f0f] overflow-y-auto">
          <div className="p-8">
            <FileUpload />
          </div>
        </aside>

        {/* Right Content: Chat Interface */}
        <section className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
          <ChatInterface />
        </section>
      </div>
    </main>
  );
}

export default App;
