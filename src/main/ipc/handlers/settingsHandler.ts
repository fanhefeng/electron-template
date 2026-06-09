import type { IpcMainInvokeEvent } from "electron";
import type { AppSettings } from "../../../shared/settings";
import { settingsService } from "../../services/settings-service";

/**
 * Runtime guard for settings/update: the patch must be a plain object so a
 * malformed payload is rejected (and logged) at the IPC boundary like every
 * other guarded channel. Per-key whitelisting still happens in
 * SettingsService.sanitizeSettings — this only enforces the outer shape.
 */
export const isPartialSettings = (value: unknown): value is Partial<AppSettings> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getSettings = async (_event: IpcMainInvokeEvent): Promise<AppSettings> => {
  return settingsService.getSettings();
};

export const updateSettings = async (
  _event: IpcMainInvokeEvent,
  rawSettings: Partial<AppSettings>
): Promise<AppSettings> => {
  return settingsService.updateSettings(rawSettings);
};
