/**
 * Builds the prompt used to summarize a document at ingestion time. The summary
 * is stored with the file and later given to the answer model as a "Document
 * overview", so it can answer summary/overview questions and gracefully redirect
 * when a question isn't covered by the retrieved context.
 */
export const buildSummaryPrompt = (source: string, text: string): string =>
  `Summarize the following document in 2-4 sentences. Describe what the document is about and its main topics so a reader can quickly judge whether it is relevant to a question. Be specific and factual; do not add information that isn't in the text.

Output ONLY the summary — no preamble, no headings, no bullet points.

Document name: ${source}

Content:
${text}

Summary:`;
