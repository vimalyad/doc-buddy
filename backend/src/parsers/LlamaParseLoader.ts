import axios from "axios";
import FormData from "form-data";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

export class LlamaParseLoader extends BaseDocumentLoader {
  constructor(
    private fileBuffer: Buffer,
    private fileName: string,
  ) {
    super();
  }

  public async load(): Promise<Document[]> {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error("LLAMA_CLOUD_API_KEY is not defined in the environment.");
    }

    const formData = new FormData();
    formData.append("file", this.fileBuffer, { filename: this.fileName });

    try {
      // 1. Upload the file
      const uploadResponse = await axios.post(
        "https://api.cloud.llamaindex.ai/api/parsing/upload",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      const jobId = uploadResponse.data.id;

      // 2. Poll for job completion
      let status = "PENDING";
      while (status === "PENDING") {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2 seconds

        const statusResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );

        status = statusResponse.data.status;
        if (status === "ERROR") {
          throw new Error("LlamaParse job failed during processing.");
        }
      }

      // 3. Fetch the parsed markdown result
      const resultResponse = await axios.get(
        `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );

      const markdownContent = resultResponse.data.markdown;

      return [
        new Document({
          pageContent: markdownContent,
          metadata: { source: this.fileName, parser: "LlamaParse" },
        }),
      ];
    } catch (error: any) {
      console.error(
        "LlamaParseLoader Error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
