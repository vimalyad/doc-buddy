export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const formatHistory = (history: ChatTurn[]): string =>
  history
    .map(
      (turn) =>
        `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`,
    )
    .join("\n");

/**
 * Builds the query-rewrite prompt.
 *
 * With no history it optimises a single question into a semantic search query.
 * With history it performs **conversational rewriting**: a follow-up like
 * "what about its limits?" is condensed into a standalone query by resolving
 * pronouns/references against the prior turns — otherwise retrieval has no idea
 * what "it" refers to.
 */
export const buildQueryRewritePrompt = (
  question: string,
  history: ChatTurn[] = [],
): string => {
  if (history.length === 0) {
    return `You are a search query optimizer for a RAG (Retrieval-Augmented Generation) system.

Your job is to rewrite the user's question into an optimal semantic search query that will retrieve the most relevant document chunks from a vector database.

Rules:
1. Output ONLY the rewritten search query — no explanation, no preamble, no punctuation at the end.
2. Make the query descriptive and noun-phrase heavy (e.g., "Namora food delivery platform microservices architecture").
3. Preserve all key terms, names, and concepts from the original question.
4. Remove filler words like "tell me", "what is", "explain", "describe", "can you".
5. If the question is already well-formed, return it as-is.

User question: ${question}

Rewritten search query:`;
  }

  return `You are a search query optimizer for a RAG (Retrieval-Augmented Generation) system.

Using the conversation history, rewrite the user's FOLLOW-UP question into a single standalone semantic search query that retrieves the most relevant document chunks from a vector database.

Rules:
1. Output ONLY the rewritten search query — no explanation, no preamble, no punctuation at the end.
2. Resolve every pronoun or reference ("it", "that", "those", "the previous one") into the explicit names/concepts they refer to, using the conversation history.
3. Make the query descriptive and noun-phrase heavy.
4. Preserve all key terms, names, and concepts.
5. Remove filler words like "tell me", "what is", "explain", "describe", "can you".
6. If the follow-up is already self-contained, just optimize it as a search query.

Conversation history:
${formatHistory(history)}

Follow-up question: ${question}

Rewritten search query:`;
};
