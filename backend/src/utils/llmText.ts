/**
 * Normalizes a LangChain message `content` (which may be a string or an array
 * of content parts) into plain text. Shared by the services that read LLM
 * responses (qaService, summaryService).
 */
export const extractAnswerText = (content: unknown): string => {
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
