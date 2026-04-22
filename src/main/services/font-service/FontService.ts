import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";
import type { FontAsset, FontFormat } from "../../../shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK } from "../../../shared/fonts";
import { protocolService } from "../protocol-service";

const SUPPORTED_FORMATS: Record<string, FontFormat> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
  eot: "embedded-opentype",
};

const DEFAULT_SYSTEM_FONT: FontAsset = {
  id: SYSTEM_FONT_ID,
  label: "Default",
  cssFamily: SYSTEM_FONT_STACK,
};

export interface ListFontsOptions {
  forceRefresh?: boolean;
}

export class FontService {
  private cachedFonts: FontAsset[] | null = null;
  private cachedMap: Map<string, FontAsset> | null = null;

  async listFonts(options: ListFontsOptions = {}): Promise<FontAsset[]> {
    if (!options.forceRefresh && this.cachedFonts) {
      return this.cachedFonts;
    }

    const fonts: FontAsset[] = [DEFAULT_SYSTEM_FONT];
    const fontsDirectory = resourceService.getStaticResourcePath("fonts");

    try {
      const entries = await fs.readdir(fontsDirectory, { withFileTypes: true });
      const usedIds = new Set<string>(fonts.map((font) => font.id));
      await Promise.all(
        entries.map(async (entry) => {
          if (!entry.isFile() || entry.name.startsWith(".")) {
            return;
          }

          try {
            const asset = await this.createAssetFromFile(entry.name, usedIds);
            if (asset) {
              fonts.push(asset);
              usedIds.add(asset.id);
            }
          } catch (error) {
            logger.warn(`Failed to load font: ${entry.name}`, error);
          }
        })
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn("Failed to scan fonts directory", error);
      }
    }

    this.cachedFonts = fonts;
    this.cachedMap = new Map(fonts.map((font) => [font.id, font]));
    logger.info(`[service:font] listFonts: loaded ${fonts.length} fonts`);
    return fonts;
  }

  async getFont(id: string): Promise<FontAsset | undefined> {
    logger.debug(`[service:font] getFont: ${id}`);
    if (!this.cachedMap) {
      await this.listFonts();
    }

    return this.cachedMap?.get(id);
  }

  invalidateCache(): void {
    logger.info("[service:font] invalidateCache called");
    this.cachedFonts = null;
    this.cachedMap = null;
  }

  private async createAssetFromFile(fileName: string, usedIds: Set<string>): Promise<FontAsset | null> {
    const extension = path.extname(fileName).slice(1).toLowerCase();
    const format = SUPPORTED_FORMATS[extension];

    if (!format) {
      logger.warn(`Unsupported font format: ${extension} (file: ${fileName})`);
      return null;
    }

    const baseName = path.basename(fileName, path.extname(fileName));
    const label = this.formatLabel(baseName);
    const id = this.createUniqueId(baseName, usedIds);
    const source = protocolService.resolveFontUrl(fileName);

    return {
      id,
      label,
      cssFamily: label,
      source,
      format,
    } satisfies FontAsset;
  }

  private formatLabel(baseName: string): string {
    const spaced = baseName.replace(/[-_]+/g, " ").trim();

    if (!spaced) {
      return baseName || "custom-font";
    }

    return spaced
      .split(" ")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  private createUniqueId(baseName: string, usedIds: Set<string>): string {
    const normalized = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!usedIds.has(normalized)) {
      return normalized || `font-${usedIds.size}`;
    }

    let counter = 1;
    while (usedIds.has(`${normalized}-${counter}`)) {
      counter += 1;
    }

    return `${normalized}-${counter}`;
  }
}

export const fontService = new FontService();
