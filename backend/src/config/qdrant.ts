import { QdrantClient } from "@qdrant/js-client-rest";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to initialize the Qdrant client.`);
  }

  return value;
};

let qdrantClient: QdrantClient | null = null;

export const getQdrantClient = (): QdrantClient => {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: getRequiredEnv("QDRANT_URL"),
      apiKey: getRequiredEnv("QDRANT_API_KEY"),
    });
  }

  return qdrantClient;
};
