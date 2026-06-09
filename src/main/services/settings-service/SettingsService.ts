import { app, BrowserWindow } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import { SYSTEM_FONT_ID } from "../../../shared/fonts";
import type { AppSettings, FontPreference } from "../../../shared/settings";
import { defaultSettings, sanitizeSettings } from "../../../shared/settings";
import { DEFAULT_THEME_ID } from "../../../shared/themes";
import { logger } from "../logger-service";
import { fontService } from "../font-service";
import { i18nService } from "../i18n-service";
import { themeService } from "../theme-service";
import { systemService } from "../system-service";
import { trayService } from "../tray-service";
import { buildAppMenu } from "../../menu";
import type { WindowManager } from "../../window-manager/WindowManager";
import { backupCorruptFile, writeJsonAtomic } from "../../utils/atomic-file";
import { SerialQueue } from "../../utils/serial-queue";

/**
 * Owns settings persistence (userData/settings.json), the in-memory cache,
 * sanitization, and the cross-service side effects of a settings change
 * (autoLaunch, notifications, tray, active theme, locale → menu/tray rebuild).
 * The IPC handler delegates here per the project rule that business logic
 * lives in the service layer, never in handlers.
 */
export class SettingsService {
  private cachedSettings: AppSettings = { ...defaultSettings };
  private loadPromise: Promise<void> | null = null;
  private windowManager: WindowManager | null = null;
  // Serializes updateSettings calls: the read-modify-write over the cache plus
  // the file save must not interleave when two windows save concurrently.
  private updateQueue = new SerialQueue();

  setWindowManager(windowManager: WindowManager): void {
    logger.info("[service:settings] setWindowManager called");
    this.windowManager = windowManager;
  }

  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      logger.info("[service:settings] ensureLoaded: loading settings.json");
      await app.whenReady();
      const file = this.getSettingsPath();
      try {
        const content = await fs.readFile(file, "utf-8");
        const raw = JSON.parse(content) as Record<string, unknown>;
        this.cachedSettings = { ...defaultSettings, ...sanitizeSettings(raw) };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          logger.info("[service:settings] no settings.json found, using defaults");
        } else {
          // Never silently discard user preferences: keep the unreadable file
          // around for manual recovery instead of overwriting it with defaults.
          logger.error("[service:settings] settings.json unreadable, backing it up and using defaults", error);
          if (!(await backupCorruptFile(file))) {
            // Loud failure: the corrupt file stays in place and the next save
            // overwrites it — the recovery copy was NOT preserved.
            logger.error("[service:settings] failed to back up corrupt settings.json — next save may overwrite it");
          }
        }
        this.cachedSettings = { ...defaultSettings };
      }

      // Separate try blocks: a failure loading CUSTOM themes must not skip
      // applying the persisted active theme — a built-in themeId still applies
      // fine, and skipping it would leave the cache claiming theme X while the
      // windows render the default.
      try {
        await themeService.ensureLoaded();
      } catch (error) {
        logger.error("[service:settings] failed to load custom themes, continuing with built-ins", error);
      }
      try {
        themeService.setActiveTheme(this.cachedSettings.themeId);
      } catch (error) {
        logger.error("[service:settings] failed to apply active theme, falling back to default", error);
      }
      // Guarded like the blocks around it: a throw anywhere in this IIFE would
      // be cached in loadPromise and permanently reject every later
      // getSettings/updateSettings for the session.
      try {
        i18nService.setLocale(this.cachedSettings.locale);
        systemService.setNotificationsEnabled(this.cachedSettings.enableNotifications);
        trayService.setMinimizeToTray(this.cachedSettings.minimizeToTray);
      } catch (error) {
        logger.error("[service:settings] failed to apply loaded settings to services", error);
      }
      try {
        const currentAutoLaunch = systemService.getAutoLaunchEnabled();
        if (currentAutoLaunch !== this.cachedSettings.autoLaunch) {
          logger.info(
            `[service:settings] autoLaunch mismatch, system=${currentAutoLaunch}, saved=${this.cachedSettings.autoLaunch}, syncing`
          );
          systemService.setAutoLaunch(this.cachedSettings.autoLaunch);
        } else {
          logger.debug(`[service:settings] autoLaunch already in sync (${this.cachedSettings.autoLaunch})`);
        }
      } catch (error) {
        logger.error("[service:settings] failed to sync autoLaunch to system during startup", error);
      }
    })();

    return this.loadPromise;
  }

  async getSettings(): Promise<AppSettings> {
    logger.debug("[service:settings] getSettings called");
    await this.ensureLoaded();
    // Read through the queue: an in-flight updateSettings mutates the cache
    // optimistically and rolls back on save failure — a raw read in that
    // window would expose values that never actually persisted.
    return this.updateQueue.run(async () => ({ ...this.cachedSettings }));
  }

  async updateSettings(rawSettings: Partial<AppSettings>): Promise<AppSettings> {
    logger.info(`[service:settings] updateSettings called (keys: ${Object.keys(rawSettings ?? {}).join(",")})`);
    await this.ensureLoaded();

    return this.updateQueue.run(async () => {
      const settings = sanitizeSettings(rawSettings as Record<string, unknown>);
      // Mirror normalizeFontPreference below: never persist a themeId that
      // doesn't resolve — setActiveTheme silently falls back to default, so an
      // unchecked bogus id would leave disk/cache claiming a theme the windows
      // never render (reachable only via crafted IPC, not the picker).
      if (settings.themeId !== undefined) {
        await themeService.ensureLoaded();
        if (!themeService.getTheme(settings.themeId)) {
          logger.warn(`[service:settings] unknown themeId requested, falling back to default: ${settings.themeId}`);
          settings.themeId = DEFAULT_THEME_ID;
        }
      }
      const fontFamilyChanged =
        settings.fontFamily !== undefined && settings.fontFamily !== this.cachedSettings.fontFamily;
      if (fontFamilyChanged) {
        await fontService.listFonts({ forceRefresh: true });
      }
      const normalizedFont = await this.normalizeFontPreference(settings.fontFamily);

      const previousSettings = { ...this.cachedSettings };
      this.cachedSettings = {
        ...this.cachedSettings,
        ...settings,
        ...(normalizedFont ? { fontFamily: normalizedFont } : {}),
      };
      try {
        await this.saveSettings();
      } catch (error) {
        this.cachedSettings = previousSettings;
        logger.error("[service:settings] failed to save settings", error);
        throw new Error("Failed to save settings", { cause: error });
      }

      // The new settings are already persisted at this point: a side-effect
      // failure must not reject the update or skip the broadcast, or every
      // window would keep stale state while disk holds the new values.
      try {
        this.applySideEffects(settings, previousSettings);
      } catch (error) {
        logger.error("[service:settings] side effect failed after save, broadcasting anyway", error);
      }
      this.broadcastSettings();
      return { ...this.cachedSettings };
    });
  }

  private applySideEffects(settings: Partial<AppSettings>, previousSettings: AppSettings): void {
    if (settings.enableNotifications !== undefined && settings.enableNotifications !== previousSettings.enableNotifications) {
      logger.info(
        `[service:settings] enableNotifications changed from ${previousSettings.enableNotifications} to ${settings.enableNotifications}`
      );
      systemService.setNotificationsEnabled(settings.enableNotifications);
    }
    if (settings.minimizeToTray !== undefined && settings.minimizeToTray !== previousSettings.minimizeToTray) {
      logger.info(
        `[service:settings] minimizeToTray changed from ${previousSettings.minimizeToTray} to ${settings.minimizeToTray}`
      );
      trayService.setMinimizeToTray(settings.minimizeToTray);
    }
    if (settings.autoLaunch !== undefined && settings.autoLaunch !== previousSettings.autoLaunch) {
      try {
        logger.info(
          `[service:settings] autoLaunch changed from ${previousSettings.autoLaunch} to ${settings.autoLaunch}`
        );
        systemService.setAutoLaunch(settings.autoLaunch);
      } catch (error) {
        logger.error("[service:settings] failed to sync autoLaunch to system", error);
      }
    }
    if (settings.themeId !== undefined && settings.themeId !== previousSettings.themeId) {
      themeService.setActiveTheme(settings.themeId);
    }
    if (settings.locale !== undefined && settings.locale !== previousSettings.locale) {
      i18nService.setLocale(settings.locale);
      trayService.rebuildMenu();
      // The native application menu (File/Edit/Help, macOS app menu) was built
      // with the previous locale — rebuild it so the menu bar switches language
      // without an app restart.
      if (this.windowManager) {
        buildAppMenu(this.windowManager);
      } else {
        logger.warn("[service:settings] locale changed but WindowManager not set; app menu not rebuilt");
      }
    }
  }

  private broadcastSettings(): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        logger.info(`[service:settings] send to window (id=${win.id}): ${IPC_CHANNELS.SETTINGS_UPDATED}`);
        win.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, this.cachedSettings);
      }
    });
  }

  private async saveSettings(): Promise<void> {
    await app.whenReady();
    // Atomic write: a crash mid-save can no longer truncate settings.json and
    // silently reset every preference on the next launch.
    await writeJsonAtomic(this.getSettingsPath(), this.cachedSettings);
  }

  private async normalizeFontPreference(fontPreference?: FontPreference): Promise<FontPreference | undefined> {
    if (!fontPreference) {
      return undefined;
    }
    if (fontPreference === SYSTEM_FONT_ID) {
      return SYSTEM_FONT_ID;
    }
    const font = await fontService.getFont(fontPreference);
    if (!font) {
      logger.warn("[service:settings] unknown font requested, falling back to system font", fontPreference);
      return SYSTEM_FONT_ID;
    }
    return font.id;
  }

  private getSettingsPath(): string {
    return path.join(app.getPath("userData"), "settings.json");
  }
}

export const settingsService = new SettingsService();
