import { getQdrantClient } from "./qdrant";

export const QDRANT_COLLECTION_NAME =
  process.env.QDRANT_COLLECTION_NAME?.trim() || "docbuddy_documents";
export const QDRANT_VECTOR_SIZE = 384;
export const QDRANT_DISTANCE = "Cosine";

/**
 * Named vectors for hybrid retrieval. The collection stores a dense semantic
 * vector and a sparse BM25-style keyword vector per point; queries fuse the two
 * with Reciprocal Rank Fusion (see `documentVectorStore.searchSimilarChunks`).
 */
export const DENSE_VECTOR_NAME = "dense";
export const SPARSE_VECTOR_NAME = "bm25";

export const ensureQdrantCollection = async (): Promise<void> => {
  const client = getQdrantClient();
  const collection = await client.collectionExists(QDRANT_COLLECTION_NAME);

  if (collection.exists) {
    return;
  }

  await client.createCollection(QDRANT_COLLECTION_NAME, {
    vectors: {
      [DENSE_VECTOR_NAME]: {
        size: QDRANT_VECTOR_SIZE,
        distance: QDRANT_DISTANCE,
      },
    },
    sparse_vectors: {
      // `idf` lets Qdrant compute inverse-document-frequency weighting from
      // collection statistics, so we only send raw term frequencies.
      [SPARSE_VECTOR_NAME]: {
        modifier: "idf",
      },
    },
  });

  await client.createPayloadIndex(QDRANT_COLLECTION_NAME, {
    field_name: "source",
    field_schema: "keyword",
    wait: true,
  });
};

export const resetQdrantCollection = async (): Promise<void> => {
  const client = getQdrantClient();
  const collection = await client.collectionExists(QDRANT_COLLECTION_NAME);

  if (collection.exists) {
    await client.deleteCollection(QDRANT_COLLECTION_NAME);
    console.log(`🧹 Wiped out existing Qdrant collection: ${QDRANT_COLLECTION_NAME}`);
  }

  await ensureQdrantCollection();
  console.log(`✨ Created fresh Qdrant collection: ${QDRANT_COLLECTION_NAME}`);
};
