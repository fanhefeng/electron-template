import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Write JSON to disk atomically: write to a temp file in the same directory,
 * fsync it, then rename() over the target. rename() within one filesystem is
 * atomic, so readers never observe a truncated/partial file — on process crash
 * AND on power loss (the fsync before rename guarantees the data blocks are on
 * disk before the rename metadata can be). Without a directory fsync the rename
 * itself may be lost on power loss, but the target then still holds its
 * complete previous content — old or new, never partial.
 */
let tempCounter = 0;

/**
 * Renames an unreadable/corrupt file to `<file>.corrupt-<ts>` so the next
 * atomic save cannot overwrite the only copy of the user's data. Returns the
 * backup path, or null when the rename failed — the caller must log that
 * loudly (the recovery copy was NOT preserved). Shared by the settings and
 * theme persistence layers.
 */
export const backupCorruptFile = async (filePath: string): Promise<string | null> => {
  const backupPath = `${filePath}.corrupt-${Date.now().toString(36)}`;
  try {
    await fs.rename(filePath, backupPath);
    return backupPath;
  } catch {
    return null;
  }
};

export const writeJsonAtomic = async (filePath: string, data: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  // pid + monotonic counter guarantees a unique temp name even for writes that
  // land in the same millisecond (the counter disambiguates the timestamp).
  const tempPath = `${filePath}.${process.pid}.${(tempCounter++).toString(36)}.tmp`;
  try {
    const handle = await fs.open(tempPath, "w");
    try {
      await handle.writeFile(JSON.stringify(data, null, 2), "utf-8");
      // Flush data to disk BEFORE rename: otherwise power loss can persist the
      // rename metadata while the data blocks are still in the page cache,
      // leaving a zero-length/partial target file on reboot.
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
};
