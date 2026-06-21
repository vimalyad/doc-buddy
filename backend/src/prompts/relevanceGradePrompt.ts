/**
 * Relevance-grading prompt for Corrective RAG (CRAG).
 *
 * A single LLM call grades whether the retrieved sources actually contain the
 * information needed to answer the question, so the pipeline can take corrective
 * action (filter, or re-retrieve) before generating an answer.
 *
 * The model must reply with ONLY a JSON object so the result is machine-parsable.
 */
export const buildRelevanceGradePrompt = (
  question: string,
  context: string,
): string =>
  `You are a retrieval-quality grader for a RAG (Retrieval-Augmented Generation) system.

Assess whether the retrieved sources contain the information needed to answer the user's question.

Respond with ONLY a JSON object — no markdown, no code fences, no prose — in this exact shape:
{"grade": "correct" | "ambiguous" | "incorrect", "relevant": [<1-based source numbers that are relevant>]}

Definitions:
- "correct": the sources clearly contain enough relevant information to answer the question.
- "ambiguous": only some sources are relevant while others are off-topic — list the relevant source numbers in "relevant".
- "incorrect": none of the sources are relevant to the question (use an empty "relevant" array).

Question: ${question}

Retrieved sources:
${context}

JSON:`;
