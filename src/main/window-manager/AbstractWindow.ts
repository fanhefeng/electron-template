import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { logger } from '../services/logger-service';
import { resourceService } from '../services/resource-service';

export interface WindowOptions {
  name: string;
  preload?: string;
  url?: string;
  windowOptions?: BrowserWindowConstructorOptions;
  openDevTools?: boolean;
}

export abstract class AbstractWindow {
  protected browserWindow: BrowserWindow | null = null;

  constructor(protected readonly options: WindowOptions) {}

  create(): BrowserWindow {
    logger.info(`Creating window: ${this.options.name}`);

    this.browserWindow = new BrowserWindow({
      width: 900,
      height: 680,
      show: false,
      webPreferences: {
        preload: this.options.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      },
      ...this.options.windowOptions
    });

    this.browserWindow.on('ready-to-show', () => {
      this.browserWindow?.show();
    });

    this.browserWindow.on('closed', () => {
      logger.info(`Window closed: ${this.options.name}`);
      this.browserWindow = null;
    });

    this.loadContent();

    return this.browserWindow;
  }

  focus(): void {
    this.browserWindow?.focus();
  }

  getWindow(): BrowserWindow | null {
    return this.browserWindow;
  }

  protected loadContent(): void {
    if (!this.browserWindow) {
      return;
    }

    if (!app.isPackaged && this.options.url) {
      this.browserWindow.loadURL(this.options.url).catch((error) => {
        logger.error(`Failed to load URL for ${this.options.name}`, error);
      });
      if (this.shouldOpenDevTools()) {
        this.browserWindow.webContents.openDevTools({ mode: 'detach' });
      }
    } else {
      const indexHtml = resourceService.getRendererHtmlPath(this.getHtmlFileName());
      this.browserWindow
        .loadFile(indexHtml)
        .catch((error) => logger.error(`Failed to load file for ${this.options.name}`, error));
    }
  }

  private shouldOpenDevTools(): boolean {
    if (typeof this.options.openDevTools === 'boolean') {
      return this.options.openDevTools;
    }

    return process.env.ELECTRON_OPEN_DEVTOOLS === 'true';
  }

  protected abstract getHtmlFileName(): string;
}
