import { en } from "./en";
import { zhCN } from "./zh-CN";

export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type LocalePreference = SupportedLocale | "system";

const dictionaries: Record<SupportedLocale, Record<string, string>> = {
  en,
  "zh-CN": zhCN,
};

export function getMessages(locale: SupportedLocale): Record<string, string> {
  return dictionaries[locale];
}

export function resolveLocale(systemLocale: string): SupportedLocale {
  if (systemLocale.startsWith("zh")) return "zh-CN";
  return "en";
}
