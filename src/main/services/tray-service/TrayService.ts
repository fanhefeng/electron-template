import { app, Tray, Menu, nativeImage } from "electron";
import type { BrowserWindow, MenuItemConstructorOptions } from "electron";
import { logger } from "../logger-service";
import { i18nService } from "../i18n-service";
import { resourceService } from "../resource-service";
import type { WindowManager } from "../../window-manager/WindowManager";
import { surfaceWindow } from "../../window-manager/WindowManager";

const DEV_SUFFIX = " (Dev)";

export class TrayService {
  private tray: Tray | null = null;
  private windowManager: WindowManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private detachMainWindow: (() => void) | null = null;
  private quitListenerRegistered = false;
  private minimizeToTray = false;
  private isQuitting = false;

  initialize(windowManager: WindowManager): void {
    logger.info("[service:tray] initialize called");
    this.windowManager = windowManager;
    this.createTray();

    // Guard against repeated initialize calls stacking before-quit listeners.
    if (!this.quitListenerRegistered) {
      this.quitListenerRegistered = true;
      app.on("before-quit", () => {
        logger.info("[service:tray] before-quit: marking isQuitting=true");
        this.isQuitting = true;
      });
    }
  }

  attachMainWindow(window: BrowserWindow): void {
    logger.info(`[service:tray] attachMainWindow called, windowId=${window.id}`);
    if (this.mainWindow === window) {
      // Same window re-attached (e.g. macOS 'activate' on a living window):
      // listeners are already wired, do not stack duplicates.
      return;
    }
    // Detach from any previous window so close handlers never accumulate.
    this.detachMainWindow?.();

    const handleClose = (event: Electron.Event) => {
      // Guard on tray existence: if createTray() failed (e.g. icon missing or
      // undecodable) the window must close normally — hiding it with no tray
      // icon to restore and no dock would leave an unrecoverable zombie app on
      // Windows/Linux (window-all-closed never fires).
      if (this.tray && this.minimizeToTray && !this.isQuitting) {
        logger.info("[service:tray] intercepting main window close, hiding to tray");
        event.preventDefault();
        window.hide();
      }
    };
    const handleClosed = () => {
      if (this.mainWindow === window) {
        this.mainWindow = null;
        this.detachMainWindow = null;
      }
    };

    window.on("close", handleClose);
    window.on("closed", handleClosed);
    this.mainWindow = window;
    this.detachMainWindow = () => {
      window.off("close", handleClose);
      window.off("closed", handleClosed);
      if (this.mainWindow === window) {
        this.mainWindow = null;
      }
      this.detachMainWindow = null;
    };
  }

  setMinimizeToTray(enabled: boolean): void {
    logger.info(`[service:tray] setMinimizeToTray called, enabled=${enabled}`);
    this.minimizeToTray = enabled;
  }

  rebuildMenu(): void {
    logger.info("[service:tray] rebuildMenu called");
    if (!this.tray) return;
    this.tray.setToolTip(this.getTooltip());
  }

  cleanup(): void {
    logger.info("[service:tray] cleanup called");
    this.tray?.destroy();
    this.tray = null;
    // Properly detach the close/closed listeners (also nulls mainWindow): just
    // nulling the field would leave a stale close-interceptor on the window if
    // cleanup() were ever called outside of app shutdown.
    this.detachMainWindow?.();
    this.mainWindow = null;
  }

  private createTray(): void {
    const iconPath = resourceService.getStaticResourcePath("icons", "iconTemplate.png");
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      logger.warn(`[service:tray] failed to load tray icon from ${iconPath}, tray not created`);
      return;
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip(this.getTooltip());

    this.tray.on("click", () => {
      logger.info("[service:tray] tray left-click");
      this.showMainWindow();
    });

    this.tray.on("right-click", () => {
      logger.info("[service:tray] tray right-click");
      this.buildAndPopUpContextMenu();
    });

    logger.info("[service:tray] tray created");
  }

  private buildAndPopUpContextMenu(): void {
    if (!this.tray) return;

    const t = (key: string) => i18nService.t(key);

    const template: MenuItemConstructorOptions[] = [
      { label: t("tray.show"), click: () => this.showMainWindow() },
      { type: "separator" },
      {
        label: t("tray.settings"),
        click: () => {
          try {
            this.windowManager?.open("settings");
          } catch (error) {
            logger.error("[service:tray] failed to open settings window", error);
          }
        },
      },
      {
        label: t("tray.about"),
        click: () => {
          try {
            this.windowManager?.open("about");
          } catch (error) {
            logger.error("[service:tray] failed to open about window", error);
          }
        },
      },
      { type: "separator" },
      { label: t("tray.quit"), click: () => app.quit() },
    ];

    const menu = Menu.buildFromTemplate(template);
    this.tray.popUpContextMenu(menu);
  }

  private showMainWindow(): void {
    const win = this.mainWindow ?? this.windowManager?.getBrowserWindow("main") ?? null;
    if (!win || win.isDestroyed()) {
      logger.info("[service:tray] showMainWindow: no main window, opening new one");
      // open() re-creates the window and its onCreate hook re-attaches the tray
      // close interceptor (this very service); it also surfaces the window.
      this.windowManager?.open("main");
      return;
    }
    logger.info("[service:tray] showMainWindow: surfacing existing window");
    surfaceWindow(win);
  }

  private getTooltip(): string {
    const title = i18nService.t("app.title");
    return app.isPackaged ? title : `${title}${DEV_SUFFIX}`;
  }
}

export const trayService = new TrayService();
