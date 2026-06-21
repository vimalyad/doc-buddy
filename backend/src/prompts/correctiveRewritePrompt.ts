/**
 * Corrective query-rewrite prompt for CRAG.
 *
 * Used only when the relevance grader judges the first retrieval "incorrect".
 * It asks the LLM for a *different* phrasing of the same question — broader
 * terms, synonyms, alternative wording — to give re-retrieval a better shot.
 */
export const buildCorrectiveRewritePrompt = (
  question: string,
  failedQuery: string,
): string =>
  `You are a search query optimizer for a RAG (Retrieval-Augmented Generation) system.

The previous search query failed to retrieve relevant documents. Produce a DIFFERENT, alternative semantic search query for the same underlying question — try broader terms, synonyms, or a different phrasing.

Rules:
1. Output ONLY the rewritten search query — no explanation, no preamble, no punctuation at the end.
2. Do NOT simply repeat the previous query; meaningfully vary the terms.
3. Stay faithful to the user's original question.

Original question: ${question}
Previous (failed) query: ${failedQuery}

Alternative search query:`;
