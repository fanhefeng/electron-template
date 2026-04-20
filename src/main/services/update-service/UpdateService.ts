import { BrowserWindow, dialog, app } from "electron";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo } from "electron-updater";
import { logger } from "../logger-service";
import type { SystemService } from "../system-service/SystemService";
import * as path from "path";

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
    (autoUpdater as unknown as Record<string, unknown>).allowDowngrade = isDev;
  }

  checkForUpdates(browserWindow?: BrowserWindow): void {
    if (browserWindow) {
      this.window = browserWindow;
    }

    this.isDownloaded = false;
    this.isDownloading = false;

    logger.info("Checking for updates");
    autoUpdater.checkForUpdates().catch((error) => {
      logger.error("Failed to check for updates", error);
      this.window?.webContents.send("update-error", error instanceof Error ? error.message : String(error));
      if (this.window && this.window === browserWindow) {
        dialog.showErrorBox("Update error", error instanceof Error ? error.message : String(error));
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
      this.window = browserWindow;
    }

    if (systemService) {
      this.systemService = systemService;
    }

    if (this.listenersRegistered) {
      return;
    }

    autoUpdater.on("update-available", this.handleUpdateAvailable);
    autoUpdater.on("update-not-available", this.handleUpdateNotAvailable);
    autoUpdater.on("error", this.handleError);
    autoUpdater.on("download-progress", this.handleDownloadProgress);
    autoUpdater.on("update-downloaded", this.handleUpdateDownloaded);

    this.listenersRegistered = true;
  }

  private handleUpdateAvailable = (): void => {
    logger.info("Update available");
    this.window?.webContents.send("update-available");
    this.systemService?.showNotification("更新可用", "检测到新版本，准备下载。");
    if (!this.isDownloading && !this.isDownloaded) {
      this.downloadUpdate();
    }
  };

  private handleUpdateNotAvailable = (): void => {
    logger.info("No updates available");
    this.isDownloading = false;
    this.isDownloaded = false;
    this.window?.webContents.send("update-not-available");
    this.systemService?.showNotification("暂无更新", "当前已是最新版本。");
  };

  private handleError = (error: unknown): void => {
    logger.error("Update error", error);
    this.isDownloading = false;
    this.window?.webContents.send("update-error", error instanceof Error ? error.message : String(error));
    this.systemService?.showNotification("更新失败", "更新检查过程中出现问题。");
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
    this.systemService?.showNotification("更新就绪", "新版本已下载，准备安装。");
  };

  private downloadUpdate(): void {
    this.isDownloading = true;
    logger.info("Starting update download");
    autoUpdater.downloadUpdate().catch((error) => {
      this.isDownloading = false;
      logger.error("Failed to download update", error);
      this.window?.webContents.send("update-error", error instanceof Error ? error.message : String(error));
      this.systemService?.showNotification("下载失败", "无法下载更新包。");
    });
  }
}

export const updateService = new UpdateService();
