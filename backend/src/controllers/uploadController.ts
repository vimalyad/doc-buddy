import { Request, Response } from "express";
import { parseLocalDocument } from "../parsers/localParsers";
import { splitIntoParentChildChunks, splitterConfig } from "../parsers/textSplitter";
import { upsertDocumentChunks, deleteDocumentBySource } from "../services/documentVectorStore";
import { upsertFile } from "../config/database";
import { createPerfReporter } from "../services/perfReporter";
import { getIO } from "../realtime/io";

export const uploadDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const file = req.file;
  // Multer puts text form fields on req.body, so the socketId arrives here.
  const socketId =
    typeof req.body?.socketId === "string" ? req.body.socketId : undefined;
  const reporter = createPerfReporter(
    getIO(),
    socketId,
    "ingest",
    file.originalname,
  );

  try {
    const documents = await reporter.step("Parse document", () =>
      parseLocalDocument(file),
    );

    const childChunks = await reporter.step("Parent / child split", async () =>
      splitIntoParentChildChunks(documents),
    );

    await reporter.step("Clear previous version", () =>
      deleteDocumentBySource(file.originalname),
    );

    const storedChunks = await reporter.step(
      "Embed & index",
      () => upsertDocumentChunks(childChunks),
      "HF + Qdrant",
    );

    await reporter.step("Save metadata", async () =>
      upsertFile(file.originalname, file.size),
    );

    const parentCount = new Set(childChunks.map((c) => c.parentIndex)).size;
    reporter.meta("Pages", documents.length);
    reporter.meta("Parents", parentCount);
    reporter.meta("Chunks", childChunks.length);
    reporter.meta("Stored", storedChunks.length);

    res.status(200).json({
      message: "File uploaded successfully",
      file: file.originalname,
      documents: documents.length,
      chunks: childChunks.length,
      storedChunks: storedChunks.length,
      splitter: splitterConfig,
    });
  } catch (error) {
    console.log(error);
    const message =
      error instanceof Error ? error.message : "Failed to parse uploaded file";

    res.status(500).json({ error: message });
  } finally {
    reporter.finish();
  }
};
