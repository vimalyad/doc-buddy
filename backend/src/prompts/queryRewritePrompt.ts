export const buildQueryRewritePrompt = (question: string): string =>
  `You are a search query optimizer for a RAG (Retrieval-Augmented Generation) system.

Your job is to rewrite the user's question into an optimal semantic search query that will retrieve the most relevant document chunks from a vector database.

Rules:
1. Output ONLY the rewritten search query — no explanation, no preamble, no punctuation at the end.
2. Make the query descriptive and noun-phrase heavy (e.g., "Namora food delivery platform microservices architecture").
3. Preserve all key terms, names, and concepts from the original question.
4. Remove filler words like "tell me", "what is", "explain", "describe", "can you".
5. If the question is already well-formed, return it as-is.

User question: ${question}

Rewritten search query:`;
