/**
 * Sparse (BM25-style) vector generation for hybrid retrieval.
 *
 * We send raw term frequencies as the sparse vector and let Qdrant apply the
 * IDF weighting server-side (the sparse vector is configured with
 * `modifier: "idf"` in `config/vectorStore.ts`). This gives TF-IDF/BM25-like
 * keyword scoring with **no external service and no extra API calls** — the
 * tokenisation runs in-process.
 *
 * Tokens are hashed to 32-bit unsigned indices (FNV-1a) so we never have to
 * build or persist a vocabulary. Hash collisions simply merge two terms into
 * one dimension, which is rare and harmless at this scale.
 */

export type SparseVector = {
  indices: number[];
  values: number[];
};

/** FNV-1a 32-bit hash → unsigned integer suitable for a Qdrant sparse index. */
const hashToken = (token: string): number => {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // coerce to unsigned 32-bit
};

/** Lowercase, strip punctuation, split on whitespace, drop 1-char tokens. */
const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);

/**
 * Builds a term-frequency sparse vector for the given text.
 * Returns an empty vector (`{ indices: [], values: [] }`) for empty input.
 */
export const buildSparseVector = (text: string): SparseVector => {
  const counts = new Map<number, number>();

  for (const token of tokenize(text)) {
    const index = hashToken(token);
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }

  const indices: number[] = [];
  const values: number[] = [];

  for (const [index, value] of counts) {
    indices.push(index);
    values.push(value);
  }

  return { indices, values };
};
