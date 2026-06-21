import { randomUUID } from "crypto";
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
import { ChildChunk } from "../parsers/textSplitter";

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

/**
 * Payload stored per child point. `pageContent` is the **parent** window (what
 * the LLM ultimately reads); `chunkIndex` is the parent index, used together
 * with `source` to dedupe children back to distinct parents at query time.
 */
const buildPayload = (child: ChildChunk) => ({
  pageContent: child.parentContent,
  chunkIndex: child.parentIndex,
  source: child.source,
  metadata: child.metadata,
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
  chunks: ChildChunk[],
): Promise<StoredChunk[]> => {
  if (chunks.length === 0) {
    return [];
  }

  await ensureQdrantCollection();

  const batches = chunkArray(chunks, EMBED_BATCH_SIZE);

  console.log(
    `[upsertDocumentChunks] ${chunks.length} child chunks → ${batches.length} batch(es), concurrency=${CONCURRENCY_LIMIT}`,
  );

  const tasks = batches.map(
    (batch) =>
      async (): Promise<StoredChunk[]> => {
        // ── Step 1: embed the child slices via HuggingFace ────────────────
        // Dense + sparse vectors are both built from the small child text so
        // retrieval stays precise; the parent window is stored in the payload.
        const batchEmbeddings = await getEmbeddings().embedDocuments(
          batch.map((child) => child.childContent),
        );

        // ── Step 2: build Qdrant point objects ───────────────────────────
        const points = batch.map((child, localIndex) => {
          const vector = batchEmbeddings[localIndex];
          validateVectorSize(vector);

          return {
            id: randomUUID(),
            vector: {
              [DENSE_VECTOR_NAME]: vector,
              [SPARSE_VECTOR_NAME]: buildSparseVector(child.childContent),
            },
            payload: buildPayload(child),
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

  // Over-fetch child matches: several children can map to the same parent, so we
  // pull more candidates than requested and dedupe down to distinct parents.
  const candidateLimit = limit * 4;
  const prefetchLimit = Math.max(PREFETCH_LIMIT, candidateLimit);

  // Hybrid retrieval: run a dense (semantic) and a sparse (BM25 keyword) arm in
  // parallel, then fuse their rankings with Reciprocal Rank Fusion.
  const response = await getQdrantClient().query(QDRANT_COLLECTION_NAME, {
    prefetch: [
      {
        query: queryEmbedding,
        using: DENSE_VECTOR_NAME,
        limit: prefetchLimit,
      },
      {
        query: sparseQuery,
        using: SPARSE_VECTOR_NAME,
        limit: prefetchLimit,
      },
    ],
    query: { fusion: "rrf" },
    limit: candidateLimit,
    with_payload: true,
    with_vector: false,
  });

  // Dedupe children back to distinct parents (highest-ranked child wins), then
  // return at most `limit` parent windows.
  const seenParents = new Set<string>();
  const parents: RetrievedChunk[] = [];

  for (const result of response.points) {
    const payload = result.payload ?? {};
    const chunkIndex = getPayloadField(payload, "chunkIndex");
    const source = String(getPayloadField(payload, "source") ?? "unknown");
    const parentKey = `${source}::${String(chunkIndex)}`;

    if (seenParents.has(parentKey)) {
      continue;
    }
    seenParents.add(parentKey);

    parents.push({
      id: String(result.id),
      score: result.score,
      pageContent: String(getPayloadField(payload, "pageContent") ?? ""),
      chunkIndex: typeof chunkIndex === "number" ? chunkIndex : null,
      source,
      metadata: getPayloadField(payload, "metadata") ?? null,
    });

    if (parents.length >= limit) {
      break;
    }
  }

  return parents;
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
