import { app } from "electron";
import { registerIpcHandlers } from "./ipc/handlers";
import { AboutWindow } from "./windows/AboutWindow";
import { MainWindow } from "./windows/MainWindow";
import { SettingsWindow } from "./windows/SettingsWindow";
import { registerUpdaterListeners } from "./ipc/handlers/updaterHandler";
import { logger } from "./services/logger-service";
import { downloadService } from "./services/download-service";
import { WindowManager } from "./window-manager/WindowManager";
import type { SystemService } from "./services/system-service";
import { systemService } from "./services/system-service";
import { protocolService } from "./services/protocol-service";
import { deepLinkService } from "./services/deep-link-service";
import { updateService } from "./services/update-service";
import { trayService } from "./services/tray-service";
import { fontService } from "./services/font-service";
import { settingsService } from "./services/settings-service";
import { buildAppMenu } from "./menu";

export class MainApp {
  private readonly windowManager = new WindowManager();
  private readonly systemService = systemService;

  async init(): Promise<void> {
    this.registerWindows();
    registerIpcHandlers(this.windowManager);

    await app.whenReady();
    protocolService.registerFontProtocol();
    deepLinkService.register();
    settingsService.setWindowManager(this.windowManager);
    await settingsService.ensureLoaded();
    buildAppMenu(this.windowManager);
    trayService.initialize(this.windowManager);
    downloadService.monitorDownloads();

    updateService.setWindowManager(this.windowManager);
    // Hand the WindowManager to the deep-link service only now: setWindowManager
    // synchronously drains queued cold-start deep links, which may CREATE the
    // main window. Doing that before ensureLoaded() would first-paint the
    // renderer with the default theme/locale (ensureLoaded applies settings but
    // does not broadcast settings:updated, so the wrong paint would stick).
    deepLinkService.setWindowManager(this.windowManager);
    // open("main") fires the onCreate hook registered below, which attaches the
    // tray close interceptor — so every creation path (here, activate, tray,
    // deep link) wires it consistently. Deliberate: this runs even when a
    // cold-start deep link just opened a NON-main window (settings/about) —
    // the main window is the app's home surface and always shows on launch.
    const mainWindow = this.windowManager.open("main");
    registerUpdaterListeners(mainWindow, this.systemService);

    this.setupAppListeners();
  }

  private registerWindows(): void {
    // The main window's onCreate runs on every (re)creation, so the tray's
    // minimize-to-tray close interceptor is never missed regardless of which
    // path re-opened the window.
    this.windowManager.register(
      "main",
      () => new MainWindow(),
      (browserWindow) => trayService.attachMainWindow(browserWindow)
    );
    this.windowManager.register("about", () => new AboutWindow());
    this.windowManager.register("settings", () => new SettingsWindow());
  }

  private setupAppListeners(): void {
    app.on("activate", () => {
      // open() surfaces an existing window (restore/show/focus) or re-creates a
      // destroyed one, firing the onCreate hook to re-attach the tray. Update
      // state recovery is pull-based (renderer fetches the snapshot on mount).
      // try/catch: consistent with every other open() call site — a transient
      // re-creation failure on dock click must not escape the event emitter.
      try {
        this.windowManager.open("main");
      } catch (error) {
        logger.error("Failed to open main window from activate", error);
      }
    });

    app.on("window-all-closed", () => {
      // macOS convention: the app stays alive (dock + menu bar) when the last
      // window closes; the 'activate' handler above re-creates the window.
      if (process.platform === "darwin") {
        logger.info("All windows closed (macOS), app stays alive");
        return;
      }
      logger.info("All windows closed, quitting app");
      app.quit();
    });

    app.on("before-quit", () => {
      logger.info("App quitting, cleaning up services");
      trayService.cleanup();
      updateService.cleanup();
      downloadService.cleanup();
      fontService.invalidateCache();
    });
  }

  getWindowManager(): WindowManager {
    return this.windowManager;
  }

  getSystemService(): SystemService {
    return this.systemService;
  }
}
