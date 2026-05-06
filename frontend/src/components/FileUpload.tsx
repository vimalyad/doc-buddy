import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react";

const ACCEPTED_TYPES = ["application/pdf", "text/plain", "text/csv"];
const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".csv"];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isAcceptedFile = (file: File): boolean => {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  return (
    ACCEPTED_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.includes(extension)
  );
};

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectFile = async (nextFile: File) => {
    if (!isAcceptedFile(nextFile)) {
      setFile(null);
      setError("Only PDF, TXT, and CSV files are supported.");
      return;
    }

    setError(null);
    setFile(nextFile);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", nextFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            "Ingestion failed. Please check your backend logs.",
        );
      }

      // Success! The file is now embedded in Qdrant
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during upload.";
      setError(errorMessage);
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const nextFile = event.dataTransfer.files[0];
    if (nextFile) {
      selectFile(nextFile);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) {
      selectFile(nextFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setIsLoading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <section className="w-full max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Source ingestion
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Upload documents
        </h1>
      </div>

      <div
        className={[
          "flex min-h-72 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white px-6 py-10 text-center transition",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-slate-400",
        ].join(" ")}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <p className="mt-5 text-lg font-medium text-slate-950">
          Drop a PDF, TXT, or CSV file
        </p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Documents are prepared in the browser before ingestion.
        </p>

        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
        />

        <button
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          Select file
        </button>
      </div>

      <div className="mt-4 min-h-20">
        {file && (
          <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <FileText className="h-6 w-6 flex-none text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-950">
                {file.name}
              </p>
              <p className="text-sm text-slate-500">
                {formatFileSize(file.size)}
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            <button
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              type="button"
              onClick={clearFile}
              aria-label="Remove selected file"
            >
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle className="h-5 w-5 flex-none" aria-hidden="true" />
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
