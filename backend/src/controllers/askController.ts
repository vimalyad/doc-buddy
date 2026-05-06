import { Request, Response } from "express";
import { answerQuestion } from "../services/qaService";

const DEFAULT_MATCH_LIMIT = 5;
const MAX_MATCH_LIMIT = 10;

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

  if (!question) {
    res.status(400).json({ error: "Question is required" });
    return;
  }

  try {
    const result = await answerQuestion(question, limit);

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
