import { io, type Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "";

/**
 * Single shared Socket.IO connection to the backend. Used to receive live
 * per-step performance events for the session activity panel. The client's
 * `socket.id` is sent with each /api/ask and /api/upload request so the backend
 * knows which client to stream that operation's events back to.
 */
export const socket: Socket = io(API_URL, {
  transports: ["websocket", "polling"],
});
