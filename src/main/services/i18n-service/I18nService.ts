import { app } from 'electron';
import { logger } from '../logger-service';

export type MessageDictionary = Record<string, string>;

export class I18nService {
  private locale: string = this.detectLocale();
  private readonly dictionaries = new Map<string, MessageDictionary>();

  private detectLocale(): string {
    try {
      return app.getLocale();
    } catch (error) {
      logger.warn('Failed to detect locale, defaulting to en', error);
      return 'en';
    }
  }

  getLocale(): string {
    return this.locale;
  }

  setLocale(locale: string): void {
    this.locale = locale;
    logger.info('Locale updated', locale);
  }

  registerMessages(locale: string, messages: MessageDictionary): void {
    const existing = this.dictionaries.get(locale) ?? {};
    this.dictionaries.set(locale, { ...existing, ...messages });
  }

  translate(key: string): string {
    const messages = this.dictionaries.get(this.locale);
    return messages?.[key] ?? key;
  }
}

export const i18nService = new I18nService();
