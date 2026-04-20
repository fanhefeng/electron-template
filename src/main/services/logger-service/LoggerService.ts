import log from "electron-log";

export class LoggerService {
  constructor() {
    log.transports.console.level = "silly";
    log.transports.file.level = "info";
  }

  info(message: string, ...meta: unknown[]): void {
    log.info(message, ...meta);
  }

  warn(message: string, ...meta: unknown[]): void {
    log.warn(message, ...meta);
  }

  error(message: string, ...meta: unknown[]): void {
    log.error(message, ...meta);
  }

  debug(message: string, ...meta: unknown[]): void {
    log.debug(message, ...meta);
  }

  log(message: string, ...meta: unknown[]): void {
    log.log(message, ...meta);
  }
}

export const logger = new LoggerService();
