import { app, Notification, clipboard, nativeImage } from "electron";
import { promises as fs } from "node:fs";
import type { NativeImage, BrowserWindow } from "electron";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

interface SaveScreenshotOptions {
  directory?: string;
  filename?: string;
}

interface ShowNotificationOptions {
  onClick?: () => void;
}

export class SystemService {
  private notificationsEnabled = true;

  setNotificationsEnabled(enabled: boolean): void {
    logger.info(`SystemService.setNotificationsEnabled called, enabled=${enabled}`);
    this.notificationsEnabled = enabled;
  }

  setAutoLaunch(enabled: boolean): void {
    logger.info(`SystemService.setAutoLaunch called, enabled=${enabled}`);
    try {
      app.setLoginItemSettings({ openAtLogin: enabled });
      logger.info(`SystemService.setAutoLaunch success, openAtLogin=${enabled}`);
    } catch (error) {
      logger.error("SystemService.setAutoLaunch failed", error);
      throw error;
    }
  }

  getAutoLaunchEnabled(): boolean {
    logger.debug("SystemService.getAutoLaunchEnabled called");
    const settings = app.getLoginItemSettings();
    logger.debug(`SystemService.getAutoLaunchEnabled result: openAtLogin=${settings.openAtLogin}`);
    return settings.openAtLogin;
  }

  showNotification(title: string, body: string, options?: ShowNotificationOptions): void {
    logger.info(`SystemService.showNotification called, title="${title}", body="${body}"`);

    if (!this.notificationsEnabled) {
      logger.info("SystemService.showNotification: notifications disabled by user setting, skipping");
      return;
    }

    if (!Notification.isSupported()) {
      logger.warn("SystemService.showNotification: notifications not supported on this platform");
      return;
    }

    const iconPath = resourceService.getStaticResourcePath("icons", "icon.icns");
    const icon = nativeImage.createFromPath(iconPath);

    const notification = new Notification({
      title,
      body,
      icon: icon.isEmpty() ? undefined : icon,
    });

    if (options?.onClick) {
      const onClick = options.onClick;
      notification.on("click", () => {
        try {
          onClick();
        } catch (error) {
          logger.error("SystemService.showNotification: error in click handler", error);
        }
      });
    }

    notification.show();
    logger.info("SystemService.showNotification: notification shown");
  }

  writeClipboardText(text: string): void {
    logger.info("SystemService.writeClipboardText called");
    clipboard.writeText(text);
    logger.debug("SystemService.writeClipboardText: clipboard updated");
  }

  readClipboardText(): string {
    logger.debug("SystemService.readClipboardText called");
    const text = clipboard.readText();
    logger.debug("SystemService.readClipboardText: read complete");
    return text;
  }

  clearClipboard(): void {
    logger.info("SystemService.clearClipboard called");
    clipboard.clear();
    logger.debug("SystemService.clearClipboard: clipboard cleared");
  }

  async captureWindowScreenshot(window: BrowserWindow): Promise<NativeImage | null> {
    try {
      const image = await window.capturePage();
      logger.info("Captured window screenshot");
      return image;
    } catch (error) {
      logger.error("Failed to capture window screenshot", error);
      return null;
    }
  }

  async saveWindowScreenshot(window: BrowserWindow, options: SaveScreenshotOptions = {}): Promise<string | null> {
    const image = await this.captureWindowScreenshot(window);
    if (!image) {
      return null;
    }

    const directory = options.directory ?? resourceService.getTempDirectory("screenshots");
    const filename = options.filename ?? `screenshot-${Date.now()}.png`;
    const filePath = resourceService.resolvePath(directory, filename);

    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(filePath, image.toPNG());
      logger.info("Window screenshot saved", filePath);
      return filePath;
    } catch (error) {
      logger.error("Failed to save screenshot", error);
      return null;
    }
  }
}

export const systemService = new SystemService();
