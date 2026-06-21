import { getChatModel } from "../config/groq";
import { buildGroundedRagPrompt } from "../prompts/groundedRagPrompt";
import { buildQueryRewritePrompt, ChatTurn } from "../prompts/queryRewritePrompt";
import { buildRelevanceGradePrompt } from "../prompts/relevanceGradePrompt";
import { buildCorrectiveRewritePrompt } from "../prompts/correctiveRewritePrompt";
import { RetrievedChunk, searchSimilarChunks } from "./documentVectorStore";
import {
  isRerankEnabled,
  rerankChunks,
  RERANK_CANDIDATE_LIMIT,
} from "./rerankService";

type SourceMetadata = {
  id: string;
  score: number;
  source: string;
  chunkIndex: number | null;
  metadata: unknown;
};

type QaResponse = {
  answer: string;
  sources: SourceMetadata[];
  matches: RetrievedChunk[];
  rewrittenQuery?: string;
};

const formatContext = (matches: RetrievedChunk[]): string =>
  matches
    .map(
      (match, index) => `[Source ${index + 1}]
File: ${match.source}
Chunk: ${match.chunkIndex ?? "unknown"}
Score: ${match.score}
Content:
${match.pageContent}`,
    )
    .join("\n\n");

const extractAnswerText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
};

const buildSources = (matches: RetrievedChunk[]): SourceMetadata[] =>
  matches.map((match) => ({
    id: match.id,
    score: match.score,
    source: match.source,
    chunkIndex: match.chunkIndex,
    metadata: match.metadata,
  }));

/**
 * Rewrites the user's raw question into a retrieval-optimised search query.
 * When `history` is supplied, the rewrite is conversational — follow-up
 * questions are condensed into a standalone query using the prior turns.
 * Falls back to the original question if the rewrite fails or returns empty.
 */
const rewriteQuery = async (
  question: string,
  history: ChatTurn[],
): Promise<string> => {
  try {
    const prompt = buildQueryRewritePrompt(question, history);
    const response = await getChatModel().invoke(prompt);
    const rewritten = extractAnswerText(response.content).trim();
    return rewritten.length > 0 ? rewritten : question;
  } catch (err) {
    return question;
  }
};

/**
 * Retrieves with hybrid search and (when enabled) reranks down to `limit`.
 * When reranking is enabled we over-fetch a larger candidate pool and let the
 * cross-encoder pick the best `limit`; the reranker scores against the original
 * question (more natural for a cross-encoder than the rewritten search query).
 */
const retrieveAndRerank = async (
  searchQuery: string,
  question: string,
  limit: number,
): Promise<RetrievedChunk[]> => {
  const candidateLimit = isRerankEnabled()
    ? Math.max(RERANK_CANDIDATE_LIMIT, limit)
    : limit;
  const candidates = await searchSimilarChunks(searchQuery, candidateLimit);
  return rerankChunks(question, candidates, limit);
};

type RelevanceGrade = "correct" | "ambiguous" | "incorrect";

/** Corrective RAG runs by default (extra Groq calls per query). Disable with ENABLE_CRAG=false. */
const isCragEnabled = (): boolean =>
  (process.env.ENABLE_CRAG ?? "").trim().toLowerCase() !== "false";

/** Parses the grader's JSON reply defensively; any malformed output → "correct" (no-op). */
const parseGrade = (
  text: string,
  count: number,
): { grade: RelevanceGrade; relevantIndices: number[] } => {
  const fallback = { grade: "correct" as RelevanceGrade, relevantIndices: [] };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      grade?: unknown;
      relevant?: unknown;
    };

    if (
      parsed.grade !== "correct" &&
      parsed.grade !== "ambiguous" &&
      parsed.grade !== "incorrect"
    ) {
      return fallback;
    }

    const relevantIndices = Array.isArray(parsed.relevant)
      ? parsed.relevant
          .map((value) => Number(value))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= count)
      : [];

    return { grade: parsed.grade, relevantIndices };
  } catch (err) {
    return fallback;
  }
};

/**
 * CRAG relevance grader: a single Groq call judging whether `matches` can answer
 * the question. Fails open (returns "correct") so a grading hiccup never blocks
 * an answer.
 */
const gradeRelevance = async (
  question: string,
  matches: RetrievedChunk[],
): Promise<{ grade: RelevanceGrade; relevantIndices: number[] }> => {
  try {
    const prompt = buildRelevanceGradePrompt(question, formatContext(matches));
    const response = await getChatModel().invoke(prompt);
    return parseGrade(extractAnswerText(response.content), matches.length);
  } catch (err) {
    return { grade: "correct", relevantIndices: [] };
  }
};

/** Builds an alternative search query after a failed retrieval; falls back to the original question. */
const rewriteCorrectiveQuery = async (
  question: string,
  failedQuery: string,
): Promise<string> => {
  try {
    const prompt = buildCorrectiveRewritePrompt(question, failedQuery);
    const response = await getChatModel().invoke(prompt);
    const rewritten = extractAnswerText(response.content).trim();
    return rewritten.length > 0 ? rewritten : question;
  } catch (err) {
    return question;
  }
};

/**
 * Corrective RAG: grade the retrieved matches, then
 *  - "correct"   → use them as-is;
 *  - "ambiguous" → keep only the sources graded relevant;
 *  - "incorrect" → run ONE bounded corrective retry with an alternative query.
 * Always degrades to the original matches if a corrective step yields nothing.
 */
const applyCorrectiveRetrieval = async (
  question: string,
  failedQuery: string,
  matches: RetrievedChunk[],
  limit: number,
): Promise<RetrievedChunk[]> => {
  const { grade, relevantIndices } = await gradeRelevance(question, matches);

  if (grade === "correct") {
    return matches;
  }

  if (grade === "ambiguous") {
    const filtered = relevantIndices
      .map((index) => matches[index - 1])
      .filter((match): match is RetrievedChunk => Boolean(match));
    return filtered.length > 0 ? filtered : matches;
  }

  // grade === "incorrect" → one bounded corrective retry.
  const correctiveQuery = await rewriteCorrectiveQuery(question, failedQuery);
  const retried = await retrieveAndRerank(correctiveQuery, question, limit);
  return retried.length > 0 ? retried : matches;
};

export const answerQuestion = async (
  question: string,
  limit: number,
  history: ChatTurn[] = [],
): Promise<QaResponse> => {
  const rewrittenQuery = await rewriteQuery(question, history);

  let matches = await retrieveAndRerank(rewrittenQuery, question, limit);

  // Corrective RAG (opt-in): grade retrieval and self-correct before answering.
  if (isCragEnabled() && matches.length > 0) {
    matches = await applyCorrectiveRetrieval(
      question,
      rewrittenQuery,
      matches,
      limit,
    );
  }

  const context = formatContext(matches);
  const prompt = buildGroundedRagPrompt(question, context);
  const response = await getChatModel().invoke(prompt);
  const answer = extractAnswerText(response.content);

  return {
    answer,
    sources: buildSources(matches),
    matches,
    rewrittenQuery,
  };
};
