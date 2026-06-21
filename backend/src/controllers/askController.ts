import { Request, Response } from "express";
import { answerQuestion } from "../services/qaService";
import { ChatTurn } from "../prompts/queryRewritePrompt";

const DEFAULT_MATCH_LIMIT = 5;
const MAX_MATCH_LIMIT = 10;
/** Cap on prior turns fed into conversational query rewriting. */
const MAX_HISTORY_TURNS = 6;

/**
 * Validates and trims the client-supplied chat history into well-formed turns,
 * keeping only the most recent `MAX_HISTORY_TURNS` to bound prompt size.
 */
const normalizeHistory = (value: unknown): ChatTurn[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const turns: ChatTurn[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const { role, content } = item as { role?: unknown; content?: unknown };

    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim().length > 0
    ) {
      turns.push({ role, content: content.trim() });
    }
  }

  return turns.slice(-MAX_HISTORY_TURNS);
};

const normalizeLimit = (value: unknown): number => {
  const requestedLimit = Number(value ?? DEFAULT_MATCH_LIMIT);

  if (!Number.isFinite(requestedLimit)) {
    return DEFAULT_MATCH_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_MATCH_LIMIT);
};

export const askQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const question = String(req.body?.question ?? "").trim();
  const limit = normalizeLimit(req.body?.limit);
  const history = normalizeHistory(req.body?.history);

  if (!question) {
    res.status(400).json({ error: "Question is required" });
    return;
  }

  try {
    const result = await answerQuestion(question, limit, history);

    res.status(200).json({
      question,
      answer: result.answer,
      sources: result.sources,
      matches: result.matches,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to retrieve relevant documents";

    res.status(500).json({ error: message });
  }
};
