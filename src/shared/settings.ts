import { SYSTEM_FONT_ID } from "./fonts";

export type FontPreference = typeof SYSTEM_FONT_ID | string;

export interface AppSettings {
  theme: "light" | "dark";
  autoLaunch: boolean;
  enableNotifications: boolean;
  fontFamily: FontPreference;
}

export const defaultSettings: AppSettings = {
  theme: "light",
  autoLaunch: false,
  enableNotifications: true,
  fontFamily: SYSTEM_FONT_ID,
};
