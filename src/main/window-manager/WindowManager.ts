import type { BrowserWindow } from "electron";
import { logger } from "../services/logger-service";
import type { AbstractWindow } from "./AbstractWindow";

export type WindowIdentifier = "main" | "about" | "settings";

type WindowFactory = () => AbstractWindow;

interface RegisteredWindow {
  factory: WindowFactory;
  instance: AbstractWindow | null;
  browserWindow: BrowserWindow | null;
}

export class WindowManager {
  private readonly registry = new Map<WindowIdentifier, RegisteredWindow>();

  register(id: WindowIdentifier, factory: WindowFactory): void {
    this.registry.set(id, {
      factory,
      instance: null,
      browserWindow: null,
    });
  }

  open(id: WindowIdentifier): BrowserWindow {
    const registeredWindow = this.registry.get(id);

    if (!registeredWindow) {
      throw new Error(`Window with identifier ${id} is not registered`);
    }

    if (registeredWindow.browserWindow && !registeredWindow.browserWindow.isDestroyed()) {
      registeredWindow.browserWindow.focus();
      return registeredWindow.browserWindow;
    }

    const windowInstance = registeredWindow.factory();
    const browserWindow = windowInstance.create();

    browserWindow.once("closed", () => {
      logger.info(`Clean up window instance: ${id}`);
      this.registry.set(id, {
        ...registeredWindow,
        instance: null,
        browserWindow: null,
      });
    });

    this.registry.set(id, {
      factory: registeredWindow.factory,
      instance: windowInstance,
      browserWindow,
    });

    return browserWindow;
  }

  getBrowserWindow(id: WindowIdentifier): BrowserWindow | null {
    const registeredWindow = this.registry.get(id);
    return registeredWindow?.browserWindow ?? null;
  }
}
