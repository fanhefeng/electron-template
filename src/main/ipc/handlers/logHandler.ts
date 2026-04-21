import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import type { RendererLogEntry } from "../../../shared/logTypes";
import { logger } from "../../services/logger-service";

export const registerLogHandler = (): void => {
  ipcMain.on(IPC_CHANNELS.LOG_FROM_RENDERER, (_event, entry: RendererLogEntry) => {
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
