import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import type { AppSettings } from '../shared/settings';
import type { FontAsset } from '../shared/fonts';
import { initializeAppearanceBridge } from './appearanceBridge';

initializeAppearanceBridge();

contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () =>
    (ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS) as Promise<AppSettings>),
  updateSettings: (settings: Partial<AppSettings>) =>
    (ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings) as Promise<AppSettings>),
  getAvailableFonts: () =>
    (ipcRenderer.invoke(IPC_CHANNELS.LIST_FONTS) as Promise<FontAsset[]>)
});
