import { session } from "electron";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

export class DownloadService {
  private isRegistered = false;
  private downloadDirectory?: string;
  private willDownloadHandler?: (event: Electron.Event, item: Electron.DownloadItem) => void;

  configure(downloadDirectory?: string): void {
    this.downloadDirectory = downloadDirectory;
  }

  monitorDownloads(): void {
    if (this.isRegistered) {
      return;
    }

    const defaultSession = session.defaultSession;
    if (!defaultSession) {
      logger.warn("No default session available for download monitoring");
      return;
    }

    this.willDownloadHandler = (_event, item) => {
      if (this.downloadDirectory) {
        const targetPath = resourceService.resolveDownloadPath(item.getFilename(), this.downloadDirectory);
        item.setSavePath(targetPath);
        logger.info("Download path overridden", targetPath);
      }

      item.on("done", (_doneEvent, state) => {
        if (state === "completed") {
          logger.info("Download completed", item.getFilename());
        } else {
          logger.warn("Download failed", { filename: item.getFilename(), state });
        }
      });
    };

    defaultSession.on("will-download", this.willDownloadHandler);
    this.isRegistered = true;
    logger.info("Download monitoring enabled");
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
