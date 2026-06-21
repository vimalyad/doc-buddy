import { Document } from "@langchain/core/documents";
import { getChatModel } from "../config/groq";
import { buildSummaryPrompt } from "../prompts/summaryPrompt";
import { extractAnswerText } from "../utils/llmText";

/**
 * How much document text to feed the summarizer. Kept modest to stay well within
 * the LLM's context window and the Groq free-tier token limits — the opening of
 * a document is usually enough to characterize it.
 */
const SUMMARY_CHAR_BUDGET = 8000;

/**
 * Generates a short natural-language summary of a parsed document via Groq.
 * Returns an empty string on any failure so ingestion is never blocked by a
 * summary hiccup (the document is still indexed and answerable).
 */
export const generateDocumentSummary = async (
  documents: Document[],
  source: string,
): Promise<string> => {
  try {
    const text = documents
      .map((doc) => doc.pageContent)
      .join("\n\n")
      .slice(0, SUMMARY_CHAR_BUDGET)
      .trim();

    if (!text) {
      return "";
    }

    const prompt = buildSummaryPrompt(source, text);
    const response = await getChatModel().invoke(prompt);
    return extractAnswerText(response.content).trim();
  } catch (err) {
    return "";
  }
};
