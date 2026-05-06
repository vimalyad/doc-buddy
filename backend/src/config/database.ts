import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export const initDb = async () => {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.resolve(process.cwd(), "database.sqlite"),
    driver: sqlite3.Database,
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return dbInstance;
};

export const getDb = async () => {
  if (!dbInstance) {
    return await initDb();
  }
  return dbInstance;
};

export const resetDb = async () => {
  const db = await getDb();
  await db.exec("DELETE FROM files");
};
