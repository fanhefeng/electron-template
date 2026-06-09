import { app, BrowserWindow, nativeTheme } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "../../../shared/theme";
import {
  validateTheme,
  validateThemeData,
  pickThemeData,
  pickThemePatch,
  THEME_SCHEMA_VERSION,
  DEFAULT_SPACING,
} from "../../../shared/theme";
import { BUILTIN_THEMES, DEFAULT_THEME_ID, getBuiltinTheme } from "../../../shared/themes";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import { logger } from "../logger-service";
import { backupCorruptFile, writeJsonAtomic } from "../../utils/atomic-file";
import { SerialQueue } from "../../utils/serial-queue";

export class ThemeService {
  private customThemes: ThemeDefinition[] = [];
  private activeThemeId: ThemeId = DEFAULT_THEME_ID;
  private loadPromise: Promise<void> | null = null;
  // Serializes all custom-theme mutations so concurrent IPC calls cannot
  // interleave their read-modify-write + file save and lose themes.
  private mutationQueue = new SerialQueue();

  async ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      await app.whenReady();
      try {
        const content = await fs.readFile(this.getThemesPath(), "utf-8");
        const raw = JSON.parse(content) as unknown;
        if (Array.isArray(raw)) {
          this.customThemes = raw.filter((item): item is ThemeDefinition => validateTheme(item) && !item.builtIn);
          if (this.customThemes.length !== raw.length) {
            // Per-entry drops (a hand-edited bad value, an un-migrated theme
            // from an older schema version, a stray builtIn entry) must not be
            // silently discarded: the next saveCustomThemes atomically rewrites
            // the file WITHOUT them. Preserve a COPY — not a rename, because the
            // valid entries are still being served from this file until then.
            const dropped = raw.length - this.customThemes.length;
            const backupPath = `${this.getThemesPath()}.invalid-${Date.now().toString(36)}`;
            logger.error(`[service:theme] ${dropped} invalid entries in themes.json — preserving a copy at ${backupPath}`);
            await fs.copyFile(this.getThemesPath(), backupPath).catch((copyError) => {
              logger.error(
                "[service:theme] failed to preserve themes.json copy — next save drops the invalid entries permanently",
                copyError
              );
            });
          }
        } else {
          // Valid JSON but wrong shape: same data-loss risk as a parse error —
          // the next mutation would atomically overwrite the file with the
          // empty in-memory list. Preserve it for manual recovery.
          logger.error("[service:theme] themes.json is not an array, backing it up and starting empty");
          await this.backupCorruptThemesFile();
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          logger.debug("[service:theme] No themes.json found, starting with empty custom themes");
        } else {
          // Never silently discard user themes: a transient read error or a
          // momentarily-corrupt file must not lead to the next saveCustomThemes
          // permanently overwriting themes.json with [] (mirrors SettingsService).
          logger.error("[service:theme] themes.json unreadable, backing it up and starting empty", error);
          await this.backupCorruptThemesFile();
        }
        this.customThemes = [];
      }
      logger.info(`[service:theme] loaded ${this.customThemes.length} custom theme(s)`);
    })();

    return this.loadPromise;
  }

  getActiveTheme(): ThemeDefinition {
    logger.debug(`[service:theme] getActiveTheme: ${this.activeThemeId}`);
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
    logger.debug(`[service:theme] listThemes (custom: ${this.customThemes.length})`);
    return [...BUILTIN_THEMES, ...this.customThemes];
  }

  getTheme(id: ThemeId): ThemeDefinition | null {
    logger.debug(`[service:theme] getTheme: ${id}`);
    return getBuiltinTheme(id) ?? this.customThemes.find((t) => t.id === id) ?? null;
  }

  async createTheme(data: Omit<ThemeDefinition, "id" | "builtIn">): Promise<ThemeDefinition> {
    logger.info(`[service:theme] createTheme called (name: ${typeof data?.name === "string" ? data.name : "?"})`);
    if (!validateThemeData(data)) {
      throw new Error("Invalid theme data");
    }
    return this.mutationQueue.run(async () => {
      const theme: ThemeDefinition = {
        ...pickThemeData(data),
        version: THEME_SCHEMA_VERSION,
        id: this.generateId(),
        builtIn: false,
      };
      this.customThemes.push(theme);
      try {
        await this.saveCustomThemes();
      } catch (error) {
        // Roll back the in-memory mutation (mirrors SettingsService): a failed
        // save must not leave a ghost theme that a later unrelated successful
        // save would silently persist after the caller was told it failed.
        this.customThemes.pop();
        throw error;
      }
      logger.info(`[service:theme] created custom theme: ${theme.id}`);
      return theme;
    });
  }

  async updateTheme(id: ThemeId, patch: Partial<ThemeDefinition>): Promise<ThemeDefinition> {
    logger.info(`[service:theme] updateTheme called (id: ${id})`);
    return this.mutationQueue.run(async () => {
      const index = this.customThemes.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error(`Cannot update theme: ${id} is built-in or does not exist`);
      }
      const current = this.customThemes[index];
      const safePatch = pickThemePatch(patch);
      const updated: ThemeDefinition = {
        ...current,
        ...safePatch,
        // Deep-merge nested objects: pickThemePatch keeps only the keys present
        // in the patch, so a partial colors/spacing patch must merge over the
        // existing tokens instead of replacing the whole object.
        colors: safePatch.colors ? { ...current.colors, ...safePatch.colors } : current.colors,
        // Base a partial spacing patch on DEFAULT_SPACING when the theme has
        // none: otherwise the merged object misses keys and validateTheme
        // rejects what pickThemePatch advertises as a legal partial patch.
        spacing: safePatch.spacing ? { ...(current.spacing ?? DEFAULT_SPACING), ...safePatch.spacing } : current.spacing,
        id,
        builtIn: false,
      };
      if (!validateTheme(updated)) {
        throw new Error("Invalid theme patch");
      }
      this.customThemes[index] = updated;
      try {
        await this.saveCustomThemes();
      } catch (error) {
        // Roll back so the rejected edit doesn't linger half-applied in memory.
        this.customThemes[index] = current;
        throw error;
      }
      // If the edited theme is the active one, re-apply it so open windows
      // live-update. Selecting a different theme already re-applies via
      // setActiveTheme, but editing the active theme keeps the same id, so
      // nothing downstream would re-broadcast without this.
      if (this.activeThemeId === id) {
        this.setActiveTheme(id);
      }
      logger.info(`[service:theme] updated custom theme: ${id}`);
      return updated;
    });
  }

  async deleteTheme(id: ThemeId): Promise<void> {
    logger.info(`[service:theme] deleteTheme called (id: ${id})`);
    await this.mutationQueue.run(async () => {
      const index = this.customThemes.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error(`Cannot delete theme: ${id} is built-in or does not exist`);
      }
      const [removed] = this.customThemes.splice(index, 1);
      try {
        await this.saveCustomThemes();
      } catch (error) {
        // Roll back: the theme still exists on disk, so memory must agree —
        // this also keeps a still-active deleted theme resolvable (the
        // post-queue active reset below is skipped when the save throws).
        this.customThemes.splice(index, 0, removed);
        throw error;
      }
      logger.info(`[service:theme] deleted custom theme: ${id}`);
    });
    if (this.activeThemeId === id) {
      this.setActiveTheme(DEFAULT_THEME_ID);
    }
  }

  exportTheme(id: ThemeId): ExportedTheme {
    logger.info(`[service:theme] exportTheme: ${id}`);
    const theme = this.getTheme(id);
    if (!theme) {
      throw new Error(`Theme not found: ${id}`);
    }
    return { ...theme, builtIn: false };
  }

  async importTheme(raw: unknown): Promise<ThemeDefinition> {
    logger.info("[service:theme] importTheme called");
    if (!validateTheme(raw)) {
      throw new Error("Invalid theme data");
    }
    return this.mutationQueue.run(async () => {
      // pickThemeData keeps only known keys, so arbitrary extra JSON keys from the
      // imported file are never persisted to themes.json.
      const theme: ThemeDefinition = {
        ...pickThemeData(raw),
        id: this.generateId(),
        builtIn: false,
        version: THEME_SCHEMA_VERSION,
      };
      this.customThemes.push(theme);
      try {
        await this.saveCustomThemes();
      } catch (error) {
        // Roll back (same reasoning as createTheme).
        this.customThemes.pop();
        throw error;
      }
      logger.info(`[service:theme] imported theme: ${theme.id} (name: ${theme.name})`);
      return theme;
    });
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
        logger.info(`[service:theme] broadcastTheme to window (id=${win.id}): ${theme.id}`);
        win.webContents.send(IPC_CHANNELS.THEME_UPDATED, theme);
      }
    });
  }

  private async saveCustomThemes(): Promise<void> {
    await app.whenReady();
    // Atomic write: a crash mid-save can no longer truncate themes.json and
    // silently wipe every custom theme on the next launch.
    await writeJsonAtomic(this.getThemesPath(), this.customThemes);
  }

  private getThemesPath(): string {
    return path.join(app.getPath("userData"), "themes.json");
  }

  /** Keeps an unreadable/malformed themes.json around for manual recovery. */
  private async backupCorruptThemesFile(): Promise<void> {
    if (!(await backupCorruptFile(this.getThemesPath()))) {
      // Loud failure: the corrupt file stays in place and the next
      // saveCustomThemes overwrites it — the recovery copy was NOT preserved.
      logger.error("[service:theme] failed to back up corrupt themes.json — next save may overwrite it");
    }
  }

  private generateId(): string {
    return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const themeService = new ThemeService();
