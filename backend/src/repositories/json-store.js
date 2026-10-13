import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "../lib/errors.js";
const queues = new Map();
export class JsonStore {
  constructor(path) {
    this.path = resolve(path);
  }
  async read() {
    try {
      const rows = JSON.parse(await readFile(this.path, "utf8"));
      if (!Array.isArray(rows)) throw new Error("Expected a top-level array.");
      return rows;
    } catch (cause) {
      const error = new AppError(
        500,
        "STORAGE_ERROR",
        "Persistent storage could not be read. Restore the data file or check permissions.",
      );
      error.cause = cause;
      throw error;
    }
  }
  async update(modify) {
    const previous = queues.get(this.path) || Promise.resolve();
    const task = previous
      .catch(() => {})
      .then(async () => {
        const existing = await this.read(); // Never overwrite missing or corrupted files.
        const { rows, result } = await modify(existing);
        if (!Array.isArray(rows))
          throw new AppError(
            500,
            "STORAGE_ERROR",
            "Repository update must return an array.",
          );
        const temporary = join(dirname(this.path), `.${randomUUID()}.tmp`);
        try {
          await writeFile(temporary, JSON.stringify(rows, null, 2) + "\n", {
            flag: "wx",
          });
          await rename(temporary, this.path);
        } catch (cause) {
          await unlink(temporary).catch(() => {});
          const error = new AppError(
            500,
            "STORAGE_ERROR",
            "Persistent storage could not be updated. The previous dataset was preserved.",
          );
          error.cause = cause;
          throw error;
        }
        return result;
      });
    queues.set(this.path, task);
    try {
      return await task;
    } finally {
      if (queues.get(this.path) === task) queues.delete(this.path);
    }
  }
}
