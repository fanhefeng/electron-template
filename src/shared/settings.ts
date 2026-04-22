import { SYSTEM_FONT_ID } from "./fonts";
import type { LocalePreference } from "./locales";
import type { ThemeId } from "./theme";

export type FontPreference = typeof SYSTEM_FONT_ID | string;

export interface AppSettings {
  themeId: ThemeId;
  autoLaunch: boolean;
  enableNotifications: boolean;
  minimizeToTray: boolean;
  fontFamily: FontPreference;
  locale: LocalePreference;
}

export const defaultSettings: AppSettings = {
  themeId: "builtin-light",
  autoLaunch: false,
  enableNotifications: true,
  minimizeToTray: false,
  fontFamily: SYSTEM_FONT_ID,
  locale: "system",
};

const VALID_LOCALES: readonly AppSettings["locale"][] = ["system", "en", "zh-CN"];

const THEME_MIGRATION_MAP: Record<string, ThemeId> = {
  light: "builtin-light",
  dark: "builtin-dark",
};

/** Strip unknown keys and validate known values from an untrusted Partial<AppSettings>. */
export const sanitizeSettings = (raw: Record<string, unknown>): Partial<AppSettings> => {
  const result: Partial<AppSettings> = {};

  if ("themeId" in raw && typeof raw.themeId === "string" && raw.themeId.length > 0) {
    result.themeId = raw.themeId;
  } else if ("theme" in raw && typeof raw.theme === "string") {
    const mapped = THEME_MIGRATION_MAP[raw.theme];
    if (mapped) {
      result.themeId = mapped;
    }
  }

  if ("autoLaunch" in raw && typeof raw.autoLaunch === "boolean") {
    result.autoLaunch = raw.autoLaunch;
  }
  if ("enableNotifications" in raw && typeof raw.enableNotifications === "boolean") {
    result.enableNotifications = raw.enableNotifications;
  }
  if ("minimizeToTray" in raw && typeof raw.minimizeToTray === "boolean") {
    result.minimizeToTray = raw.minimizeToTray;
  }
  if ("fontFamily" in raw && typeof raw.fontFamily === "string" && raw.fontFamily.length > 0) {
    result.fontFamily = raw.fontFamily;
  }
  if ("locale" in raw && VALID_LOCALES.includes(raw.locale as AppSettings["locale"])) {
    result.locale = raw.locale as AppSettings["locale"];
  }

  return result;
};
