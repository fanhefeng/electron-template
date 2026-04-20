import { contextBridge, ipcRenderer } from "electron";
import type { ProgressInfo } from "electron-updater";
import type { OpenWindowPayload } from "../shared/ipcChannels";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { DeepLinkPayload } from "../shared/deepLink";
import { initializeAppearanceBridge } from "./appearanceBridge";

initializeAppearanceBridge();

contextBridge.exposeInMainWorld("electronAPI", {
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
  applyUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APPLY_UPDATE),
  openWindow: (windowName: OpenWindowPayload) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_WINDOW, windowName),
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on("update-available", callback),
  offUpdateAvailable: (callback: () => void) => ipcRenderer.removeListener("update-available", callback),
  onUpdateNotAvailable: (callback: () => void) => ipcRenderer.on("update-not-available", callback),
  offUpdateNotAvailable: (callback: () => void) => ipcRenderer.removeListener("update-not-available", callback),
  onUpdateError: (callback: (_event: Electron.IpcRendererEvent, message: string) => void) =>
    ipcRenderer.on("update-error", callback),
  offUpdateError: (callback: (_event: Electron.IpcRendererEvent, message: string) => void) =>
    ipcRenderer.removeListener("update-error", callback),
  onUpdateDownloadPending: (callback: () => void) => ipcRenderer.on("update-download-pending", callback),
  offUpdateDownloadPending: (callback: () => void) => ipcRenderer.removeListener("update-download-pending", callback),
  onUpdateDownloadProgress: (callback: (_event: Electron.IpcRendererEvent, progress: ProgressInfo) => void) =>
    ipcRenderer.on("update-download-progress", callback),
  offUpdateDownloadProgress: (callback: (_event: Electron.IpcRendererEvent, progress: ProgressInfo) => void) =>
    ipcRenderer.removeListener("update-download-progress", callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on("update-downloaded", callback),
  offUpdateDownloaded: (callback: () => void) => ipcRenderer.removeListener("update-downloaded", callback),
  onDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.on(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
  offDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
});
