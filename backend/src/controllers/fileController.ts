import { Request, Response } from "express";
import { getAllFiles } from "../config/database";

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = getAllFiles();
    res.status(200).json(files);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch files";
    res.status(500).json({ error: message });
  }
};
