import type { IpcMainInvokeEvent } from "electron";
import { BrowserWindow } from "electron";
import { updateService } from "../../services/update-service";
import type { SystemService } from "../../services/system-service";
import type { UpdateStateSnapshot } from "../../../shared/update";

export const checkForUpdates = async (event: IpcMainInvokeEvent): Promise<void> => {
  const window = BrowserWindow.fromWebContents(event.sender);
  updateService.checkForUpdates(window ?? undefined);
};

export const applyUpdate = async (_event: IpcMainInvokeEvent): Promise<void> => {
  updateService.applyUpdate();
};

export const getUpdateState = async (_event: IpcMainInvokeEvent): Promise<UpdateStateSnapshot> => {
  return updateService.getState();
};

export const registerUpdaterListeners = (browserWindow: BrowserWindow, systemService?: SystemService): void => {
  updateService.registerListeners(browserWindow, systemService);
};
