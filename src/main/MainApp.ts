import { app, BrowserWindow } from "electron";
import { registerIpcHandlers } from "./ipc/handlers";
import { AboutWindow } from "./windows/AboutWindow";
import { MainWindow } from "./windows/MainWindow";
import { SettingsWindow } from "./windows/SettingsWindow";
import { registerUpdaterListeners } from "./ipc/handlers/updaterHandler";
import { logger } from "./services/logger-service";
import { downloadService } from "./services/download-service";
import { WindowManager } from "./window-manager/WindowManager";
import { SystemService } from "./services/system-service";
import { protocolService } from "./services/protocol-service";
import { deepLinkService } from "./services/deep-link-service";
import { updateService } from "./services/update-service";
import { fontService } from "./services/font-service";
import { ensureLoaded as ensureSettingsLoaded } from "./ipc/handlers/settingsHandler";

export class MainApp {
  private readonly windowManager = new WindowManager();
  private readonly systemService = new SystemService();

  async init(): Promise<void> {
    this.registerWindows();
    registerIpcHandlers(this.windowManager);

    await app.whenReady();
    protocolService.registerFontProtocol();
    deepLinkService.register();
    deepLinkService.setWindowManager(this.windowManager);
    await ensureSettingsLoaded();
    downloadService.monitorDownloads();

    const mainWindow = this.windowManager.open("main");
    registerUpdaterListeners(mainWindow, this.systemService);

    this.setupAppListeners();
  }

  private registerWindows(): void {
    this.windowManager.register("main", () => new MainWindow());
    this.windowManager.register("about", () => new AboutWindow());
    this.windowManager.register("settings", () => new SettingsWindow());
  }

  private setupAppListeners(): void {
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.open("main");
      }
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        logger.info("All windows closed, quitting app");
        app.quit();
      }
    });

    app.on("before-quit", () => {
      logger.info("App quitting, cleaning up services");
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
