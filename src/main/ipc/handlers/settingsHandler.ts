import type { IpcMainInvokeEvent } from "electron";
import { app, BrowserWindow } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SYSTEM_FONT_ID } from "../../../shared/fonts";
import type { AppSettings, FontPreference } from "../../../shared/settings";
import { defaultSettings } from "../../../shared/settings";
import { logger } from "../../services/logger-service";
import { fontService } from "../../services/font-service";

let cachedSettings: AppSettings = { ...defaultSettings };
let loadPromise: Promise<void> | null = null;

const getSettingsPath = (): string => {
  return path.join(app.getPath("userData"), "settings.json");
};

const ensureLoaded = (): Promise<void> => {
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
  logger.info("IPC: get settings");
  await ensureLoaded();
  return cachedSettings;
};

export const updateSettings = async (
  _event: IpcMainInvokeEvent,
  settings: Partial<AppSettings>
): Promise<AppSettings> => {
  logger.info("IPC: update settings", settings);
  await ensureLoaded();
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
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      logger.info(`Send to window (id=${win.id}): settings:updated`);
      win.webContents.send("settings:updated", cachedSettings);
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
