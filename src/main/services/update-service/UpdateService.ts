import type { BrowserWindow } from "electron";
import { dialog, app } from "electron";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo } from "electron-updater";
import { logger } from "../logger-service";
import { i18nService } from "../i18n-service";
import type { SystemService } from "../system-service";
import type { WindowManager } from "../../window-manager/WindowManager";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import type { UpdateStateSnapshot } from "../../../shared/update";
import * as path from "path";

const toErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// A download with no progress/settlement for this long is treated as hung and
// no longer blocks new update checks.
const STALE_DOWNLOAD_TIMEOUT_MS = 10 * 60_000;

export class UpdateService {
  private window?: BrowserWindow;
  private windowManager: WindowManager | null = null;
  private systemService?: SystemService;
  private listenersRegistered = false;
  private isUpdateAvailable = false;
  private isDownloading = false;
  private isDownloaded = false;
  private lastProgressPercent: number | null = null;
  private lastDownloadActivityAt = 0;

  constructor() {
    // Manual control: updates are only downloaded when the user asks (applyUpdate).
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

      logger.info(`[service:update] development mode: using update config from ${devUpdateConfig}`);
    }

    // allowDowngrade 允许版本降级（用于测试）。普通可写字段，直接赋值即可。
    autoUpdater.allowDowngrade = isDev;
  }

  setWindowManager(windowManager: WindowManager): void {
    logger.info("[service:update] setWindowManager called");
    this.windowManager = windowManager;
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

  /**
   * Resolves the CURRENT live main window at send time. Previously a single
   * captured BrowserWindow reference went stale when the window closed
   * mid-download, so a re-opened window never received progress/downloaded
   * events and its UI sat on "downloading" forever.
   */
  private getTargetWindow(): BrowserWindow | undefined {
    const managed = this.windowManager?.getBrowserWindow("main");
    if (managed && !managed.isDestroyed()) return managed;
    if (this.window && !this.window.isDestroyed()) return this.window;
    return undefined;
  }

  private send(channel: string, ...args: unknown[]): void {
    this.getTargetWindow()?.webContents.send(channel, ...args);
  }

  /**
   * Pull model for (re)opened windows: pushing a replay at did-finish-load
   * still races React's mount (listeners register after the push lands), so
   * the renderer instead pulls this snapshot when its component mounts.
   */
  getState(): UpdateStateSnapshot {
    logger.debug(
      `[service:update] getState called (available=${this.isUpdateAvailable}, downloading=${this.isDownloading}, downloaded=${this.isDownloaded}, percent=${this.lastProgressPercent ?? "null"})`
    );
    return {
      isUpdateAvailable: this.isUpdateAvailable,
      isDownloading: this.isDownloading,
      isDownloaded: this.isDownloaded,
      percent: this.lastProgressPercent,
    };
  }

  checkForUpdates(browserWindow?: BrowserWindow): void {
    logger.info("[service:update] checkForUpdates called");
    if (browserWindow) {
      this.setWindow(browserWindow);
    }

    if (this.isDownloading) {
      const idleMs = Date.now() - this.lastDownloadActivityAt;
      if (idleMs < STALE_DOWNLOAD_TIMEOUT_MS) {
        logger.info("[service:update] download already in progress, skipping check");
        return;
      }
      // Watchdog: a download that neither settled (resolve/reject/error event)
      // nor reported progress for this long is assumed hung — without this
      // reset, isDownloading would silently block every future check for the
      // rest of the session.
      logger.warn(`[service:update] download stalled for ${Math.round(idleMs / 1000)}s, resetting and re-checking`);
      this.isDownloading = false;
    }

    // Fresh check cycle: a previously downloaded package and its progress no
    // longer describe the current state (keeping percent=100 with
    // isDownloaded=false would render a frozen stale progress bar).
    this.isUpdateAvailable = false;
    this.isDownloaded = false;
    this.lastProgressPercent = null;

    autoUpdater.checkForUpdates().catch((error) => {
      // electron-updater also emits "error" for this failure → handleError
      // already sends UPDATE_ERROR + the OS notification. This catch only adds
      // what the event path can't know: the log line and a modal dialog on the
      // window that initiated the check. Duplicating the send/notification
      // here showed the user two errors per failure.
      logger.error("[service:update] failed to check for updates", error);
      if (browserWindow && !browserWindow.isDestroyed()) {
        dialog.showErrorBox(i18nService.t("notification.update.error.title"), toErrorMessage(error));
      }
    });
    logger.info("[service:update] update check initiated");
  }

  applyUpdate(): void {
    logger.info("[service:update] applyUpdate called");
    if (!this.isDownloaded) {
      if (!this.isUpdateAvailable) {
        // Stale renderer state (e.g. Apply clicked after update-not-available):
        // downloading with nothing available would only produce a spurious
        // error event + notification. Resync the renderer instead.
        logger.warn("[service:update] apply requested but no update is available, resyncing renderer");
        this.send(IPC_CHANNELS.UPDATE_NOT_AVAILABLE);
        return;
      }
      logger.warn("[service:update] apply requested before package downloaded, starting download");

      if (!this.isDownloading) {
        this.downloadUpdate();
      }

      this.send(IPC_CHANNELS.UPDATE_DOWNLOAD_PENDING);
      return;
    }

    logger.info("[service:update] applying update");
    autoUpdater.quitAndInstall();
  }

  registerListeners(browserWindow?: BrowserWindow, systemService?: SystemService): void {
    logger.info("[service:update] registerListeners called");
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
    logger.info("[service:update] update available");
    // A newly reported update invalidates any package from a previous cycle:
    // applyUpdate must re-download, never quitAndInstall stale state. The
    // available flag survives in the snapshot so a window (re)opened after this
    // event still renders "update available" instead of "idle".
    this.isUpdateAvailable = true;
    this.isDownloaded = false;
    this.lastProgressPercent = null;
    this.send(IPC_CHANNELS.UPDATE_AVAILABLE);
    this.systemService?.showNotification(
      i18nService.t("notification.update.available.title"),
      i18nService.t("notification.update.available.body")
    );
    // Deliberately NO automatic download here: autoDownload=false means the
    // user decides (the Apply Update button triggers the download).
  };

  private handleUpdateNotAvailable = (): void => {
    logger.info("[service:update] no updates available");
    this.isUpdateAvailable = false;
    this.isDownloading = false;
    this.isDownloaded = false;
    this.lastProgressPercent = null;
    this.send(IPC_CHANNELS.UPDATE_NOT_AVAILABLE);
    this.systemService?.showNotification(
      i18nService.t("notification.update.notAvailable.title"),
      i18nService.t("notification.update.notAvailable.body")
    );
  };

  private handleError = (error: unknown): void => {
    logger.error("[service:update] update error", error);
    this.isUpdateAvailable = false;
    this.isDownloading = false;
    // A package that errored after download must not be installable: applyUpdate
    // would otherwise quitAndInstall a payload the updater already rejected.
    this.isDownloaded = false;
    this.lastProgressPercent = null;
    this.send(IPC_CHANNELS.UPDATE_ERROR, toErrorMessage(error));
    this.systemService?.showNotification(
      i18nService.t("notification.update.error.title"),
      i18nService.t("notification.update.error.body")
    );
  };

  private handleDownloadProgress = (progress: ProgressInfo): void => {
    logger.info("[service:update] download progress", progress);
    this.lastDownloadActivityAt = Date.now();
    if (typeof progress.percent === "number") {
      this.lastProgressPercent = progress.percent;
    }
    this.send(IPC_CHANNELS.UPDATE_DOWNLOAD_PROGRESS, progress);
  };

  private handleUpdateDownloaded = (): void => {
    logger.info("[service:update] update downloaded");
    this.isDownloading = false;
    this.isDownloaded = true;
    this.send(IPC_CHANNELS.UPDATE_DOWNLOADED);
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
    this.lastDownloadActivityAt = Date.now();
    logger.info("[service:update] starting update download");
    autoUpdater.downloadUpdate().catch((error) => {
      // Bookkeeping only: electron-updater also emits "error" for download
      // failures → handleError already sends UPDATE_ERROR + a notification.
      // Duplicating them here showed the user two notifications per failure.
      this.isDownloading = false;
      logger.error("[service:update] failed to download update", error);
    });
  }
}

export const updateService = new UpdateService();
