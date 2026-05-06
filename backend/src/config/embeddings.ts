import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

export const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required to initialize Hugging Face embeddings.`,
    );
  }

  return value;
};

let embeddings: HuggingFaceInferenceEmbeddings | null = null;

export const getEmbeddings = (): HuggingFaceInferenceEmbeddings => {
  if (!embeddings) {
    embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: getRequiredEnv("HUGGINGFACEHUB_API_KEY"),
      model: EMBEDDING_MODEL,
    });
  }

  return embeddings;
};
