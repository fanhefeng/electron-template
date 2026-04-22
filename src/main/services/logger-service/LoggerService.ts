import { shell } from "electron";
import log from "electron-log";

export class LoggerService {
  constructor() {
    log.transports.console.level = "silly";
    log.transports.file.level = "info";
  }

  getLogFilePath(): string {
    return log.transports.file.getFile().path;
  }

  async openLogFile(): Promise<void> {
    const filePath = this.getLogFilePath();
    this.info(`LoggerService.openLogFile called, path=${filePath}`);
    const result = await shell.openPath(filePath);
    if (result) {
      this.error(`LoggerService.openLogFile failed: ${result}`);
    }
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
