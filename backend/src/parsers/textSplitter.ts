import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Parent-document retrieval splitting.
 *
 * Documents are split twice:
 *  - **Parent** chunks are large, context-rich windows that get fed to the LLM
 *    at answer time.
 *  - **Child** chunks are small, focused slices of each parent that get embedded
 *    and indexed. Smaller embedded units sharpen retrieval precision; returning
 *    the surrounding parent gives the LLM enough context to answer.
 *
 * Every child carries a reference to its parent's full text and a per-document
 * `parentIndex`, so retrieval can dedupe children back to distinct parents.
 */
const PARENT_CHUNK_SIZE = 2000;
const PARENT_CHUNK_OVERLAP = 200;
const CHILD_CHUNK_SIZE = 400;
const CHILD_CHUNK_OVERLAP = 80;

const parentSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: PARENT_CHUNK_SIZE,
  chunkOverlap: PARENT_CHUNK_OVERLAP,
});

const childSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHILD_CHUNK_SIZE,
  chunkOverlap: CHILD_CHUNK_OVERLAP,
});

export type ChildChunk = {
  /** Small slice that is embedded + indexed (drives retrieval precision). */
  childContent: string;
  /** Full parent window returned to the LLM (drives answer context). */
  parentContent: string;
  /** Per-document index of the parent this child belongs to. */
  parentIndex: number;
  source: string;
  metadata: Record<string, unknown>;
};

/**
 * Splits documents into parent windows, then each parent into child slices.
 * Returns a flat list of children, each pointing back at its parent text.
 */
export const splitIntoParentChildChunks = async (
  documents: Document[],
): Promise<ChildChunk[]> => {
  const parents = await parentSplitter.splitDocuments(documents);
  const children: ChildChunk[] = [];

  for (let parentIndex = 0; parentIndex < parents.length; parentIndex++) {
    const parent = parents[parentIndex];
    const source = String(parent.metadata.source ?? "unknown");
    const childTexts = await childSplitter.splitText(parent.pageContent);

    for (const childContent of childTexts) {
      children.push({
        childContent,
        parentContent: parent.pageContent,
        parentIndex,
        source,
        metadata: parent.metadata,
      });
    }
  }

  return children;
};

export const splitterConfig = {
  parentChunkSize: PARENT_CHUNK_SIZE,
  parentChunkOverlap: PARENT_CHUNK_OVERLAP,
  childChunkSize: CHILD_CHUNK_SIZE,
  childChunkOverlap: CHILD_CHUNK_OVERLAP,
} as const;
