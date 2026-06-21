import { useCallback, useEffect, useState } from "react";
import { socket } from "../lib/socket";

export type StepState = "running" | "done" | "skipped" | "error";

export interface ActivityStep {
  name: string;
  state: StepState;
  ms?: number;
  note?: string;
}

export interface ActivityEvent {
  id: string;
  type: "query" | "ingest";
  title: string;
  ts: string;
  steps: ActivityStep[];
  meta?: Record<string, string>;
  totalMs?: number;
  running: boolean;
}

type StartPayload = { id: string; type: "query" | "ingest"; title: string; ts: string };
type StepPayload = { id: string; name: string; state: StepState; ms?: number; note?: string };
type EndPayload = { id: string; totalMs: number; meta: Record<string, string> };

const applyStep = (event: ActivityEvent, payload: StepPayload): ActivityEvent => {
  const steps = [...event.steps];
  const index = steps.findIndex((s) => s.name === payload.name);
  const next: ActivityStep = {
    name: payload.name,
    state: payload.state,
    ms: payload.ms,
    note: payload.note,
  };
  if (index >= 0) steps[index] = { ...steps[index], ...next };
  else steps.push(next);
  return { ...event, steps };
};

/**
 * Subscribes to the backend's live performance stream and builds the session
 * activity log. Each query/upload becomes one event whose steps fill in as the
 * backend reports them. `socketId` is exposed so callers can tag their requests.
 */
export function useSessionActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [socketId, setSocketId] = useState<string | undefined>(socket.id);

  useEffect(() => {
    const onConnect = () => setSocketId(socket.id);
    const onStart = (p: StartPayload) =>
      setEvents((prev) => [...prev, { ...p, steps: [], running: true }]);
    const onStep = (p: StepPayload) =>
      setEvents((prev) => prev.map((e) => (e.id === p.id ? applyStep(e, p) : e)));
    const onEnd = (p: EndPayload) =>
      setEvents((prev) =>
        prev.map((e) =>
          e.id === p.id ? { ...e, running: false, totalMs: p.totalMs, meta: p.meta } : e,
        ),
      );

    socket.on("connect", onConnect);
    socket.on("activity:start", onStart);
    socket.on("activity:step", onStep);
    socket.on("activity:end", onEnd);

    return () => {
      socket.off("connect", onConnect);
      socket.off("activity:start", onStart);
      socket.off("activity:step", onStep);
      socket.off("activity:end", onEnd);
    };
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  return { events, socketId, clear };
}
