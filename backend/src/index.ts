import express, { Request, Response } from "express";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { askQuestion } from "./controllers/askController";
import { uploadDocument } from "./controllers/uploadController";
import { deleteDocument } from "./controllers/deleteController";
import { getFiles } from "./controllers/fileController";
import { upload } from "./middleware/upload";
import { resetQdrantCollection } from "./config/vectorStore";
import { initDb, resetDb } from "./config/database";

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
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  
  try {
    await initDb();
    await resetDb();
    await resetQdrantCollection();
  } catch (err) {
    console.error("Failed to reset Qdrant collection on startup:", err);
  }
});
