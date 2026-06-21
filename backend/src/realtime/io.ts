import { randomUUID } from "crypto";
import { Server } from "socket.io";

/**
 * Unique id for this server process, generated once at startup. The frontend
 * compares it across loads — if it changes, the backend has restarted (a new
 * session), so the chat is cleared and a "Backend restarted" toast is shown.
 */
export const BOOT_ID = randomUUID();

let io: Server | null = null;

/** Stores the Socket.IO server instance once it is created in `index.ts`. */
export const setIO = (server: Server): void => {
  io = server;
};

/** Returns the Socket.IO server, or null if realtime isn't initialized yet. */
export const getIO = (): Server | null => io;
