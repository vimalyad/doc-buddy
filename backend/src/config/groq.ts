import { ChatGroq } from "@langchain/groq";

export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to initialize ChatGroq.`);
  }

  return value;
};

let chatModel: ChatGroq | null = null;

export const getChatModel = (): ChatGroq => {
  if (!chatModel) {
    chatModel = new ChatGroq({
      apiKey: getRequiredEnv("GROQ_API_KEY"),
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
      temperature: 0,
    });
  }

  return chatModel;
};
