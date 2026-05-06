import { Document } from "@langchain/core/documents";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

type SupportedLocalFileType = "pdf" | "txt" | "csv";

const getFileExtension = (fileName: string): SupportedLocalFileType | null => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "pdf" || extension === "txt" || extension === "csv") {
    return extension;
  }

  return null;
};

const buildMetadata = (
  file: Express.Multer.File,
  parser: string,
  metadata: Record<string, unknown> = {},
) => ({
  ...metadata,
  source: file.originalname,
  mimeType: file.mimetype,
  parser,
});

const parsePdf = async (file: Express.Multer.File): Promise<Document[]> => {
  const pdfBlob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || "application/pdf",
  });
  
  const loader = new PDFLoader(pdfBlob, { splitPages: true });
  const documents = await loader.load();

  return documents.map(
    (document) =>
      new Document({
        pageContent: document.pageContent,
        metadata: buildMetadata(file, "PDFLoader", document.metadata),
      }),
  );
};

const parseTxt = async (file: Express.Multer.File): Promise<Document[]> => [
  new Document({
    pageContent: file.buffer.toString("utf-8"),
    metadata: buildMetadata(file, "text"),
  }),
];

const parseCsv = async (file: Express.Multer.File): Promise<Document[]> => {
  const csvBlob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || "text/csv",
  });
  const documents = await new CSVLoader(csvBlob).load();

  return documents.map(
    (document) =>
      new Document({
        pageContent: document.pageContent,
        metadata: buildMetadata(file, "CSVLoader", document.metadata),
      }),
  );
};

export const parseLocalDocument = async (
  file: Express.Multer.File,
): Promise<Document[]> => {
  const fileType = getFileExtension(file.originalname);

  switch (fileType) {
    case "pdf":
      return parsePdf(file);
    case "txt":
      return parseTxt(file);
    case "csv":
      return parseCsv(file);
    default:
      throw new Error(
        "Unsupported file type. Only PDF, TXT, and CSV are allowed.",
      );
  }
};
