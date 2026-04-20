import { app } from "electron";
import { logger } from "../logger-service";
import { getMessages, resolveLocale } from "../../../shared/locales";
import type { SupportedLocale, LocalePreference } from "../../../shared/locales";

export class I18nService {
  private locale: SupportedLocale = this.detectLocale();

  private detectLocale(): SupportedLocale {
    try {
      return resolveLocale(app.getLocale());
    } catch {
      return "en";
    }
  }

  getLocale(): SupportedLocale {
    return this.locale;
  }

  setLocale(preference: LocalePreference): void {
    if (preference === "system") {
      this.locale = this.detectLocale();
    } else {
      this.locale = preference;
    }
    logger.info(`Locale updated: ${this.locale}`);
  }

  getMessages(): Record<string, string> {
    return getMessages(this.locale);
  }

  t(key: string, params?: Record<string, string>): string {
    const messages = this.getMessages();
    let value = messages[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replaceAll(`{${k}}`, v);
      }
    }
    return value;
  }
}

export const i18nService = new I18nService();
