import { SYSTEM_FONT_ID } from "./fonts";
import type { LocalePreference } from "./locales";

export type FontPreference = typeof SYSTEM_FONT_ID | string;

export interface AppSettings {
  theme: "light" | "dark";
  autoLaunch: boolean;
  enableNotifications: boolean;
  fontFamily: FontPreference;
  locale: LocalePreference;
}

export const defaultSettings: AppSettings = {
  theme: "light",
  autoLaunch: false,
  enableNotifications: true,
  fontFamily: SYSTEM_FONT_ID,
  locale: "system",
};

const VALID_THEMES: readonly AppSettings["theme"][] = ["light", "dark"];
const VALID_LOCALES: readonly AppSettings["locale"][] = ["system", "en", "zh-CN"];

/** Strip unknown keys and validate known values from an untrusted Partial<AppSettings>. */
export const sanitizeSettings = (raw: Record<string, unknown>): Partial<AppSettings> => {
  const result: Partial<AppSettings> = {};

  if ("theme" in raw && VALID_THEMES.includes(raw.theme as AppSettings["theme"])) {
    result.theme = raw.theme as AppSettings["theme"];
  }
  if ("autoLaunch" in raw && typeof raw.autoLaunch === "boolean") {
    result.autoLaunch = raw.autoLaunch;
  }
  if ("enableNotifications" in raw && typeof raw.enableNotifications === "boolean") {
    result.enableNotifications = raw.enableNotifications;
  }
  if ("fontFamily" in raw && typeof raw.fontFamily === "string" && raw.fontFamily.length > 0) {
    result.fontFamily = raw.fontFamily;
  }
  if ("locale" in raw && VALID_LOCALES.includes(raw.locale as AppSettings["locale"])) {
    result.locale = raw.locale as AppSettings["locale"];
  }

  return result;
};
