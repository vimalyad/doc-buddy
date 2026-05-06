import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { upload } from "./middleware/upload";
import { parseLocalDocument } from "./parsers/localParsers";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("DocBuddy Backend is running");
});

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post(
  "/api/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const documents = await parseLocalDocument(req.file);

      res.status(200).json({
        message: "File uploaded successfully",
        file: req.file.originalname,
        documents: documents.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse uploaded file";

      res.status(500).json({ error: message });
    }
  },
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
