import type { IpcMainInvokeEvent } from "electron";
import { i18nService } from "../../services/i18n-service";

export const getI18nMessages = async (_event: IpcMainInvokeEvent): Promise<Record<string, string>> => {
  return i18nService.getMessages();
};
