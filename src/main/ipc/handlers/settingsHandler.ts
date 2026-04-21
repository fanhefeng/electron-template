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
      const parsed = JSON.parse(content) as Partial<AppSettings>;
      cachedSettings = {
        ...defaultSettings,
        ...parsed,
      };
    } catch {
      cachedSettings = { ...defaultSettings };
    }
    themeService.setTheme(cachedSettings.theme);
    i18nService.setLocale(cachedSettings.locale);
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
  if (settings.fontFamily) {
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
  if (settings.theme !== undefined) {
    themeService.setTheme(settings.theme);
  }
  if (settings.locale !== undefined) {
    i18nService.setLocale(settings.locale);
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
