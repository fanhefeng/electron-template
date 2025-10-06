import { ipcMain } from 'electron';
import { IPC_CHANNELS, OpenWindowPayload } from '../../../shared/ipcChannels';
import { checkForUpdates, applyUpdate } from './updaterHandler';
import { getSettings, updateSettings } from './settingsHandler';
import { listFonts } from './fontHandler';
import { getAppVersion } from './appHandler';
import type { WindowManager } from '../../window-manager/WindowManager';

export const registerIpcHandlers = (windowManager: WindowManager): void => {
  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, checkForUpdates);
  ipcMain.handle(IPC_CHANNELS.APPLY_UPDATE, applyUpdate);
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, getSettings);
  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, updateSettings);
  ipcMain.handle(IPC_CHANNELS.LIST_FONTS, listFonts);
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, getAppVersion);
  ipcMain.handle(IPC_CHANNELS.OPEN_WINDOW, (_event, payload: OpenWindowPayload) => {
    windowManager.open(payload);
  });
};
