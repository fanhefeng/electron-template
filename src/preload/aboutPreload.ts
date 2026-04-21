import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import { initializeAppearanceBridge } from "./appearanceBridge";
import { initializeLogBridge } from "./logBridge";

initializeLogBridge("renderer:about");
initializeAppearanceBridge();

contextBridge.exposeInMainWorld("aboutAPI", {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION) as Promise<string>,
  getNodeVersion: () => process.versions.node,
  getElectronVersion: () => process.versions.electron,
  getChromeVersion: () => process.versions.chrome,
});
