import { contextBridge, ipcRenderer } from 'electron';
import type { ProgressInfo } from 'electron-updater';
import { IPC_CHANNELS, OpenWindowPayload } from '../shared/ipcChannels';
import { initializeAppearanceBridge } from './appearanceBridge';

initializeAppearanceBridge();

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
  applyUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APPLY_UPDATE),
  openWindow: (windowName: OpenWindowPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_WINDOW, windowName),
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback: () => void) =>
    ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback: (_event: Electron.IpcRendererEvent, message: string) => void) =>
    ipcRenderer.on('update-error', callback),
  onUpdateDownloadPending: (callback: () => void) =>
    ipcRenderer.on('update-download-pending', callback),
  onUpdateDownloadProgress: (
    callback: (_event: Electron.IpcRendererEvent, progress: ProgressInfo) => void
  ) => ipcRenderer.on('update-download-progress', callback),
  onUpdateDownloaded: (callback: () => void) =>
    ipcRenderer.on('update-downloaded', callback)
});
