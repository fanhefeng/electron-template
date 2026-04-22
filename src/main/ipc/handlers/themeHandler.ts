import type { IpcMainInvokeEvent } from "electron";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "../../../shared/theme";
import { themeService } from "../../services/theme-service";

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
  return themeService.deleteTheme(id);
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
