import { ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import type { IpcChannel, IpcContract } from "../../shared/ipc/schema";
import { logger } from "../services/logger-service";

function summarize(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    const json = JSON.stringify(value);
    return json.length > 200 ? json.slice(0, 200) + "..." : json;
  } catch {
    return String(value);
  }
}

export function handleTyped<C extends IpcChannel>(
  channel: C,
  handler: (
    event: IpcMainInvokeEvent,
    payload: IpcContract[C]["req"]
  ) => Promise<IpcContract[C]["res"]> | IpcContract[C]["res"]
): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, payload: unknown) => {
    return handler(event, payload as IpcContract[C]["req"]);
  });
}

export function handleTypedWithLogging<C extends IpcChannel>(
  channel: C,
  handler: (
    event: IpcMainInvokeEvent,
    payload: IpcContract[C]["req"]
  ) => Promise<IpcContract[C]["res"]> | IpcContract[C]["res"]
): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: unknown) => {
    const paramSummary = summarize(payload);
    logger.info(`[ipc] invoke: ${channel}${paramSummary ? " " + paramSummary : ""}`);
    const start = Date.now();

    try {
      const result = await handler(event, payload as IpcContract[C]["req"]);
      const elapsed = Date.now() - start;
      logger.info(`[ipc] result: ${channel} (${elapsed}ms)`);
      return result;
    } catch (error) {
      const elapsed = Date.now() - start;
      logger.error(`[ipc] error: ${channel} (${elapsed}ms)`, error);
      throw error;
    }
  });
}
