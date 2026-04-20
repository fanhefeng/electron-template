import type { IpcMainInvokeEvent } from "electron";
import { app } from "electron";

export const getAppVersion = async (_event: IpcMainInvokeEvent): Promise<string> => {
  return app.getVersion();
};
