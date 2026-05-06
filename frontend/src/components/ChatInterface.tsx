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
        className="w-4 h-4 text-[9px] font-bold bg-neutral-800 text-neutral-400 rounded-full inline-flex items-center justify-center hover:bg-neutral-700 hover:text-white transition-all shadow-sm align-super"
      >
        {index}
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1">
          <div className="text-[11px] font-medium text-neutral-300 mb-2 pb-2 border-b border-neutral-800 flex items-center justify-between">
            <span className="truncate pr-2">{match.source}</span>
            <span className="text-neutral-500 whitespace-nowrap">Chunk #{match.chunkIndex}</span>
          </div>
          <div className="text-[12px] leading-relaxed text-neutral-400">
            "{match.pageContent.length > 200 ? match.pageContent.substring(0, 200) + "..." : match.pageContent}"
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
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden text-neutral-200">
      {/* Header */}
      <div className="px-8 py-5 border-b border-neutral-900 bg-[#0a0a0a] flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-neutral-400">
          Chat
        </h2>
        <button
          onClick={clearChat}
          title="Clear chat history"
          className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#0a0a0a]">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-6 max-w-3xl mx-auto w-full">
            <div className="flex-none w-7 h-7 flex items-center justify-center mt-0.5">
              {message.role === "user" ? (
                <div className="w-full h-full rounded-sm bg-neutral-200 text-neutral-900 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-full h-full rounded-sm bg-neutral-800 text-neutral-300 flex items-center justify-center border border-neutral-700">
                  <Bot className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-medium text-[14px] text-neutral-500">
                {message.role === "user" ? "You" : "DocBuddy"}
              </div>
              <div className="text-[15px] leading-relaxed text-neutral-300">
                {renderMessageContent(message.content, message.matches)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex gap-6 max-w-3xl mx-auto w-full">
            <div className="flex-none w-7 h-7 flex items-center justify-center mt-0.5">
              <div className="w-full h-full rounded-sm bg-neutral-800 text-neutral-300 flex items-center justify-center border border-neutral-700">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 pt-1">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
              <span className="text-[14px] text-neutral-500">
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#0a0a0a]">
        <div className="relative flex items-center max-w-3xl mx-auto w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="w-full pl-5 pr-14 py-4 bg-neutral-900 border border-neutral-800 rounded-xl text-base text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-700 focus:border-neutral-700 transition-all outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 p-2 text-neutral-500 hover:text-neutral-200 disabled:text-neutral-700 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
