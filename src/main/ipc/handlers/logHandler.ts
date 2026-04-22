import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import type { RendererLogEntry, RendererLogLevel } from "../../../shared/logTypes";
import { logger } from "../../services/logger-service";

const VALID_LOG_LEVELS: readonly RendererLogLevel[] = ["info", "warn", "error", "debug"];

const isRendererLogEntry = (value: unknown): value is RendererLogEntry => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.source === "string" &&
    typeof obj.action === "string" &&
    VALID_LOG_LEVELS.includes(obj.level as RendererLogLevel) &&
    (obj.details === undefined || typeof obj.details === "string")
  );
};

export const registerLogHandler = (): void => {
  ipcMain.on(IPC_CHANNELS.LOG_FROM_RENDERER, (_event, rawEntry: unknown) => {
    if (!isRendererLogEntry(rawEntry)) {
      logger.warn("[logHandler] Rejected invalid log entry from renderer");
      return;
    }
    const entry = rawEntry;
    const message = `[${entry.source}] ${entry.action}${entry.details ? ": " + entry.details : ""}`;

    switch (entry.level) {
      case "warn":
        logger.warn(message);
        break;
      case "error":
        logger.error(message);
        break;
      case "debug":
        logger.debug(message);
        break;
      default:
        logger.info(message);
    }
  });
};
