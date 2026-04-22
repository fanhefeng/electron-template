import { app, BrowserWindow, nativeTheme } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "../../../shared/theme";
import { validateTheme, THEME_SCHEMA_VERSION } from "../../../shared/theme";
import { BUILTIN_THEMES, DEFAULT_THEME_ID, getBuiltinTheme } from "../../../shared/themes";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import { logger } from "../logger-service";

export class ThemeService {
  private customThemes: ThemeDefinition[] = [];
  private activeThemeId: ThemeId = DEFAULT_THEME_ID;
  private loadPromise: Promise<void> | null = null;

  async ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      await app.whenReady();
      try {
        const content = await fs.readFile(this.getThemesPath(), "utf-8");
        const raw = JSON.parse(content) as unknown;
        if (Array.isArray(raw)) {
          this.customThemes = raw.filter((item): item is ThemeDefinition => validateTheme(item) && !item.builtIn);
        }
      } catch (error) {
        logger.warn("[service:theme] Failed to load themes.json", error);
        this.customThemes = [];
      }
      logger.info(`[service:theme] loaded ${this.customThemes.length} custom theme(s)`);
    })();

    return this.loadPromise;
  }

  getActiveTheme(): ThemeDefinition {
    return this.resolveTheme(this.activeThemeId);
  }

  setActiveTheme(id: ThemeId): void {
    const theme = this.resolveTheme(id);
    this.activeThemeId = theme.id;
    nativeTheme.themeSource = theme.colorScheme;
    this.broadcastTheme(theme);
    logger.info(`[service:theme] setActiveTheme: ${theme.id}`);
  }

  listThemes(): ThemeDefinition[] {
    return [...BUILTIN_THEMES, ...this.customThemes];
  }

  getTheme(id: ThemeId): ThemeDefinition | null {
    return getBuiltinTheme(id) ?? this.customThemes.find((t) => t.id === id) ?? null;
  }

  async createTheme(data: Omit<ThemeDefinition, "id" | "builtIn">): Promise<ThemeDefinition> {
    const theme: ThemeDefinition = {
      ...data,
      id: this.generateId(),
      builtIn: false,
    };
    this.customThemes.push(theme);
    await this.saveCustomThemes();
    logger.info(`[service:theme] created custom theme: ${theme.id}`);
    return theme;
  }

  async updateTheme(id: ThemeId, patch: Partial<ThemeDefinition>): Promise<ThemeDefinition> {
    const index = this.customThemes.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Cannot update theme: ${id} is built-in or does not exist`);
    }
    const updated: ThemeDefinition = {
      ...this.customThemes[index],
      ...patch,
      id,
      builtIn: false,
    };
    this.customThemes[index] = updated;
    await this.saveCustomThemes();
    logger.info(`[service:theme] updated custom theme: ${id}`);
    return updated;
  }

  async deleteTheme(id: ThemeId): Promise<void> {
    const index = this.customThemes.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Cannot delete theme: ${id} is built-in or does not exist`);
    }
    this.customThemes.splice(index, 1);
    await this.saveCustomThemes();
    if (this.activeThemeId === id) {
      this.setActiveTheme(DEFAULT_THEME_ID);
    }
    logger.info(`[service:theme] deleted custom theme: ${id}`);
  }

  exportTheme(id: ThemeId): ExportedTheme {
    const theme = this.getTheme(id);
    if (!theme) {
      throw new Error(`Theme not found: ${id}`);
    }
    const { builtIn: _, ...rest } = theme;
    return { ...rest, builtIn: false };
  }

  async importTheme(raw: unknown): Promise<ThemeDefinition> {
    if (!validateTheme(raw)) {
      throw new Error("Invalid theme data");
    }
    const theme: ThemeDefinition = {
      ...raw,
      id: this.generateId(),
      builtIn: false,
      version: THEME_SCHEMA_VERSION,
    };
    this.customThemes.push(theme);
    await this.saveCustomThemes();
    logger.info(`[service:theme] imported theme: ${theme.id} (name: ${theme.name})`);
    return theme;
  }

  private resolveTheme(id: ThemeId): ThemeDefinition {
    const theme = this.getTheme(id);
    if (theme) return theme;
    logger.warn(`[service:theme] theme not found: ${id}, falling back to default`);
    return getBuiltinTheme(DEFAULT_THEME_ID)!;
  }

  private broadcastTheme(theme: ThemeDefinition): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.THEME_UPDATED, theme);
      }
    });
  }

  private async saveCustomThemes(): Promise<void> {
    await app.whenReady();
    const file = this.getThemesPath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(this.customThemes, null, 2), "utf-8");
  }

  private getThemesPath(): string {
    return path.join(app.getPath("userData"), "themes.json");
  }

  private generateId(): string {
    return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const themeService = new ThemeService();
