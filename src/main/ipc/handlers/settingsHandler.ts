import type { IpcMainInvokeEvent } from "electron";
import { app, BrowserWindow } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import { SYSTEM_FONT_ID } from "../../../shared/fonts";
import type { AppSettings, FontPreference } from "../../../shared/settings";
import { defaultSettings, sanitizeSettings } from "../../../shared/settings";
import { logger } from "../../services/logger-service";
import { fontService } from "../../services/font-service";
import { i18nService } from "../../services/i18n-service";
import { themeService } from "../../services/theme-service";
import { systemService } from "../../services/system-service";
import { trayService } from "../../services/tray-service";

let cachedSettings: AppSettings = { ...defaultSettings };
let loadPromise: Promise<void> | null = null;

const getSettingsPath = (): string => {
  return path.join(app.getPath("userData"), "settings.json");
};

export const ensureLoaded = (): Promise<void> => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await app.whenReady();
    try {
      const file = getSettingsPath();
      const content = await fs.readFile(file, "utf-8");
      const raw = JSON.parse(content) as Record<string, unknown>;
      const parsed = sanitizeSettings(raw);
      cachedSettings = {
        ...defaultSettings,
        ...parsed,
      };
    } catch {
      cachedSettings = { ...defaultSettings };
    }
    try {
      await themeService.ensureLoaded();
      themeService.setActiveTheme(cachedSettings.themeId);
    } catch (error) {
      logger.error("Failed to initialize theme service, continuing with default theme", error);
    }
    i18nService.setLocale(cachedSettings.locale);
    systemService.setNotificationsEnabled(cachedSettings.enableNotifications);
    trayService.setMinimizeToTray(cachedSettings.minimizeToTray);
    try {
      const currentAutoLaunch = systemService.getAutoLaunchEnabled();
      if (currentAutoLaunch !== cachedSettings.autoLaunch) {
        logger.info(
          `Settings: autoLaunch mismatch, system=${currentAutoLaunch}, saved=${cachedSettings.autoLaunch}, syncing`
        );
        systemService.setAutoLaunch(cachedSettings.autoLaunch);
      } else {
        logger.debug(`Settings: autoLaunch already in sync (${cachedSettings.autoLaunch})`);
      }
    } catch (error) {
      logger.error("Failed to sync autoLaunch to system during startup", error);
    }
  })();

  return loadPromise;
};

const saveSettings = async (): Promise<void> => {
  await app.whenReady();
  const file = getSettingsPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(cachedSettings, null, 2), "utf-8");
};

export const getSettings = async (_event: IpcMainInvokeEvent): Promise<AppSettings> => {
  await ensureLoaded();
  return cachedSettings;
};

export const updateSettings = async (
  _event: IpcMainInvokeEvent,
  rawSettings: Partial<AppSettings>
): Promise<AppSettings> => {
  await ensureLoaded();
  const settings = sanitizeSettings(rawSettings as Record<string, unknown>);
  const fontFamilyChanged = settings.fontFamily !== undefined && settings.fontFamily !== cachedSettings.fontFamily;
  if (fontFamilyChanged) {
    await fontService.listFonts({ forceRefresh: true });
  }
  const normalizedFont = await normalizeFontPreference(settings.fontFamily);

  const previousSettings = { ...cachedSettings };
  cachedSettings = {
    ...cachedSettings,
    ...settings,
    ...(normalizedFont ? { fontFamily: normalizedFont } : {}),
  };
  try {
    await saveSettings();
  } catch (error) {
    cachedSettings = previousSettings;
    logger.error("Failed to save settings", error);
    throw new Error("Failed to save settings", { cause: error });
  }
  if (
    settings.enableNotifications !== undefined &&
    settings.enableNotifications !== previousSettings.enableNotifications
  ) {
    logger.info(
      `Settings: enableNotifications changed from ${previousSettings.enableNotifications} to ${settings.enableNotifications}`
    );
    systemService.setNotificationsEnabled(settings.enableNotifications);
  }
  if (settings.minimizeToTray !== undefined && settings.minimizeToTray !== previousSettings.minimizeToTray) {
    logger.info(
      `Settings: minimizeToTray changed from ${previousSettings.minimizeToTray} to ${settings.minimizeToTray}`
    );
    trayService.setMinimizeToTray(settings.minimizeToTray);
  }
  if (settings.autoLaunch !== undefined && settings.autoLaunch !== previousSettings.autoLaunch) {
    try {
      logger.info(`Settings: autoLaunch changed from ${previousSettings.autoLaunch} to ${settings.autoLaunch}`);
      systemService.setAutoLaunch(settings.autoLaunch);
    } catch (error) {
      logger.error("Failed to sync autoLaunch to system", error);
    }
  }
  if (settings.themeId !== undefined && settings.themeId !== previousSettings.themeId) {
    themeService.setActiveTheme(settings.themeId);
  }
  if (settings.locale !== undefined && settings.locale !== previousSettings.locale) {
    i18nService.setLocale(settings.locale);
    trayService.rebuildMenu();
  }
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      logger.info(`Send to window (id=${win.id}): ${IPC_CHANNELS.SETTINGS_UPDATED}`);
      win.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, cachedSettings);
    }
  });

  return cachedSettings;
};

const normalizeFontPreference = async (fontPreference?: FontPreference): Promise<FontPreference | undefined> => {
  if (!fontPreference) {
    return undefined;
  }

  if (fontPreference === SYSTEM_FONT_ID) {
    return SYSTEM_FONT_ID;
  }

  const font = await fontService.getFont(fontPreference);

  if (!font) {
    logger.warn("Unknown font requested, falling back to system font", fontPreference);
    return SYSTEM_FONT_ID;
  }
  return font.id;
};
