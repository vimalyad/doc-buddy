import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export const splitDocuments = async (
  documents: Document[],
): Promise<Document[]> => textSplitter.splitDocuments(documents);

export const splitterConfig = {
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
} as const;
