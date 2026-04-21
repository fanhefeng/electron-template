import { nativeTheme } from "electron";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

export type ThemePreference = "system" | "light" | "dark";

const VALID_THEMES: readonly ThemePreference[] = ["system", "light", "dark"];

const toThemePreference = (value: string): ThemePreference =>
  VALID_THEMES.includes(value as ThemePreference) ? (value as ThemePreference) : "system";

export class ThemeService {
  private preference: ThemePreference = toThemePreference(nativeTheme.themeSource);

  setTheme(preference: ThemePreference): void {
    this.preference = preference;
    nativeTheme.themeSource = preference;
    logger.info(`[service:theme] setTheme: ${preference}`);
  }

  getTheme(): ThemePreference {
    return toThemePreference(nativeTheme.themeSource);
  }

  isDark(): boolean {
    return nativeTheme.shouldUseDarkColors;
  }

  getThemeResourcesPath(theme: ThemePreference = this.preference): string {
    const target = theme === "system" ? (this.isDark() ? "dark" : "light") : theme;
    return resourceService.getThemePath(target);
  }
}

export const themeService = new ThemeService();
