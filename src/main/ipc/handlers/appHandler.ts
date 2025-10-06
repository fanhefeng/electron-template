import { app, IpcMainInvokeEvent } from 'electron';

export const getAppVersion = async (_event: IpcMainInvokeEvent): Promise<string> => {
  return app.getVersion();
};
