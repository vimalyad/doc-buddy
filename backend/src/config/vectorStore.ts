import { getQdrantClient } from "./qdrant";

export const QDRANT_COLLECTION_NAME =
  process.env.QDRANT_COLLECTION_NAME?.trim() || "docbuddy_documents";
export const QDRANT_VECTOR_SIZE = 384;
export const QDRANT_DISTANCE = "Cosine";

export const ensureQdrantCollection = async (): Promise<void> => {
  const client = getQdrantClient();
  const collection = await client.collectionExists(QDRANT_COLLECTION_NAME);

  if (collection.exists) {
    return;
  }

  await client.createCollection(QDRANT_COLLECTION_NAME, {
    vectors: {
      size: QDRANT_VECTOR_SIZE,
      distance: QDRANT_DISTANCE,
    },
  });
};
