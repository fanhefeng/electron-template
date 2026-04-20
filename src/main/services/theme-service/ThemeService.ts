import { nativeTheme } from "electron";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

export type ThemePreference = "system" | "light" | "dark";

export class ThemeService {
  private preference: ThemePreference = nativeTheme.themeSource as ThemePreference;

  setTheme(preference: ThemePreference): void {
    this.preference = preference;
    nativeTheme.themeSource = preference;
    logger.info("Theme updated", preference);
  }

  getTheme(): ThemePreference {
    return nativeTheme.themeSource as ThemePreference;
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
