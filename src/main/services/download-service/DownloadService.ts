import { session } from "electron";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

export class DownloadService {
  private isRegistered = false;
  private downloadDirectory?: string;

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

    defaultSession.on("will-download", (_event, item) => {
      if (this.downloadDirectory) {
        const targetPath = resourceService.resolveDownloadPath(item.getFilename(), this.downloadDirectory);
        item.setSavePath(targetPath);
        logger.info("Download path overridden", targetPath);
      }

      item.on("done", (_event, state) => {
        if (state === "completed") {
          logger.info("Download completed", item.getFilename());
        } else {
          logger.warn("Download failed", { filename: item.getFilename(), state });
        }
      });
    });

    this.isRegistered = true;
    logger.info("Download monitoring enabled");
  }
}

export const downloadService = new DownloadService();
