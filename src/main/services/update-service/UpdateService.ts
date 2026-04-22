import type { BrowserWindow } from "electron";
import { dialog, app } from "electron";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo } from "electron-updater";
import { logger } from "../logger-service";
import { i18nService } from "../i18n-service";
import type { SystemService } from "../system-service";
import * as path from "path";

const toErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export class UpdateService {
  private window?: BrowserWindow;
  private systemService?: SystemService;
  private listenersRegistered = false;
  private isDownloading = false;
  private isDownloaded = false;

  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = logger;

    // 开发环境配置
    const isDev = !app.isPackaged;
    if (isDev) {
      // 使用开发环境更新配置文件
      const devUpdateConfig = path.join(process.cwd(), "dev-app-update.yml");
      autoUpdater.updateConfigPath = devUpdateConfig;
      autoUpdater.forceDevUpdateConfig = true;

      logger.info(`Development mode: using update config from ${devUpdateConfig}`);
    }

    // allowDowngrade 允许版本降级（用于测试）
    Object.defineProperty(autoUpdater, "allowDowngrade", { value: isDev, writable: true });
  }

  private setWindow(browserWindow: BrowserWindow): void {
    if (this.window === browserWindow) return;
    this.window = browserWindow;
    browserWindow.once("closed", () => {
      if (this.window === browserWindow) {
        this.window = undefined;
      }
    });
  }

  checkForUpdates(browserWindow?: BrowserWindow): void {
    if (browserWindow) {
      this.setWindow(browserWindow);
    }

    if (this.isDownloading) {
      logger.info("Update download already in progress, skipping check");
      return;
    }

    this.isDownloaded = false;

    logger.info("Checking for updates");
    autoUpdater.checkForUpdates().catch((error) => {
      logger.error("Failed to check for updates", error);
      this.window?.webContents.send("update-error", toErrorMessage(error));
      if (this.window && this.window === browserWindow) {
        dialog.showErrorBox(i18nService.t("notification.update.error.title"), toErrorMessage(error));
      }
    });
    logger.info("Update check initiated");
  }

  applyUpdate(): void {
    if (!this.isDownloaded) {
      logger.warn("Apply update requested before package downloaded");

      if (!this.isDownloading) {
        this.downloadUpdate();
      }

      this.window?.webContents.send("update-download-pending");
      return;
    }

    logger.info("Applying update");
    autoUpdater.quitAndInstall();
  }

  registerListeners(browserWindow?: BrowserWindow, systemService?: SystemService): void {
    if (browserWindow) {
      this.setWindow(browserWindow);
    }

    if (systemService) {
      this.systemService = systemService;
    }

    if (this.listenersRegistered) {
      return;
    }
    this.listenersRegistered = true;

    autoUpdater.on("update-available", this.handleUpdateAvailable);
    autoUpdater.on("update-not-available", this.handleUpdateNotAvailable);
    autoUpdater.on("error", this.handleError);
    autoUpdater.on("download-progress", this.handleDownloadProgress);
    autoUpdater.on("update-downloaded", this.handleUpdateDownloaded);
  }

  private handleUpdateAvailable = (): void => {
    logger.info("Update available");
    this.window?.webContents.send("update-available");
    this.systemService?.showNotification(
      i18nService.t("notification.update.available.title"),
      i18nService.t("notification.update.available.body")
    );
    if (!this.isDownloading && !this.isDownloaded) {
      this.downloadUpdate();
    }
  };

  private handleUpdateNotAvailable = (): void => {
    logger.info("No updates available");
    this.isDownloading = false;
    this.isDownloaded = false;
    this.window?.webContents.send("update-not-available");
    this.systemService?.showNotification(
      i18nService.t("notification.update.notAvailable.title"),
      i18nService.t("notification.update.notAvailable.body")
    );
  };

  private handleError = (error: unknown): void => {
    logger.error("Update error", error);
    this.isDownloading = false;
    this.window?.webContents.send("update-error", toErrorMessage(error));
    this.systemService?.showNotification(
      i18nService.t("notification.update.error.title"),
      i18nService.t("notification.update.error.body")
    );
  };

  private handleDownloadProgress = (progress: ProgressInfo): void => {
    logger.info("Update download progress", progress);
    this.window?.webContents.send("update-download-progress", progress);
  };

  private handleUpdateDownloaded = (): void => {
    logger.info("Update downloaded");
    this.isDownloading = false;
    this.isDownloaded = true;
    this.window?.webContents.send("update-downloaded");
    this.systemService?.showNotification(
      i18nService.t("notification.update.ready.title"),
      i18nService.t("notification.update.ready.body")
    );
  };

  cleanup(): void {
    if (!this.listenersRegistered) return;
    autoUpdater.off("update-available", this.handleUpdateAvailable);
    autoUpdater.off("update-not-available", this.handleUpdateNotAvailable);
    autoUpdater.off("error", this.handleError);
    autoUpdater.off("download-progress", this.handleDownloadProgress);
    autoUpdater.off("update-downloaded", this.handleUpdateDownloaded);
    this.listenersRegistered = false;
    logger.info("[service:update] cleanup: listeners removed");
  }

  private downloadUpdate(): void {
    this.isDownloading = true;
    logger.info("Starting update download");
    autoUpdater.downloadUpdate().catch((error) => {
      this.isDownloading = false;
      logger.error("Failed to download update", error);
      this.window?.webContents.send("update-error", toErrorMessage(error));
      this.systemService?.showNotification(
        i18nService.t("notification.update.downloadFailed.title"),
        i18nService.t("notification.update.downloadFailed.body")
      );
    });
  }
}

export const updateService = new UpdateService();
