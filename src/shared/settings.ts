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
