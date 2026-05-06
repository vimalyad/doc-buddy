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

export type RetrievedChunk = {
  id: string;
  score: number;
  pageContent: string;
  chunkIndex: number | null;
  source: string;
  metadata: unknown;
};

const buildPayload = (chunk: Document, chunkIndex: number) => ({
  pageContent: chunk.pageContent,
  chunkIndex,
  source: String(chunk.metadata.source ?? "unknown"),
  metadata: chunk.metadata,
});

const validateVectorSize = (vector: number[]): void => {
  if (vector.length !== QDRANT_VECTOR_SIZE) {
    throw new Error(
      `Expected embedding size ${QDRANT_VECTOR_SIZE}, received ${vector.length}.`,
    );
  }
};

const getPayloadField = (
  payload: Record<string, unknown> | null | undefined,
  key: string,
): unknown => payload?.[key];

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
    validateVectorSize(vector);

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

export const searchSimilarChunks = async (
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> => {
  await ensureQdrantCollection();

  const queryEmbedding = await getEmbeddings().embedQuery(query);
  validateVectorSize(queryEmbedding);

  const results = await getQdrantClient().search(QDRANT_COLLECTION_NAME, {
    vector: queryEmbedding,
    limit,
    with_payload: true,
    with_vector: false,
  });

  return results.map((result) => {
    const payload = result.payload ?? {};
    const chunkIndex = getPayloadField(payload, "chunkIndex");

    return {
      id: String(result.id),
      score: result.score,
      pageContent: String(getPayloadField(payload, "pageContent") ?? ""),
      chunkIndex: typeof chunkIndex === "number" ? chunkIndex : null,
      source: String(getPayloadField(payload, "source") ?? "unknown"),
      metadata: getPayloadField(payload, "metadata") ?? null,
    };
  });
};

export const deleteDocumentBySource = async (source: string): Promise<void> => {
  await ensureQdrantCollection();
  await getQdrantClient().delete(QDRANT_COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [
        {
          key: "source",
          match: {
            value: source,
          },
        },
      ],
    },
  });
};
