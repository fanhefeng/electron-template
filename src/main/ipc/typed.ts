import { ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import type { IpcChannel, IpcContract } from "../../shared/ipc/schema";
import { logger } from "../services/logger-service";

const SENSITIVE_KEYS = /password|secret|token|apikey|authorization|credential/i;

function summarize(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    const redacted =
      typeof value === "object" && value !== null
        ? Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) =>
              SENSITIVE_KEYS.test(k) ? [k, "[REDACTED]"] : [k, v]
            )
          )
        : value;
    const json = JSON.stringify(redacted);
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
  ) => Promise<IpcContract[C]["res"]> | IpcContract[C]["res"],
  validate?: (payload: unknown) => payload is IpcContract[C]["req"]
): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, payload: unknown) => {
    if (validate && !validate(payload)) {
      logger.warn(`[ipc] invalid payload rejected for ${channel}`);
      throw new Error(`Invalid payload for IPC channel: ${channel}`);
    }
    return handler(event, payload as IpcContract[C]["req"]);
  });
}

export function handleTypedWithLogging<C extends IpcChannel>(
  channel: C,
  handler: (
    event: IpcMainInvokeEvent,
    payload: IpcContract[C]["req"]
  ) => Promise<IpcContract[C]["res"]> | IpcContract[C]["res"],
  validate?: (payload: unknown) => payload is IpcContract[C]["req"]
): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: unknown) => {
    if (validate && !validate(payload)) {
      logger.warn(`[ipc] invalid payload rejected for ${channel}`);
      throw new Error(`Invalid payload for IPC channel: ${channel}`);
    }
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
