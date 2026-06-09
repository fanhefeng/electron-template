import type { IpcMainInvokeEvent } from "electron";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "../../../shared/theme";
import { validateTheme, validateThemeData } from "../../../shared/theme";
import { DEFAULT_THEME_ID } from "../../../shared/themes";
import { themeService } from "../../services/theme-service";
import { settingsService } from "../../services/settings-service";

/** Runtime guard for the theme/create payload (renderer input is untrusted). */
export const isThemeCreatePayload = (value: unknown): value is Omit<ThemeDefinition, "id" | "builtIn"> =>
  validateThemeData(value);

/** Runtime guard for bare ThemeId payloads (theme/get | theme/delete | theme/export). */
export const isThemeIdPayload = (value: unknown): value is ThemeId => typeof value === "string" && value.length > 0;

/**
 * Runtime guard for theme/import: the imported JSON must be a full, valid theme
 * — the same check ThemeService.importTheme runs — so a malformed file is
 * rejected (and logged) at the IPC boundary like every other theme endpoint,
 * instead of being the lone endpoint that defers all validation to the service.
 */
export const isThemeImportPayload = (value: unknown): value is ThemeDefinition => validateTheme(value);

/** Runtime guard for the theme/update payload shape; deep validation happens in ThemeService. */
export const isThemeUpdatePayload = (value: unknown): value is { id: ThemeId; patch: Partial<ThemeDefinition> } => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { id?: unknown; patch?: unknown };
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.patch === "object" &&
    candidate.patch !== null
  );
};

export const listThemes = async (_event: IpcMainInvokeEvent): Promise<ThemeDefinition[]> => {
  await themeService.ensureLoaded();
  return themeService.listThemes();
};

export const getTheme = async (_event: IpcMainInvokeEvent, id: ThemeId): Promise<ThemeDefinition | null> => {
  await themeService.ensureLoaded();
  return themeService.getTheme(id);
};

export const createTheme = async (
  _event: IpcMainInvokeEvent,
  data: Omit<ThemeDefinition, "id" | "builtIn">
): Promise<ThemeDefinition> => {
  await themeService.ensureLoaded();
  return themeService.createTheme(data);
};

export const updateTheme = async (
  _event: IpcMainInvokeEvent,
  payload: { id: ThemeId; patch: Partial<ThemeDefinition> }
): Promise<ThemeDefinition> => {
  await themeService.ensureLoaded();
  return themeService.updateTheme(payload.id, payload.patch);
};

export const deleteTheme = async (_event: IpcMainInvokeEvent, id: ThemeId): Promise<void> => {
  await themeService.ensureLoaded();
  const wasActive = themeService.getActiveTheme().id === id;
  await themeService.deleteTheme(id);
  // Cross-service reconciliation (kept here to avoid a theme→settings service
  // cycle; SettingsService already depends on ThemeService): deleteTheme resets
  // the in-memory active theme to default, but settings.json would otherwise
  // keep pointing at the deleted id — a dangling reference on disk that pickers
  // render as "nothing selected" after restart. updateSettings persists the
  // reset and broadcasts settings:updated so every window's UI follows.
  if (wasActive) {
    await settingsService.updateSettings({ themeId: DEFAULT_THEME_ID });
  }
};

export const importTheme = async (_event: IpcMainInvokeEvent, raw: unknown): Promise<ThemeDefinition> => {
  await themeService.ensureLoaded();
  return themeService.importTheme(raw);
};

export const exportTheme = async (_event: IpcMainInvokeEvent, id: ThemeId): Promise<ExportedTheme> => {
  await themeService.ensureLoaded();
  return themeService.exportTheme(id);
};

export const getActiveTheme = async (_event: IpcMainInvokeEvent): Promise<ThemeDefinition> => {
  await themeService.ensureLoaded();
  return themeService.getActiveTheme();
};
