import { contextBridge, ipcRenderer } from "electron";
import type { ProgressInfo } from "electron-updater";
import type { OpenWindowPayload } from "../shared/ipcChannels";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { DeepLinkPayload } from "../shared/deepLink";
import { initializeAppearanceBridge } from "./appearanceBridge";
import { initializeLogBridge } from "./logBridge";

initializeLogBridge("renderer:main");
initializeAppearanceBridge();

contextBridge.exposeInMainWorld("electronAPI", {
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
  applyUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APPLY_UPDATE),
  openWindow: (windowName: OpenWindowPayload) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_WINDOW, windowName),
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, callback),
  offUpdateAvailable: (callback: () => void) => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, callback),
  onUpdateNotAvailable: (callback: () => void) => ipcRenderer.on(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, callback),
  offUpdateNotAvailable: (callback: () => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, callback),
  onUpdateError: (callback: (_event: Electron.IpcRendererEvent, message: string) => void) =>
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, callback),
  offUpdateError: (callback: (_event: Electron.IpcRendererEvent, message: string) => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_ERROR, callback),
  onUpdateDownloadPending: (callback: () => void) => ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOAD_PENDING, callback),
  offUpdateDownloadPending: (callback: () => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOAD_PENDING, callback),
  onUpdateDownloadProgress: (callback: (_event: Electron.IpcRendererEvent, progress: ProgressInfo) => void) =>
    ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOAD_PROGRESS, callback),
  offUpdateDownloadProgress: (callback: (_event: Electron.IpcRendererEvent, progress: ProgressInfo) => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOAD_PROGRESS, callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOADED, callback),
  offUpdateDownloaded: (callback: () => void) => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOADED, callback),
  onDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.on(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
  offDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
});
