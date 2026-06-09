import { ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import type { IpcChannel, IpcContract } from "../../shared/ipc/schema";
import { logger } from "../services/logger-service";

const SENSITIVE_KEYS = /password|secret|token|apikey|authorization|credential/i;
// Depth cap keeps redaction cheap and cycle-safe; payloads deeper than this are
// truncated by the 200-char summary limit anyway.
const MAX_REDACT_DEPTH = 4;

function redact(value: unknown, depth = 0): unknown {
  if (typeof value !== "object" || value === null) return value;
  // REPLACE (never pass through) objects beyond the cap: a sensitive key nested
  // deeper than we walk must not reach the log verbatim.
  if (depth >= MAX_REDACT_DEPTH) return "[MaxDepth]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  // Recurse so sensitive keys NESTED inside a payload (e.g. { patch: { token } })
  // are redacted too, not just top-level keys.
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      SENSITIVE_KEYS.test(k) ? [k, "[REDACTED]"] : [k, redact(v, depth + 1)]
    )
  );
}

function summarize(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    const json = JSON.stringify(redact(value));
    return json.length > 200 ? json.slice(0, 200) + "..." : json;
  } catch {
    // Never fall back to the raw value: redaction must hold even when
    // JSON.stringify fails (e.g. a BigInt field).
    return "[Unserializable]";
  }
}

// NOTE: there is deliberately no log-less `handleTyped` variant — CLAUDE.md
// mandates the WithLogging registration path for every endpoint.
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
