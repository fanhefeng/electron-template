import type { IpcMainInvokeEvent } from "electron";
import type { NotificationPayload } from "../../../shared/notification";
import { systemService } from "../../services/system-service";

export const isNotificationPayload = (value: unknown): value is NotificationPayload =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as NotificationPayload).title === "string" &&
  typeof (value as NotificationPayload).body === "string";

export const showNotification = async (_event: IpcMainInvokeEvent, payload: NotificationPayload): Promise<void> => {
  systemService.showNotification(payload.title, payload.body);
};
