import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { AppSettings } from "../shared/settings";
import type { FontAsset } from "../shared/fonts";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "../shared/theme";
import type { DeepLinkPayload } from "../shared/deepLink";
import { initializeCommonBridges } from "./commonBridges";

initializeCommonBridges("renderer:settings");

contextBridge.exposeInMainWorld("settingsAPI", {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS) as Promise<AppSettings>,
  updateSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings) as Promise<AppSettings>,
  getAvailableFonts: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_FONTS) as Promise<FontAsset[]>,
  listThemes: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_THEMES) as Promise<ThemeDefinition[]>,
  // getTheme/getActiveTheme complete the theme CRUD surface; the shipped UI
  // doesn't call them yet (appearanceBridge reads GET_ACTIVE_THEME directly).
  getTheme: (id: ThemeId) => ipcRenderer.invoke(IPC_CHANNELS.GET_THEME, id) as Promise<ThemeDefinition | null>,
  getActiveTheme: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_THEME) as Promise<ThemeDefinition>,
  createTheme: (data: Omit<ThemeDefinition, "id" | "builtIn">) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_THEME, data) as Promise<ThemeDefinition>,
  updateTheme: (id: ThemeId, patch: Partial<ThemeDefinition>) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_THEME, { id, patch }) as Promise<ThemeDefinition>,
  deleteTheme: (id: ThemeId) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_THEME, id) as Promise<void>,
  importTheme: (raw: unknown) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_THEME, raw) as Promise<ThemeDefinition>,
  exportTheme: (id: ThemeId) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_THEME, id) as Promise<ExportedTheme>,
  // Deep links can target this window (electrontemplate://settings/...); the
  // push + pull pair mirrors mainPreload so cold-start payloads aren't dropped.
  onDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.on(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
  offDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
  consumePendingDeepLink: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEEP_LINK_CONSUME_PENDING) as Promise<DeepLinkPayload | null>,
});
