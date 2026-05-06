import { Request, Response } from "express";
import { parseLocalDocument } from "../parsers/localParsers";
import { splitDocuments, splitterConfig } from "../parsers/textSplitter";
import { upsertDocumentChunks, deleteDocumentBySource } from "../services/documentVectorStore";
import { upsertFile } from "../config/database";

export const uploadDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const documents = await parseLocalDocument(req.file);
    const chunks = await splitDocuments(documents);

    await deleteDocumentBySource(req.file.originalname);
    const storedChunks = await upsertDocumentChunks(chunks);

    upsertFile(req.file.originalname, req.file.size);

    res.status(200).json({
      message: "File uploaded successfully",
      file: req.file.originalname,
      documents: documents.length,
      chunks: chunks.length,
      storedChunks: storedChunks.length,
      splitter: splitterConfig,
    });
  } catch (error) {
    console.log(error)
    const message =
      error instanceof Error ? error.message : "Failed to parse uploaded file";

    res.status(500).json({ error: message });
  }
};
