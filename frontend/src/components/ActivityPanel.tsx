import { useEffect, useRef, useState } from "react";
import { Activity, ChevronRight, Search, FileText, X } from "lucide-react";
import type { ActivityEvent, ActivityStep } from "../hooks/useSessionActivity";

const fmtSeconds = (ms: number) => (ms / 1000).toFixed(2);

function StepRow({ step, maxMs }: { step: ActivityStep; maxMs: number }) {
  const dot =
    step.state === "done"
      ? "bg-emerald-400"
      : step.state === "running"
        ? "bg-amber-400 animate-pulse"
        : step.state === "error"
          ? "bg-red-500"
          : "bg-transparent border border-dashed border-neutral-600";

  const dur =
    step.state === "skipped"
      ? "skipped"
      : step.state === "running"
        ? "…"
        : step.ms != null
          ? `${step.ms}ms`
          : "";

  const pct = step.ms ? Math.max(6, Math.round((step.ms / maxMs) * 100)) : 0;

  return (
    <div className="py-[7px]">
      <div className="flex items-center gap-2.5">
        <span className={`h-[7px] w-[7px] flex-none rounded-full ${dot}`} />
        <span
          className={`flex-1 text-[12.5px] ${step.state === "skipped" ? "text-neutral-600" : "text-neutral-300"}`}
        >
          {step.name}
        </span>
        {step.note && (
          <span className="rounded border border-neutral-800 px-1.5 py-px text-[9.5px] uppercase tracking-wide text-neutral-500">
            {step.note}
          </span>
        )}
        <span
          className={`min-w-[52px] text-right font-mono text-[11.5px] ${step.state === "running" ? "text-amber-400" : "text-neutral-400"}`}
        >
          {dur}
        </span>
      </div>
      {step.state !== "skipped" && (
        <div className="mt-[7px] ml-4 h-[3px] overflow-hidden rounded-sm bg-neutral-900">
          <div
            className="h-full rounded-sm bg-gradient-to-r from-emerald-900 to-emerald-400 transition-[width] duration-500"
            style={{ width: `${step.state === "done" ? pct : 0}%` }}
          />
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  open,
  onToggle,
}: {
  event: ActivityEvent;
  open: boolean;
  onToggle: () => void;
}) {
  const isQuery = event.type === "query";
  const maxMs = Math.max(...event.steps.filter((s) => s.ms).map((s) => s.ms ?? 0), 1);
  const meta = event.meta ?? {};

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl border bg-[#0c0c0c] ${event.running ? "border-emerald-900/60" : "border-neutral-900"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 flex-none text-neutral-500 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span
          className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-md ${isQuery ? "bg-emerald-400/10 text-emerald-300" : "bg-violet-400/10 text-violet-300"}`}
        >
          {isQuery ? <Search className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-neutral-200">{event.title}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
            <span
              className={`text-[9.5px] font-bold uppercase tracking-wider ${isQuery ? "text-emerald-400" : "text-violet-400"}`}
            >
              {isQuery ? "Query" : "Ingest"}
            </span>
            <span>{new Date(event.ts).toLocaleTimeString()}</span>
          </span>
        </span>
        <span
          className={`flex-none font-mono text-[13px] font-semibold ${event.running ? "text-amber-400" : "text-neutral-100"}`}
        >
          {event.running || event.totalMs == null ? (
            "…"
          ) : (
            <>
              {fmtSeconds(event.totalMs)}
              <span className="text-[10px] font-normal text-neutral-500">s</span>
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-900 px-3.5 pb-3.5 pt-1">
          {Object.keys(meta).length > 0 && (
            <div className="my-3 grid grid-cols-2 gap-x-3.5 gap-y-1.5">
              {Object.entries(meta).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-px">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-600">{k}</span>
                  <span className="truncate font-mono text-[12px] text-neutral-300" title={v}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          )}
          {event.steps.map((s) => (
            <StepRow key={s.name} step={s} maxMs={maxMs} />
          ))}
          {event.steps.length === 0 && (
            <div className="py-3 text-center text-[12px] text-neutral-600">starting…</div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityPanelProps {
  events: ActivityEvent[];
  sessionStartedAt: string;
  onClose: () => void;
}

export function ActivityPanel({ events, sessionStartedAt, onClose }: ActivityPanelProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const autoOpened = useRef<Set<string>>(new Set());

  // Auto-expand an event the first time it appears as "running".
  useEffect(() => {
    const fresh = events.filter((e) => e.running && !autoOpened.current.has(e.id));
    if (fresh.length === 0) return;
    setOpenIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((e) => {
        next.add(e.id);
        autoOpened.current.add(e.id);
      });
      return next;
    });
  }, [events]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ordered = [...events].reverse(); // newest first

  return (
    <aside className="flex w-[360px] flex-none flex-col border-l border-neutral-900 bg-[#0f0f0f]">
      <div className="flex flex-none items-center justify-between border-b border-neutral-900 px-[18px] py-[17px]">
        <div className="flex items-center gap-2.5 text-[14px] font-semibold text-neutral-100">
          <Activity className="h-4 w-4 text-emerald-400" />
          Session activity
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-neutral-500 transition hover:text-neutral-200"
          aria-label="Close activity panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 pb-6">
        {ordered.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            open={openIds.has(event.id)}
            onToggle={() => toggle(event.id)}
          />
        ))}
        {events.length === 0 && (
          <div className="mt-10 px-6 text-center text-[13px] leading-relaxed text-neutral-600">
            No activity yet. Upload a document or ask a question to see each step's timing here.
          </div>
        )}
        <div className="pt-3 pb-1 text-center font-mono text-[11px] text-neutral-600">
          — session started {sessionStartedAt} —
        </div>
      </div>

      <div className="flex flex-none items-center gap-2 border-t border-neutral-900 px-4 py-[11px] text-[11px] text-neutral-600">
        <span className="h-[7px] w-[7px] rounded-full bg-emerald-400" />
        Live over WebSocket · click any event to expand
      </div>
    </aside>
  );
}
