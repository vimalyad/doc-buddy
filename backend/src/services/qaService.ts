import { getChatModel } from "../config/groq";
import { buildGroundedRagPrompt } from "../prompts/groundedRagPrompt";
import { buildQueryRewritePrompt } from "../prompts/queryRewritePrompt";
import { RetrievedChunk, searchSimilarChunks } from "./documentVectorStore";

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
 * Falls back to the original question if the rewrite fails or returns empty.
 */
const rewriteQuery = async (question: string): Promise<string> => {
  try {
    const prompt = buildQueryRewritePrompt(question);
    const response = await getChatModel().invoke(prompt);
    const rewritten = extractAnswerText(response.content).trim();
    return rewritten.length > 0 ? rewritten : question;
  } catch (err) {
    return question;
  }
};

export const answerQuestion = async (
  question: string,
  limit: number,
): Promise<QaResponse> => {
  const rewrittenQuery = await rewriteQuery(question);
  const matches = await searchSimilarChunks(rewrittenQuery, limit);
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
