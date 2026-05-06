import multer from "multer";

// Use memory storage to keep files in memory as Buffer objects
const storage = multer.memoryStorage();

// File filter to only allow PDF, TXT, and CSV files
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.ms-excel", // Sometimes CSVs are sent with this mime type
    "application/csv",
  ];

  // Additional check for extension
  const extension = file.originalname.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["pdf", "txt", "csv"];

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    (extension && allowedExtensions.includes(extension))
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, TXT, and CSV are allowed."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});
