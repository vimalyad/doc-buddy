import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, User, Bot, Loader2, Trash2, Copy, Check, FileUp } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Source tooltip
// ---------------------------------------------------------------------------
function SourceTooltip({
  match,
  index,
}: {
  match: RetrievedChunk;
  index: number;
}) {
  const [show, setShow] = useState(false);
  const metadata = match.metadata as { loc?: { pageNumber?: number } } | null;
  const pageNumber = metadata?.loc?.pageNumber;
  const badgeText = pageNumber ? `p. ${pageNumber}` : index;

  return (
    <span className="relative inline-block mx-0.5 group">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="h-4 px-1.5 text-[9px] font-bold bg-neutral-800 text-neutral-400 rounded-full inline-flex items-center justify-center hover:bg-neutral-700 hover:text-white transition-all shadow-sm align-super whitespace-nowrap"
      >
        {badgeText}
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1">
          <div className="text-[11px] font-medium text-neutral-300 mb-2 pb-2 border-b border-neutral-800 flex items-center justify-between">
            <span className="truncate pr-2">{match.source}</span>
            <span className="text-neutral-500 whitespace-nowrap">
              {pageNumber ? `Page ${pageNumber}` : `Chunk #${match.chunkIndex}`}
            </span>
          </div>
          <div className="text-[12px] leading-relaxed text-neutral-400">
            "
            {match.pageContent.length > 200
              ? match.pageContent.substring(0, 200) + "..."
              : match.pageContent}
            "
          </div>
        </div>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Code block component with copy button
// ---------------------------------------------------------------------------
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-neutral-800 bg-[#111111]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code body */}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-neutral-300 font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline markdown renderer
// Handles: fenced code blocks (```lang ... ```), inline `code`, [n] citations
// ---------------------------------------------------------------------------
function renderInline(
  text: string,
  matches: RetrievedChunk[],
  keyPrefix: string,
): React.ReactNode[] {
  // Split on inline code: `...`
  const inlineParts = text.split(/(`[^`]+`)/g);
  return inlineParts.flatMap((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      const code = part.slice(1, -1);
      return (
        <code
          key={`${keyPrefix}-ic-${i}`}
          className="px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-300 font-mono text-[13px]"
        >
          {code}
        </code>
      );
    }

    // Split on citations [n]
    const citParts = part.split(/(\[\d+\])/g);
    return citParts.map((cit, j) => {
      const citMatch = cit.match(/^\[(\d+)\]$/);
      if (citMatch) {
        const sourceIndex = parseInt(citMatch[1]) - 1;
        const sourceMatch = matches[sourceIndex];
        if (sourceMatch) {
          return (
            <SourceTooltip
              key={`${keyPrefix}-ic-${i}-cit-${j}`}
              match={sourceMatch}
              index={sourceIndex + 1}
            />
          );
        }
      }
      return <span key={`${keyPrefix}-ic-${i}-txt-${j}`}>{cit}</span>;
    });
  });
}

function renderMessageContent(
  content: string,
  matches: RetrievedChunk[] = [],
): React.ReactNode {
  // Split on fenced code blocks: ```lang\n...\n```
  const fencedRegex = /```([^\n]*)\n([\s\S]*?)```/g;
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let blockCount = 0;
  let match: RegExpExecArray | null;

  while ((match = fencedRegex.exec(content)) !== null) {
    // Text before the code block
    const before = content.slice(lastIndex, match.index);
    if (before) {
      segments.push(
        <span key={`text-${blockCount}`} className="whitespace-pre-wrap">
          {renderInline(before, matches, `pre-${blockCount}`)}
        </span>,
      );
    }

    const lang = match[1].trim();
    const code = match[2];
    segments.push(<CodeBlock key={`code-${blockCount}`} code={code} lang={lang} />);

    lastIndex = match.index + match[0].length;
    blockCount++;
  }

  // Remaining text after last code block
  const remaining = content.slice(lastIndex);
  if (remaining) {
    segments.push(
      <span key={`text-${blockCount}`} className="whitespace-pre-wrap">
        {renderInline(remaining, matches, `post-${blockCount}`)}
      </span>,
    );
  }

  return <>{segments}</>;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------
const STORAGE_KEY = "docbuddy_chat";
const API_URL = import.meta.env.VITE_API_URL || "";

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface ChatInterfaceProps {
  hasDocuments: boolean;
}

export function ChatInterface({ hasDocuments }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to the bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-focus input on any printable keypress
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (
        e.key.length !== 1 ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        document.activeElement === inputRef.current
      )
        return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

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
      const response = await axios.post(`${API_URL}/api/ask`, {
        question: input,
      });
      const data = response.data;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        matches: data.matches,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      let errorMessageText =
        "Sorry, I encountered an error while processing your request.";
      if (axios.isAxiosError(err)) {
        errorMessageText = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        errorMessageText = err.message;
      }

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

  return (
    <div className="relative flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden text-neutral-200">
      {/* Header */}
      <div className="px-8 py-5 border-b border-neutral-900 bg-[#0a0a0a] flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-neutral-400">Chat</h2>
        <button
          onClick={clearChat}
          title="Clear chat history"
          className="text-xs text-red-700 hover:text-red-400 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear Chat
        </button>
      </div>

      {/* Empty state — shown when no documents are uploaded */}
      {!hasDocuments && (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-5 pointer-events-none z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
            <FileUp className="h-7 w-7 text-neutral-500" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium text-neutral-300">No documents yet</p>
            <p className="mt-1.5 text-[13px] text-neutral-500 max-w-[220px] leading-relaxed">
              Upload a PDF, TXT, or CSV from the sidebar to start chatting
            </p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#0a0a0a]">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-6 w-full">
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
            <div className="flex-1 space-y-1.5 min-w-0">
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
          <div className="flex gap-6 w-full">
            <div className="flex-none w-7 h-7 flex items-center justify-center mt-0.5">
              <div className="w-full h-full rounded-sm bg-neutral-800 text-neutral-300 flex items-center justify-center border border-neutral-700">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 pt-1">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
              <span className="text-[14px] text-neutral-500">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#0a0a0a]">
        <div className="relative flex items-center w-full">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              hasDocuments
                ? "Ask a question..."
                : "Upload a document first to start asking questions"
            }
            disabled={isLoading || !hasDocuments}
            className="w-full pl-5 pr-14 py-4 bg-neutral-900 border border-neutral-800 rounded-xl text-base text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-700 focus:border-neutral-700 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !hasDocuments}
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
