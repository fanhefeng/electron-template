import { BrowserWindow, dialog } from "electron";
import { promises as fs } from "node:fs";
import { logger } from "../logger-service";

export interface OpenDialogOptions {
  filters?: Electron.FileFilter[];
  properties?: Array<"openFile" | "openDirectory" | "multiSelections" | "showHiddenFiles">;
}

export class FileService {
  async showOpenDialog(browserWindow: BrowserWindow, options: OpenDialogOptions = {}): Promise<string[]> {
    const result = await dialog.showOpenDialog(browserWindow, {
      properties: options.properties ?? ["openFile"],
      filters: options.filters,
    });

    if (result.canceled) {
      return [];
    }

    logger.info("Files selected", result.filePaths);
    return result.filePaths;
  }

  async readFile(filePath: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    logger.debug("Reading file", filePath);
    return fs.readFile(filePath, { encoding });
  }

  async writeFile(filePath: string, data: string | NodeJS.ArrayBufferView): Promise<void> {
    logger.debug("Writing file", filePath);
    await fs.writeFile(filePath, data);
  }
}

export const fileService = new FileService();
