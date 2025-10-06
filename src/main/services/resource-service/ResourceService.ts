import { app } from 'electron';
import os from 'node:os';
import path from 'node:path';

export class ResourceService {
  getAppRoot(): string {
    return app.getAppPath();
  }

  getDistPath(...segments: string[]): string {
    return path.join(this.getAppRoot(), 'dist', ...segments);
  }

  getRendererPath(...segments: string[]): string {
    return this.getDistPath('renderer', ...segments);
  }

  getRendererHtmlPath(relativeHtmlFile: string): string {
    return this.getRendererPath(relativeHtmlFile);
  }

  getPreloadPath(...segments: string[]): string {
    return this.getDistPath('preload', ...segments);
  }

  getPreloadScript(name: string): string {
    return this.getPreloadPath('preload', `${name}Preload.js`);
  }

  getSharedPreloadPath(relative: string): string {
    return this.getPreloadPath('shared', relative);
  }

  getStaticResourcePath(...segments: string[]): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, ...segments);
    }

    return path.join(this.getAppRoot(), 'resources', ...segments);
  }

  getThemePath(themeName = 'default'): string {
    return this.getStaticResourcePath('themes', themeName);
  }

  getTempDirectory(...segments: string[]): string {
    const base = app.isReady() ? app.getPath('temp') : os.tmpdir();
    const appSegment = app.getName() || 'electron-app';
    return path.join(base, appSegment, ...segments);
  }

  resolveDownloadPath(fileName: string, directory?: string): string {
    const base = directory ?? (app.isReady() ? app.getPath('downloads') : os.homedir());
    return path.join(base, fileName);
  }

  resolvePath(...segments: string[]): string {
    return path.join(...segments);
  }
}

export const resourceService = new ResourceService();
