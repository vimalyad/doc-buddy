import http from "http";
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { Server as SocketIOServer } from "socket.io";
import { askQuestion } from "./controllers/askController";
import { uploadDocument } from "./controllers/uploadController";
import { deleteDocument } from "./controllers/deleteController";
import { getFiles } from "./controllers/fileController";
import { upload } from "./middleware/upload";
import { ensureQdrantCollection, resetQdrantCollection } from "./config/vectorStore";
import { initDb, resetDb } from "./config/database";
import { BOOT_ID, setIO } from "./realtime/io";

// Load environment variables from backend/.env or root .env
const envPath = fs.existsSync(".env")
  ? ".env"
  : path.resolve(process.cwd(), "../.env");
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("DocBuddy Backend is running");
});

app.get("/api/health", (req: Request, res: Response) => {
  // `bootId` lets the frontend detect a backend restart (new process → new id).
  res.status(200).json({
    status: "ok",
    bootId: BOOT_ID,
    timestamp: new Date().toISOString(),
  });
});

app.post(
  "/api/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Maximum size is 50MB." });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadDocument,
);

app.post("/api/ask", askQuestion);
app.post("/api/delete", deleteDocument);
app.get("/api/files", getFiles);

// Wrap Express in an HTTP server so Socket.IO can share the same port. The
// realtime channel streams per-step performance events to the activity panel.
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });
setIO(io);

httpServer.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

  // Data persists across restarts by default. Set RESET_ON_STARTUP=true to wipe
  // the file metadata and the Qdrant collection on boot (clean-slate mode).
  const resetOnStartup =
    (process.env.RESET_ON_STARTUP ?? "").trim().toLowerCase() === "true";

  try {
    await initDb();

    if (resetOnStartup) {
      await resetDb();
      await resetQdrantCollection();
      console.log("RESET_ON_STARTUP=true → wiped file DB and Qdrant collection");
    } else {
      await ensureQdrantCollection();
    }
  } catch (err) {
    console.error("Failed to initialize storage on startup:", err);
  }
});
