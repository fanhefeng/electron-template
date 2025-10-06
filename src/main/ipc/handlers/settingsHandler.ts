import { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { SYSTEM_FONT_ID } from '../../../shared/fonts';
import { AppSettings, defaultSettings, FontPreference } from '../../../shared/settings';
import { logger } from '../../services/logger-service';
import { fontService } from '../../services/font-service';

let cachedSettings: AppSettings = { ...defaultSettings };

export const getSettings = async (_event: IpcMainInvokeEvent): Promise<AppSettings> => {
  logger.info('IPC: get settings');
  return cachedSettings;
};

export const updateSettings = async (
  _event: IpcMainInvokeEvent,
  settings: Partial<AppSettings>
): Promise<AppSettings> => {
  logger.info('IPC: update settings', settings);
  if (settings.fontFamily) {
    await fontService.listFonts({ forceRefresh: true });
  }
  const normalizedFont = await normalizeFontPreference(settings.fontFamily);

  cachedSettings = {
    ...cachedSettings,
    ...settings,
    ...(normalizedFont ? { fontFamily: normalizedFont } : {})
  };
  BrowserWindow.getAllWindows().forEach((window) => {
    logger.info(`Send to window ${window}: settings:updated ->`, cachedSettings);
    window.webContents.send('settings:updated', cachedSettings);
  });

  return cachedSettings;
};

const normalizeFontPreference = async (
  fontPreference?: FontPreference
): Promise<FontPreference | undefined> => {
  if (!fontPreference) {
    return undefined;
  }

  if (fontPreference === SYSTEM_FONT_ID) {
    return SYSTEM_FONT_ID;
  }

  const font = await fontService.getFont(fontPreference);

  if (!font) {
    logger.warn('Unknown font requested, falling back to system font', fontPreference);
    return SYSTEM_FONT_ID;
  }
  return font.id;
};
