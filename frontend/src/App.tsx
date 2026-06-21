import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import { FileUpload } from "./components/FileUpload";
import { ChatInterface } from "./components/ChatInterface";
import { ActivityPanel } from "./components/ActivityPanel";
import { useSessionActivity } from "./hooks/useSessionActivity";

const API_URL = import.meta.env.VITE_API_URL || "";
const BOOT_KEY = "docbuddy_boot";
const CHAT_KEY = "docbuddy_chat";

interface PersistedFile {
  name: string;
  size: number;
}

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<PersistedFile[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [showRestartToast, setShowRestartToast] = useState(false);
  const [sessionStartedAt] = useState(() => new Date().toLocaleTimeString());

  const { events, socketId, clear: clearActivity } = useSessionActivity();

  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/files`);
      setUploadedFiles(res.data);
    } catch (err) {
      console.error("Failed to fetch files from backend:", err);
    }
  }, []);

  // Detect a backend restart by comparing the server's boot id. On a new boot we
  // start a fresh session: clear the chat (remount via key) and the activity log.
  const checkBackendBoot = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/health`);
      const bootId: string | undefined = res.data?.bootId;
      if (!bootId) return;

      const previous = localStorage.getItem(BOOT_KEY);
      localStorage.setItem(BOOT_KEY, bootId);

      if (previous && previous !== bootId) {
        localStorage.removeItem(CHAT_KEY);
        setChatKey((k) => k + 1);
        clearActivity();
        setShowRestartToast(true);
        setTimeout(() => setShowRestartToast(false), 4500);
      }
    } catch (err) {
      console.error("Health check failed:", err);
    }
  }, [clearActivity]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchFiles(), checkBackendBoot()]);
      setIsInitialLoading(false);
    })();
  }, [fetchFiles, checkBackendBoot]);

  return (
    <main className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden text-neutral-200">
      {/* Top Navigation Bar */}
      <header className="flex-none px-6 py-4 bg-[#0a0a0a] border-b border-neutral-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="DocBuddy Icon"
            className="w-8 h-8 object-contain"
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
            <FileUpload
              uploadedFiles={uploadedFiles}
              onRefresh={fetchFiles}
              socketId={socketId}
            />
          </div>
        </aside>

        {/* Center: Chat Interface */}
        <section className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden min-w-0">
          <ChatInterface
            key={chatKey}
            hasDocuments={uploadedFiles.length > 0}
            isInitialLoading={isInitialLoading}
            socketId={socketId}
            activityOpen={activityOpen}
            activityCount={events.length}
            onToggleActivity={() => setActivityOpen((open) => !open)}
          />
        </section>

        {/* Right: Session Activity */}
        {activityOpen && (
          <ActivityPanel
            events={events}
            sessionStartedAt={sessionStartedAt}
            onClose={() => setActivityOpen(false)}
          />
        )}
      </div>

      {/* Backend-restart toast */}
      {showRestartToast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-neutral-800 bg-[#141414] px-4 py-3 shadow-2xl">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-amber-400/15 text-amber-400">
            <RefreshCw className="h-3 w-3" />
          </span>
          <span className="text-[13.5px] text-neutral-200">
            Backend restarted — new session, chat cleared
          </span>
        </div>
      )}
    </main>
  );
}

export default App;
