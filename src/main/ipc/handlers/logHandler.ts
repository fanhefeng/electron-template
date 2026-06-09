import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import type { RendererLogEntry, RendererLogLevel } from "../../../shared/logTypes";
import { logger } from "../../services/logger-service";

const VALID_LOG_LEVELS: readonly RendererLogLevel[] = ["info", "warn", "error", "debug"];

// The renderer log channel is fire-and-forget with no schema-level size limit;
// cap each field so a buggy (or compromised) renderer cannot bloat main.log
// with multi-MB strings (the invoke path caps param summaries at 200 chars).
const MAX_SOURCE_LENGTH = 64;
const MAX_ACTION_LENGTH = 256;
const MAX_DETAILS_LENGTH = 4096;

// Mirror the invoke path's key-based redaction for free-form renderer strings:
// `window.log.info("auth", "token=abc")` must not write the secret verbatim.
// `.*` (not `\S+`) redacts to end-of-line: `\S+` would stop at the first space,
// leaking space-separated values like `authorization: Bearer <token>`. `.` never
// matches newline, so only the offending field is masked, not later log lines.
const SENSITIVE_VALUE_PATTERN = /\b(password|secret|token|apikey|authorization|credential)\b(\s*[=:]\s*).*/gi;
const scrub = (text: string): string => text.replace(SENSITIVE_VALUE_PATTERN, "$1$2[REDACTED]");

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
    const message = `[${entry.source.slice(0, MAX_SOURCE_LENGTH)}] ${scrub(entry.action.slice(0, MAX_ACTION_LENGTH))}${
      entry.details ? ": " + scrub(entry.details.slice(0, MAX_DETAILS_LENGTH)) : ""
    }`;

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
