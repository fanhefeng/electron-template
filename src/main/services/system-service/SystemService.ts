import { BrowserWindow, Notification, clipboard } from "electron";
import { promises as fs } from "node:fs";
import type { NativeImage } from "electron";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

interface SaveScreenshotOptions {
  directory?: string;
  filename?: string;
}

export class SystemService {
  showNotification(title: string, body: string): void {
    if (!Notification.isSupported()) {
      logger.warn("Notifications are not supported on this platform");
      return;
    }

    const notification = new Notification({
      title,
      body,
    });

    notification.show();
  }

  writeClipboardText(text: string): void {
    clipboard.writeText(text);
    logger.debug("Clipboard updated");
  }

  readClipboardText(): string {
    return clipboard.readText();
  }

  clearClipboard(): void {
    clipboard.clear();
    logger.debug("Clipboard cleared");
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
