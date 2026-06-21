import axios from "axios";
import { RetrievedChunk } from "./documentVectorStore";

/**
 * Cross-encoder reranking via the Cohere Rerank API.
 *
 * Hybrid search optimises for recall (fetch many plausible candidates); a
 * cross-encoder reranker optimises for precision by jointly scoring each
 * (query, chunk) pair — far more accurate than the bi-encoder cosine/BM25
 * scores used for retrieval. We over-fetch candidates, rerank, then keep the
 * best `topN`.
 *
 * Reranking is **optional**: if `COHERE_API_KEY` is unset (or the call fails),
 * we fall back to the original hybrid ordering so the app keeps working.
 */

const COHERE_RERANK_URL = "https://api.cohere.com/v2/rerank";
const DEFAULT_RERANK_MODEL = "rerank-v3.5";

/**
 * How many candidates to pull from hybrid search before reranking. A larger
 * pool gives the reranker more to work with; the LLM still only sees `topN`.
 */
export const RERANK_CANDIDATE_LIMIT =
  Number(process.env.RERANK_CANDIDATE_LIMIT) || 20;

const getApiKey = (): string | null =>
  process.env.COHERE_API_KEY?.trim() || null;

/** True when a Cohere key is configured, so callers can size their candidate pool. */
export const isRerankEnabled = (): boolean => getApiKey() !== null;

type CohereRerankResult = {
  index: number;
  relevance_score: number;
};

/**
 * Reranks `chunks` against `query` and returns the top `topN`, with each
 * chunk's `score` replaced by the cross-encoder relevance score.
 * Falls back to the first `topN` chunks (original order) if reranking is
 * disabled, returns nothing, or errors.
 */
export const rerankChunks = async (
  query: string,
  chunks: RetrievedChunk[],
  topN: number,
): Promise<RetrievedChunk[]> => {
  const apiKey = getApiKey();

  if (!apiKey || chunks.length === 0) {
    return chunks.slice(0, topN);
  }

  try {
    const model = process.env.RERANK_MODEL?.trim() || DEFAULT_RERANK_MODEL;

    const response = await axios.post(
      COHERE_RERANK_URL,
      {
        model,
        query,
        documents: chunks.map((chunk) => chunk.pageContent),
        top_n: Math.min(topN, chunks.length),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    const results = response.data?.results as CohereRerankResult[] | undefined;

    if (!Array.isArray(results)) {
      return chunks.slice(0, topN);
    }

    const reranked = results
      .map((result) => {
        const chunk = chunks[result.index];
        return chunk ? { ...chunk, score: result.relevance_score } : null;
      })
      .filter((chunk): chunk is RetrievedChunk => chunk !== null);

    return reranked.length > 0 ? reranked.slice(0, topN) : chunks.slice(0, topN);
  } catch (err) {
    // Graceful fallback: keep the original hybrid ordering.
    return chunks.slice(0, topN);
  }
};
