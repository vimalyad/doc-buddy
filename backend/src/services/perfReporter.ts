import { randomUUID } from "crypto";
import { Server } from "socket.io";

/**
 * Streams per-step performance events for one operation (a query or an upload)
 * to the requesting client over Socket.IO, powering the live activity panel.
 *
 * Protocol (server → client):
 *   activity:start { id, type, title, ts }
 *   activity:step  { id, name, state: "running"|"done"|"skipped"|"error", ms?, note? }
 *   activity:end   { id, totalMs, meta }
 *
 * When there is no Socket.IO server or no target socket, a no-op reporter is
 * returned so callers never have to null-check — instrumentation simply does
 * nothing.
 */
export interface PerfReporter {
  /** Times `fn`, emitting a running→done step around it; returns fn's result. */
  step<T>(name: string, fn: () => Promise<T>, note?: string): Promise<T>;
  /** Records a step that was deliberately not run (e.g. reranking disabled). */
  skip(name: string, note?: string): void;
  /** Attaches a key/value fact to the operation's final report. */
  meta(key: string, value: string | number): void;
  /** Emits the closing event with the accumulated total time and meta. */
  finish(): void;
}

export type PerfEventType = "query" | "ingest";

const noopReporter: PerfReporter = {
  async step(_name, fn) {
    return fn();
  },
  skip() {},
  meta() {},
  finish() {},
};

export const createPerfReporter = (
  io: Server | null,
  socketId: string | undefined,
  type: PerfEventType,
  title: string,
): PerfReporter => {
  if (!io || !socketId) {
    return noopReporter;
  }

  const id = randomUUID();
  const room = socketId;
  const meta: Record<string, string> = {};
  let totalMs = 0;

  io.to(room).emit("activity:start", {
    id,
    type,
    title,
    ts: new Date().toISOString(),
  });

  return {
    async step(name, fn, note) {
      io.to(room).emit("activity:step", { id, name, state: "running", note });
      const start = Date.now();
      try {
        const result = await fn();
        const ms = Date.now() - start;
        totalMs += ms;
        io.to(room).emit("activity:step", { id, name, state: "done", ms, note });
        return result;
      } catch (err) {
        const ms = Date.now() - start;
        io.to(room).emit("activity:step", { id, name, state: "error", ms, note });
        throw err;
      }
    },
    skip(name, note) {
      io.to(room).emit("activity:step", { id, name, state: "skipped", note });
    },
    meta(key, value) {
      meta[key] = String(value);
    },
    finish() {
      io.to(room).emit("activity:end", { id, totalMs, meta });
    },
  };
};

export { noopReporter };
