import { Request, Response } from "express";
import { deleteDocumentBySource } from "../services/documentVectorStore";
import { deleteFile } from "../config/database";

export const deleteDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { source } = req.body;

  if (!source) {
    res.status(400).json({ error: "Source filename is required" });
    return;
  }

  try {
    await deleteDocumentBySource(source);

    deleteFile(source);

    res.status(200).json({ message: `Successfully deleted ${source}` });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    res.status(500).json({ error: message });
  }
};
