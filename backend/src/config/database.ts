import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "files.json");

export interface FileRecord {
  name: string;
  size: number;
  created_at: string;
}

const readDb = (): FileRecord[] => {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as FileRecord[];
  } catch {
    return [];
  }
};

const writeDb = (files: FileRecord[]): void => {
  fs.writeFileSync(DB_PATH, JSON.stringify(files, null, 2), "utf-8");
};

export const initDb = async (): Promise<void> => {
  if (!fs.existsSync(DB_PATH)) {
    writeDb([]);
  }
};

export const resetDb = async (): Promise<void> => {
  writeDb([]);
};

export const getAllFiles = (): FileRecord[] => {
  return readDb();
};

export const upsertFile = (name: string, size: number): void => {
  const files = readDb().filter((f) => f.name !== name);
  files.unshift({ name, size, created_at: new Date().toISOString() });
  writeDb(files);
};

export const deleteFile = (name: string): void => {
  const files = readDb().filter((f) => f.name !== name);
  writeDb(files);
};
