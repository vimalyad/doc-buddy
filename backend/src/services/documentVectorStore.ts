import { randomUUID } from "crypto";
import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "../config/embeddings";
import { getQdrantClient } from "../config/qdrant";
import {
  ensureQdrantCollection,
  QDRANT_COLLECTION_NAME,
  QDRANT_VECTOR_SIZE,
  DENSE_VECTOR_NAME,
  SPARSE_VECTOR_NAME,
} from "../config/vectorStore";
import { chunkArray, runWithConcurrency } from "../utils/concurrency";
import { EMBED_BATCH_SIZE, CONCURRENCY_LIMIT } from "../config/ingestion";
import { buildSparseVector } from "../utils/sparse";

/**
 * Number of candidates each retrieval arm (dense + sparse) fetches before
 * Reciprocal Rank Fusion merges them down to the requested `limit`.
 */
const PREFETCH_LIMIT = 20;

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

  const batches = chunkArray(chunks, EMBED_BATCH_SIZE);

  console.log(
    `[upsertDocumentChunks] ${chunks.length} chunks → ${batches.length} batch(es), concurrency=${CONCURRENCY_LIMIT}`,
  );

  const tasks = batches.map(
    (batch, batchIndex) =>
      async (): Promise<StoredChunk[]> => {
        // ── Step 1: embed this batch via HuggingFace ──────────────────────
        const batchEmbeddings = await getEmbeddings().embedDocuments(
          batch.map((chunk) => chunk.pageContent),
        );

        // ── Step 2: build Qdrant point objects ───────────────────────────
        const points = batch.map((chunk, localIndex) => {
          const globalIndex = batchIndex * EMBED_BATCH_SIZE + localIndex;
          const vector = batchEmbeddings[localIndex];
          validateVectorSize(vector);

          return {
            id: randomUUID(),
            vector: {
              [DENSE_VECTOR_NAME]: vector,
              [SPARSE_VECTOR_NAME]: buildSparseVector(chunk.pageContent),
            },
            payload: buildPayload(chunk, globalIndex),
          };
        });

        // ── Step 3: upsert this batch to Qdrant ──────────────────────────
        await getQdrantClient().upsert(QDRANT_COLLECTION_NAME, {
          wait: true,
          points,
        });

        return points.map((point) => ({
          id: String(point.id),
          chunkIndex: Number(point.payload.chunkIndex),
          source: String(point.payload.source),
        }));
      },
  );

  const batchResults = await runWithConcurrency(CONCURRENCY_LIMIT, tasks);
  return batchResults.flat();
};

export const searchSimilarChunks = async (
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> => {
  await ensureQdrantCollection();

  const queryEmbedding = await getEmbeddings().embedQuery(query);
  validateVectorSize(queryEmbedding);

  const sparseQuery = buildSparseVector(query);

  // Hybrid retrieval: run a dense (semantic) and a sparse (BM25 keyword) arm in
  // parallel, then fuse their rankings with Reciprocal Rank Fusion.
  const response = await getQdrantClient().query(QDRANT_COLLECTION_NAME, {
    prefetch: [
      {
        query: queryEmbedding,
        using: DENSE_VECTOR_NAME,
        limit: PREFETCH_LIMIT,
      },
      {
        query: sparseQuery,
        using: SPARSE_VECTOR_NAME,
        limit: PREFETCH_LIMIT,
      },
    ],
    query: { fusion: "rrf" },
    limit,
    with_payload: true,
    with_vector: false,
  });

  return response.points.map((result) => {
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
