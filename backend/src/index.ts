import express, { Request, Response } from "express";
import dotenv from "dotenv";
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

app.post(
  "/api/upload",
  upload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    res
      .status(200)
      .json({
        message: "File uploaded successfully",
        file: req.file.originalname,
      });
  },
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
