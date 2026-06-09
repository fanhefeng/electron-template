import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { DeepLinkPayload } from "../shared/deepLink";
import { initializeCommonBridges } from "./commonBridges";

initializeCommonBridges("renderer:about");

contextBridge.exposeInMainWorld("aboutAPI", {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION) as Promise<string>,
  getNodeVersion: () => process.versions.node,
  getElectronVersion: () => process.versions.electron,
  getChromeVersion: () => process.versions.chrome,
  // Deep links can target this window (electrontemplate://about/...); the
  // push + pull pair mirrors mainPreload so cold-start payloads aren't dropped.
  onDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.on(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
  offDeepLink: (callback: (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) => void) =>
    ipcRenderer.removeListener(IPC_CHANNELS.DEEP_LINK_NAVIGATE, callback),
  consumePendingDeepLink: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEEP_LINK_CONSUME_PENDING) as Promise<DeepLinkPayload | null>,
});
