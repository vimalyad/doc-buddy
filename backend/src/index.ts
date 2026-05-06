import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { askQuestion } from "./controllers/askController";
import { uploadDocument } from "./controllers/uploadController";
import { upload } from "./middleware/upload";

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

app.post("/api/upload", upload.single("file"), uploadDocument);

app.post("/api/ask", askQuestion);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
