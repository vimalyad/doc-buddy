import { Request, Response } from "express";
import { getDb } from "../config/database";

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const files = await db.all("SELECT name, size FROM files ORDER BY created_at DESC");
    res.status(200).json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch files" });
  }
};
