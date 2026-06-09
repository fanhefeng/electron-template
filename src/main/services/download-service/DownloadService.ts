import { session } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

// Electron's default save flow de-duplicates filenames; a custom setSavePath
// bypasses that, so re-downloading "report.pdf" would silently overwrite the
// previous file. Mirror the "name (1).ext" convention instead.
const resolveUniquePath = (targetPath: string): string => {
  if (!existsSync(targetPath)) return targetPath;
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);
  for (let i = 1; i < 1000; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  // Pathological fallback (1000 collisions): never hand back the existing
  // path — that would silently overwrite the very file this function exists
  // to protect. A timestamp suffix keeps the anti-overwrite contract.
  return path.join(dir, `${base} (${Date.now().toString(36)})${ext}`);
};

export class DownloadService {
  private isRegistered = false;
  private downloadDirectory?: string;
  private willDownloadHandler?: (event: Electron.Event, item: Electron.DownloadItem) => void;

  /**
   * Template extension point — deliberately NOT wired to any setting by
   * default (no caller in the shipped template, so downloads follow Electron's
   * default save flow). Call with a directory (e.g. from a future "download
   * location" setting) to activate the traversal-guarded custom save-path +
   * unique-naming flow in monitorDownloads().
   */
  configure(downloadDirectory?: string): void {
    logger.info(`[service:download] configure: downloadDirectory=${downloadDirectory ?? "(default)"}`);
    this.downloadDirectory = downloadDirectory;
  }

  monitorDownloads(): void {
    logger.info("[service:download] monitorDownloads called");
    if (this.isRegistered) {
      logger.debug("[service:download] already registered, skipping");
      return;
    }

    const defaultSession = session.defaultSession;
    if (!defaultSession) {
      logger.warn("[service:download] no default session available for download monitoring");
      return;
    }

    this.willDownloadHandler = (_event, item) => {
      if (this.downloadDirectory) {
        // getFilename() comes from the server's Content-Disposition header and
        // may contain path separators or be absolute ("../../tmp/evil") —
        // basename() confines the write to the configured directory (mirrors
        // ProtocolService's traversal guards). "." / ".." / empty would still
        // escape or break the join, so they fall back to a fixed name.
        const rawName = path.basename(item.getFilename());
        const safeFilename = rawName === "" || rawName === "." || rawName === ".." ? "download" : rawName;
        const targetPath = resolveUniquePath(resourceService.resolveDownloadPath(safeFilename, this.downloadDirectory));
        item.setSavePath(targetPath);
        logger.info("[service:download] download path overridden", targetPath);
      }

      item.on("done", (_doneEvent, state) => {
        if (state === "completed") {
          logger.info("[service:download] download completed", item.getFilename());
        } else {
          logger.warn("[service:download] download failed", { filename: item.getFilename(), state });
        }
      });
    };

    defaultSession.on("will-download", this.willDownloadHandler);
    this.isRegistered = true;
    logger.info("[service:download] download monitoring enabled");
  }

  cleanup(): void {
    if (!this.isRegistered || !this.willDownloadHandler) return;
    const defaultSession = session.defaultSession;
    if (defaultSession) {
      defaultSession.removeListener("will-download", this.willDownloadHandler);
    }
    this.willDownloadHandler = undefined;
    this.isRegistered = false;
    logger.info("[service:download] cleanup: listener removed");
  }
}

export const downloadService = new DownloadService();
