import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Loader2, Trash2 } from "lucide-react";

interface RetrievedChunk {
  id: string;
  score: number;
  pageContent: string;
  chunkIndex: number | null;
  source: string;
  metadata: unknown;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  matches?: RetrievedChunk[];
}

function SourceTooltip({
  match,
  index,
}: {
  match: RetrievedChunk;
  index: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block mx-0.5 group">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 text-[9px] font-bold bg-slate-700 text-slate-400 rounded-md inline-flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
      >
        {index}
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1">
          <div className="text-[10px] font-bold text-white mb-2 pb-2 border-b border-slate-700/50 truncate flex items-center justify-between">
            <span>{match.source}</span>
            <span className="text-slate-500">Chunk #{match.chunkIndex}</span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-300 italic line-clamp-6">
            "{match.pageContent}"
          </div>
          <div className="mt-3 text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
            View full source
          </div>
        </div>
      )}
    </span>
  );
}

const STORAGE_KEY = "docbuddy_chat";

const DEFAULT_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "Hello! I'm DocBuddy. Upload a document and ask me anything about it.",
  timestamp: new Date(),
};

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_MESSAGE];
    const parsed = JSON.parse(raw) as (Omit<Message, "timestamp"> & {
      timestamp: string;
    })[];
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [DEFAULT_MESSAGE];
  }
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to the bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const clearChat = () => {
    const fresh = [
      { ...DEFAULT_MESSAGE, id: Date.now().toString(), timestamp: new Date() },
    ];
    setMessages(fresh);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        throw new Error("Failed to get an answer from the assistant.");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        matches: data.matches,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMessageText =
        err instanceof Error
          ? err.message
          : "Sorry, I encountered an error while processing your request.";

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (
    content: string,
    matches: RetrievedChunk[] = [],
  ) => {
    const parts = content.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[(\d+)\]/);
      if (citationMatch) {
        const sourceIndex = parseInt(citationMatch[1]) - 1;
        const sourceMatch = matches[sourceIndex];
        if (sourceMatch) {
          return (
            <SourceTooltip
              key={index}
              match={sourceMatch}
              index={sourceIndex + 1}
            />
          );
        }
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-500" />
          Intelligence Console
        </h2>
        <div className="flex gap-3 items-center">
          <button
            onClick={clearChat}
            title="Clear chat history"
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex gap-1 items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
              Active Session
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-4 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`flex-none w-8 h-8 rounded-lg flex items-center justify-center ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={`flex flex-col max-w-[85%] ${
                message.role === "user" ? "items-end" : ""
              }`}
            >
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"
                }`}
              >
                {renderMessageContent(message.content, message.matches)}
              </div>
              <span className="mt-1 text-[9px] font-bold text-slate-600 px-1 uppercase tracking-tight">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="flex-none w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span className="text-[11px] text-slate-400 font-medium italic">
                Scanning knowledge base...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center max-w-3xl mx-auto w-full px-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Start typing..."
            disabled={isLoading}
            className="w-full pl-5 pr-14 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 placeholder:text-slate-600 focus:ring-0 focus:border-slate-700 transition-all outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-4 p-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white disabled:bg-slate-900 disabled:text-slate-700 disabled:cursor-not-allowed transition-all shadow-lg"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="mt-2 px-6 flex justify-end">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
            {messages.length > 1 ? "Grounded in sources" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
