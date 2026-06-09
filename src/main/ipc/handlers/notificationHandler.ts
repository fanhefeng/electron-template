import type { IpcMainInvokeEvent } from "electron";
import type { NotificationPayload } from "../../../shared/notification";
import { systemService } from "../../services/system-service";

export const isNotificationPayload = (value: unknown): value is NotificationPayload => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as NotificationPayload;
  // Require non-blank strings: an all-whitespace title/body would fire an
  // empty OS notification bubble.
  return (
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.body === "string" &&
    candidate.body.trim().length > 0
  );
};

export const showNotification = async (_event: IpcMainInvokeEvent, payload: NotificationPayload): Promise<void> => {
  systemService.showNotification(payload.title, payload.body);
};
