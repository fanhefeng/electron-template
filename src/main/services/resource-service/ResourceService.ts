import { app } from "electron";
import os from "node:os";
import path from "node:path";
import { logger } from "../logger-service";

export class ResourceService {
  getAppRoot(): string {
    const root = app.getAppPath();
    logger.debug("ResourceService.getAppRoot", root);
    return root;
  }

  getDistPath(...segments: string[]): string {
    return path.join(this.getAppRoot(), "dist", ...segments);
  }

  getRendererPath(...segments: string[]): string {
    return this.getDistPath("renderer", ...segments);
  }

  getRendererHtmlPath(relativeHtmlFile: string): string {
    const result = this.getRendererPath(relativeHtmlFile);
    logger.debug(`ResourceService.getRendererHtmlPath: ${relativeHtmlFile} → ${result}`);
    return result;
  }

  getPreloadPath(...segments: string[]): string {
    return this.getDistPath("preload", ...segments);
  }

  getPreloadScript(name: string): string {
    const result = this.getPreloadPath("preload", `${name}Preload.js`);
    logger.debug(`ResourceService.getPreloadScript: ${name} → ${result}`);
    return result;
  }

  getSharedPreloadPath(relative: string): string {
    return this.getPreloadPath("shared", relative);
  }

  getStaticResourcePath(...segments: string[]): string {
    const result = app.isPackaged
      ? path.join(process.resourcesPath, ...segments)
      : path.join(this.getAppRoot(), "resources", ...segments);
    logger.debug(`ResourceService.getStaticResourcePath: [${segments.join("/")}] → ${result}`);
    return result;
  }

  getThemePath(themeName = "default"): string {
    return this.getStaticResourcePath("themes", themeName);
  }

  getTempDirectory(...segments: string[]): string {
    const base = app.isReady() ? app.getPath("temp") : os.tmpdir();
    const appSegment = app.getName() || "electron-app";
    const result = path.join(base, appSegment, ...segments);
    logger.debug(`ResourceService.getTempDirectory: [${segments.join("/")}] → ${result}`);
    return result;
  }

  resolveDownloadPath(fileName: string, directory?: string): string {
    const base = directory ?? (app.isReady() ? app.getPath("downloads") : os.homedir());
    const result = path.join(base, fileName);
    logger.debug(`ResourceService.resolveDownloadPath: ${fileName} → ${result}`);
    return result;
  }

  resolvePath(...segments: string[]): string {
    return path.join(...segments);
  }
}

export const resourceService = new ResourceService();
