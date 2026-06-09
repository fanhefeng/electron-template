import { app } from "electron";
import os from "node:os";
import path from "node:path";
import { logger } from "../logger-service";

export class ResourceService {
  getAppRoot(): string {
    const root = app.getAppPath();
    logger.debug("[service:resource] getAppRoot", root);
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
    logger.debug(`[service:resource] getRendererHtmlPath: ${relativeHtmlFile} → ${result}`);
    return result;
  }

  getPreloadPath(...segments: string[]): string {
    return this.getDistPath("preload", ...segments);
  }

  getPreloadScript(name: string): string {
    const result = this.getPreloadPath("preload", `${name}Preload.js`);
    logger.debug(`[service:resource] getPreloadScript: ${name} → ${result}`);
    return result;
  }

  getStaticResourcePath(...segments: string[]): string {
    const result = app.isPackaged
      ? path.join(process.resourcesPath, ...segments)
      : path.join(this.getAppRoot(), "resources", ...segments);
    logger.debug(`[service:resource] getStaticResourcePath: [${segments.join("/")}] → ${result}`);
    return result;
  }

  getTempDirectory(...segments: string[]): string {
    const base = app.isReady() ? app.getPath("temp") : os.tmpdir();
    const appSegment = app.getName() || "electron-app";
    const result = path.join(base, appSegment, ...segments);
    logger.debug(`[service:resource] getTempDirectory: [${segments.join("/")}] → ${result}`);
    return result;
  }

  resolveDownloadPath(fileName: string, directory?: string): string {
    const base = directory ?? (app.isReady() ? app.getPath("downloads") : os.homedir());
    const result = path.join(base, fileName);
    logger.debug(`[service:resource] resolveDownloadPath: ${fileName} → ${result}`);
    return result;
  }

  resolvePath(...segments: string[]): string {
    const result = path.join(...segments);
    logger.debug(`[service:resource] resolvePath: [${segments.join(", ")}] → ${result}`);
    return result;
  }
}

export const resourceService = new ResourceService();
