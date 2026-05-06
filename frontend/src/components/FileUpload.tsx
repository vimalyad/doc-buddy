import { useRef, useState, useEffect } from "react";
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

const FILE_STORAGE_KEY = "docbuddy_file";

// We can't persist the File object itself, so we store its display metadata
interface PersistedFile {
  name: string;
  size: number;
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // `file` holds the real File when freshly picked; `persistedFile` holds metadata across reloads
  const [file, setFile] = useState<File | null>(null);
  const [persistedFile, setPersistedFile] = useState<PersistedFile | null>(
    () => {
      try {
        const raw = localStorage.getItem(FILE_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as PersistedFile) : null;
      } catch {
        return null;
      }
    },
  );
  const [error, setError] = useState<string | null>(null);

  // Keep localStorage in sync whenever persistedFile changes
  useEffect(() => {
    if (persistedFile) {
      localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(persistedFile));
    } else {
      localStorage.removeItem(FILE_STORAGE_KEY);
    }
  }, [persistedFile]);

  // The displayed file entry (prefer real File, fall back to persisted metadata)
  const displayFile: PersistedFile | null = file
    ? { name: file.name, size: file.size }
    : persistedFile;

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

      // Success! The file is now embedded in Qdrant — persist metadata
      setPersistedFile({ name: nextFile.name, size: nextFile.size });
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

  const clearFile = async () => {
    const nameToDelete = file?.name ?? persistedFile?.name;
    if (nameToDelete) {
      try {
        await fetch("/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: nameToDelete }),
        });
      } catch (err) {
        console.error("Failed to sync deletion with vector store:", err);
      }
    }

    setFile(null);
    setPersistedFile(null);
    setError(null);
    setIsLoading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <section className="w-full">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Source Ingestion
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Documents</h2>
      </div>

      <div
        className={[
          "flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition",
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50",
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 shadow-inner">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-200">
          Add a source
        </p>
        <p className="mt-1 text-[11px] text-slate-500 leading-tight">
          Drop PDF, TXT, or CSV
        </p>

        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
        />

        <button
          className="mt-4 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          type="button"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
        >
          Select file
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {displayFile && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-slate-200">
                {displayFile.name}
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                {formatFileSize(displayFile.size)}
                {!file && persistedFile && (
                  <span className="ml-2 text-blue-500">
                    · Restored from session
                  </span>
                )}
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <button
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-800 hover:text-slate-300"
              type="button"
              onClick={clearFile}
              aria-label="Remove selected file"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-900/20 p-3 text-[11px] font-medium text-red-400">
            <XCircle className="h-4 w-4 flex-none" aria-hidden="true" />
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
