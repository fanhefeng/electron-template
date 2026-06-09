import type { BrowserWindow, WebContents } from "electron";
import { logger } from "../services/logger-service";
import type { AbstractWindow } from "./AbstractWindow";

export type WindowIdentifier = "main" | "about" | "settings";

/**
 * Brings an existing window fully to the foreground. focus() alone does NOT
 * reveal a window that was hidden (minimize-to-tray) or minimized, so a deep
 * link / tray / menu action targeting the main window would deliver its
 * payload to an invisible window. Single shared implementation — used by
 * WindowManager's reuse path and TrayService's tray-click path.
 */
export const surfaceWindow = (browserWindow: BrowserWindow): void => {
  if (browserWindow.isMinimized()) {
    browserWindow.restore();
  }
  if (!browserWindow.isVisible()) {
    browserWindow.show();
  }
  browserWindow.focus();
};

type WindowFactory = () => AbstractWindow;
/** Called every time a window of this id is (re)created — NOT on reuse. */
type WindowCreateHook = (browserWindow: BrowserWindow) => void;

interface RegisteredWindow {
  factory: WindowFactory;
  onCreate?: WindowCreateHook;
  instance: AbstractWindow | null;
  browserWindow: BrowserWindow | null;
}

export class WindowManager {
  private readonly registry = new Map<WindowIdentifier, RegisteredWindow>();

  register(id: WindowIdentifier, factory: WindowFactory, onCreate?: WindowCreateHook): void {
    logger.info(`[window-manager] register: ${id}`);
    this.registry.set(id, {
      factory,
      onCreate,
      instance: null,
      browserWindow: null,
    });
  }

  open(id: WindowIdentifier): BrowserWindow {
    logger.info(`[window-manager] open called: ${id}`);
    const registeredWindow = this.registry.get(id);

    if (!registeredWindow) {
      throw new Error(`Window with identifier ${id} is not registered`);
    }

    if (registeredWindow.browserWindow && !registeredWindow.browserWindow.isDestroyed()) {
      logger.info(`[window-manager] open: surfacing existing window: ${id}`);
      surfaceWindow(registeredWindow.browserWindow);
      return registeredWindow.browserWindow;
    }

    let windowInstance: AbstractWindow;
    let browserWindow: BrowserWindow;

    try {
      windowInstance = registeredWindow.factory();
      browserWindow = windowInstance.create();
    } catch (error) {
      logger.error(`Failed to create window: ${id}`, error);
      throw error;
    }

    // Mutate the single registry entry in place — replacing it with a spread
    // copy would leave earlier closures (like the once-closed cleanup below)
    // holding stale snapshots that clobber any field a newer copy carries.
    registeredWindow.instance = windowInstance;
    registeredWindow.browserWindow = browserWindow;

    browserWindow.once("closed", () => {
      logger.info(`Clean up window instance: ${id}`);
      registeredWindow.instance = null;
      registeredWindow.browserWindow = null;
    });

    // Fire the create hook on EVERY (re)creation so per-window wiring (e.g. the
    // tray close interceptor) is re-established no matter which path opened it —
    // init, activate, tray, or a deep link re-creating a destroyed window.
    if (registeredWindow.onCreate) {
      try {
        registeredWindow.onCreate(browserWindow);
      } catch (error) {
        logger.error(`onCreate hook failed for window: ${id}`, error);
      }
    }

    return browserWindow;
  }

  getBrowserWindow(id: WindowIdentifier): BrowserWindow | null {
    const registeredWindow = this.registry.get(id);
    const browserWindow = registeredWindow?.browserWindow ?? null;
    logger.debug(`[window-manager] getBrowserWindow: ${id} → ${browserWindow ? `window ${browserWindow.id}` : "null"}`);
    return browserWindow;
  }

  /**
   * Maps an IPC sender back to its window identifier, so handlers can derive
   * the calling window's identity from the event (trustworthy) instead of from
   * renderer-supplied data (spoofable across windows).
   */
  getWindowIdForWebContents(webContents: WebContents): WindowIdentifier | null {
    for (const [id, registered] of this.registry) {
      const win = registered.browserWindow;
      if (win && !win.isDestroyed() && win.webContents === webContents) {
        logger.debug(`[window-manager] getWindowIdForWebContents: resolved sender to "${id}"`);
        return id;
      }
    }
    logger.debug("[window-manager] getWindowIdForWebContents: sender matches no registered window");
    return null;
  }

}
