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
    logger.info(`[service:system] setNotificationsEnabled called, enabled=${enabled}`);
    this.notificationsEnabled = enabled;
  }

  setAutoLaunch(enabled: boolean): void {
    logger.info(`[service:system] setAutoLaunch called, enabled=${enabled}`);
    try {
      app.setLoginItemSettings({ openAtLogin: enabled });
      logger.info(`[service:system] setAutoLaunch success, openAtLogin=${enabled}`);
    } catch (error) {
      logger.error("[service:system] setAutoLaunch failed", error);
      throw error;
    }
  }

  getAutoLaunchEnabled(): boolean {
    logger.debug("[service:system] getAutoLaunchEnabled called");
    const settings = app.getLoginItemSettings();
    logger.debug(`[service:system] getAutoLaunchEnabled result: openAtLogin=${settings.openAtLogin}`);
    return settings.openAtLogin;
  }

  showNotification(title: string, body: string, options?: ShowNotificationOptions): void {
    logger.info(`[service:system] showNotification called, title="${title}", body="${body}"`);

    if (!this.notificationsEnabled) {
      logger.info("[service:system] showNotification: notifications disabled by user setting, skipping");
      return;
    }

    if (!Notification.isSupported()) {
      logger.warn("[service:system] showNotification: notifications not supported on this platform");
      return;
    }

    const iconPath = resourceService.getStaticResourcePath("icons", "icon.png");
    const icon = nativeImage.createFromPath(iconPath);

    const notification = new Notification({
      title,
      body,
      icon: icon.isEmpty() ? undefined : icon,
    });

    if (options?.onClick) {
      const onClick = options.onClick;
      // once(): the listener detaches after the first click, so repeated
      // notifications don't accumulate live listeners for the process lifetime.
      notification.once("click", () => {
        try {
          onClick();
        } catch (error) {
          logger.error("[service:system] showNotification: error in click handler", error);
        }
      });
    }

    notification.show();
    logger.info("[service:system] showNotification: notification shown");
  }

  // ── Template extension points below ─────────────────────────────────────
  // Clipboard and screenshot helpers are part of this service's documented
  // surface (CLAUDE.md: "OS features: notifications, auto-launch, clipboard,
  // screenshots") but have no caller in the shipped template — wire them to an
  // IPC endpoint (see the "adding an endpoint" checklist) when a consumer
  // needs them. Same for showNotification's `options.onClick`.

  writeClipboardText(text: string): void {
    logger.info("[service:system] writeClipboardText called");
    clipboard.writeText(text);
    logger.debug("[service:system] writeClipboardText: clipboard updated");
  }

  readClipboardText(): string {
    logger.debug("[service:system] readClipboardText called");
    const text = clipboard.readText();
    logger.debug("[service:system] readClipboardText: read complete");
    return text;
  }

  clearClipboard(): void {
    logger.info("[service:system] clearClipboard called");
    clipboard.clear();
    logger.debug("[service:system] clearClipboard: clipboard cleared");
  }

  async captureWindowScreenshot(window: BrowserWindow): Promise<NativeImage | null> {
    logger.info(`[service:system] captureWindowScreenshot called, windowId=${window.id}`);
    try {
      const image = await window.capturePage();
      logger.info("[service:system] captureWindowScreenshot: captured");
      return image;
    } catch (error) {
      logger.error("[service:system] captureWindowScreenshot failed", error);
      return null;
    }
  }

  async saveWindowScreenshot(window: BrowserWindow, options: SaveScreenshotOptions = {}): Promise<string | null> {
    logger.info(
      `[service:system] saveWindowScreenshot called, windowId=${window.id}, directory=${options.directory ?? "(temp)"}`
    );
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
      logger.info("[service:system] saveWindowScreenshot: saved", filePath);
      return filePath;
    } catch (error) {
      logger.error("[service:system] saveWindowScreenshot failed", error);
      return null;
    }
  }
}

export const systemService = new SystemService();
