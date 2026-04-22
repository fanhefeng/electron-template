import { app, shell } from "electron";
import path from "node:path";
import log from "electron-log";

export class LoggerService {
  constructor() {
    const isDev = !app.isPackaged;
    log.transports.console.level = isDev ? "silly" : "warn";
    log.transports.file.level = "info";
  }

  /**
   * Re-resolve the log file path based on the current app name.
   * Must be called after app.setName() to ensure environment isolation.
   */
  reconfigure(): void {
    const logsDir = app.getPath("logs");
    const logPath = path.join(logsDir, "main.log");
    log.transports.file.resolvePathFn = () => logPath;
    log.info(`[logger] reconfigured log path: ${logPath}`);
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
