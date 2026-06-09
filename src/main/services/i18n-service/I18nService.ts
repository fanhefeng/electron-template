import { app } from "electron";
import { logger } from "../logger-service";
import { getMessages, resolveLocale } from "../../../shared/locales";
import type { SupportedLocale, LocalePreference } from "../../../shared/locales";

export class I18nService {
  private locale: SupportedLocale = "en";

  private detectLocale(): SupportedLocale {
    try {
      const systemLocale = app.getLocale();
      const resolved = resolveLocale(systemLocale);
      logger.debug(`[service:i18n] detectLocale: system="${systemLocale}", resolved="${resolved}"`);
      return resolved;
    } catch (error) {
      logger.warn("[service:i18n] detectLocale failed, falling back to 'en'", error);
      return "en";
    }
  }

  getLocale(): SupportedLocale {
    logger.debug(`[service:i18n] getLocale: ${this.locale}`);
    return this.locale;
  }

  setLocale(preference: LocalePreference): void {
    if (preference === "system") {
      this.locale = this.detectLocale();
    } else {
      this.locale = preference;
    }
    logger.info(`[service:i18n] setLocale: ${this.locale}`);
  }

  getMessages(): Record<string, string> {
    logger.debug(`[service:i18n] getMessages: locale=${this.locale}`);
    return getMessages(this.locale);
  }

  // No entry log by design: t() runs on every menu/tray/notification string
  // resolution (hot path) — the callers' own entry logs cover traceability.
  t(key: string, params?: Record<string, string>): string {
    const messages = this.getMessages();
    let value = messages[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        // Function replacer: a string replacement would interpret `$&`/`$$`
        // etc. in the param VALUE as replacement patterns and garble it.
        value = value.replaceAll(`{${k}}`, () => v);
      }
    }
    return value;
  }
}

export const i18nService = new I18nService();
