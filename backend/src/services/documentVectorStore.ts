import { randomUUID } from "crypto";
import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "../config/embeddings";
import { getQdrantClient } from "../config/qdrant";
import {
  ensureQdrantCollection,
  QDRANT_COLLECTION_NAME,
  QDRANT_VECTOR_SIZE,
} from "../config/vectorStore";

type StoredChunk = {
  id: string;
  chunkIndex: number;
  source: string;
};

const buildPayload = (chunk: Document, chunkIndex: number) => ({
  pageContent: chunk.pageContent,
  chunkIndex,
  source: String(chunk.metadata.source ?? "unknown"),
  metadata: chunk.metadata,
});

export const upsertDocumentChunks = async (
  chunks: Document[],
): Promise<StoredChunk[]> => {
  if (chunks.length === 0) {
    return [];
  }

  await ensureQdrantCollection();

  const embeddings = await getEmbeddings().embedDocuments(
    chunks.map((chunk) => chunk.pageContent),
  );

  const points = chunks.map((chunk, index) => {
    const vector = embeddings[index];

    if (vector.length !== QDRANT_VECTOR_SIZE) {
      throw new Error(
        `Expected embedding size ${QDRANT_VECTOR_SIZE}, received ${vector.length}.`,
      );
    }

    return {
      id: randomUUID(),
      vector,
      payload: buildPayload(chunk, index),
    };
  });

  await getQdrantClient().upsert(QDRANT_COLLECTION_NAME, {
    wait: true,
    points,
  });

  return points.map((point) => ({
    id: String(point.id),
    chunkIndex: Number(point.payload.chunkIndex),
    source: String(point.payload.source),
  }));
};
