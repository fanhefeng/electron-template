import type { BrowserWindowConstructorOptions } from "electron";
import { app, BrowserWindow } from "electron";
import { pathToFileURL } from "node:url";
import { logger } from "../services/logger-service";
import { resourceService } from "../services/resource-service";

export interface WindowOptions {
  name: string;
  preload?: string;
  url?: string;
  windowOptions?: BrowserWindowConstructorOptions;
  openDevTools?: boolean;
}

// Single source of truth for the dev-server origin: loadContent and the
// will-navigate whitelist must derive from the same value, otherwise a custom
// ELECTRON_DEV_SERVER_URL loads fine but every subsequent navigation is blocked.
const getDevServerBaseUrl = (): string => {
  const base = process.env.ELECTRON_DEV_SERVER_URL ?? "http://localhost:5173/";
  // Guarantee a trailing slash so `${base}${htmlFile}` is well-formed even when
  // a custom ELECTRON_DEV_SERVER_URL omits it (e.g. "http://localhost:5173").
  return base.endsWith("/") ? base : `${base}/`;
};

export abstract class AbstractWindow {
  protected browserWindow: BrowserWindow | null = null;

  constructor(protected readonly options: WindowOptions) {}

  create(): BrowserWindow {
    logger.info(`Creating window: ${this.options.name}`);

    const { webPreferences: overrideWebPreferences, ...restWindowOptions } = this.options.windowOptions ?? {};
    this.browserWindow = new BrowserWindow({
      width: 900,
      height: 680,
      show: false,
      ...restWindowOptions,
      // Merge (not replace) so a subclass passing its own webPreferences can
      // never silently drop the security hardening; the secure defaults win.
      webPreferences: {
        ...overrideWebPreferences,
        preload: this.options.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.browserWindow.on("ready-to-show", () => {
      this.browserWindow?.show();
    });

    this.browserWindow.on("closed", () => {
      logger.info(`Window closed: ${this.options.name}`);
      this.browserWindow = null;
    });

    this.browserWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    // Production whitelist is the app's OWN renderer directory, not all of
    // file:// — a bare scheme check would let a compromised renderer navigate
    // to any local file (file:///etc/passwd).
    const getRendererBaseUrl = (): string => {
      const base = pathToFileURL(resourceService.getRendererPath()).href;
      return base.endsWith("/") ? base : `${base}/`;
    };
    const isAllowedUrl = (url: string): boolean =>
      app.isPackaged ? url.startsWith(getRendererBaseUrl()) : url.startsWith(getDevServerBaseUrl());
    const blockIfDisallowed = (label: string) => (event: Electron.Event, url: string) => {
      if (!isAllowedUrl(url)) {
        event.preventDefault();
        logger.warn(`Blocked ${label} in ${this.options.name}: ${url}`);
      }
    };
    // Guard both navigation AND redirects: an allowed URL that 30x-redirects
    // off-origin must be blocked too, not just direct navigations.
    this.browserWindow.webContents.on("will-navigate", blockIfDisallowed("will-navigate"));
    this.browserWindow.webContents.on("will-redirect", blockIfDisallowed("will-redirect"));

    this.loadContent();

    return this.browserWindow;
  }

  protected loadContent(): void {
    if (!this.browserWindow) {
      return;
    }

    // On load failure, show the (blank) window anyway: it was created with
    // show:false and ready-to-show will never fire, so without this the app
    // would appear to do nothing — an invisible, unrecoverable window.
    const showOnLoadFailure = (error: unknown, kind: string) => {
      logger.error(`Failed to load ${kind} for ${this.options.name}`, error);
      if (this.browserWindow && !this.browserWindow.isDestroyed()) {
        this.browserWindow.show();
      }
    };

    if (!app.isPackaged) {
      const devUrl = this.options.url ?? `${getDevServerBaseUrl()}${this.getHtmlFileName()}`;
      this.browserWindow.loadURL(devUrl).catch((error) => showOnLoadFailure(error, "URL"));
      if (this.shouldOpenDevTools()) {
        this.browserWindow.webContents.openDevTools({ mode: "detach" });
      }
    } else {
      const indexHtml = resourceService.getRendererHtmlPath(this.getHtmlFileName());
      this.browserWindow.loadFile(indexHtml).catch((error) => showOnLoadFailure(error, "file"));
    }
  }

  private shouldOpenDevTools(): boolean {
    if (typeof this.options.openDevTools === "boolean") {
      return this.options.openDevTools;
    }

    return process.env.ELECTRON_OPEN_DEVTOOLS === "true";
  }

  protected abstract getHtmlFileName(): string;
}
