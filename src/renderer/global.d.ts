import type { AppSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import type { OpenWindowPayload } from "@shared/ipcChannels";
import type { DeepLinkPayload } from "@shared/deepLink";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "@shared/theme";
import type { ProgressInfo } from "electron-updater";

declare global {
  interface Window {
    log?: {
      info: (action: string, details?: string) => void;
      warn: (action: string, details?: string) => void;
      error: (action: string, details?: string) => void;
      debug: (action: string, details?: string) => void;
    };
    app?: {
      getMessages: () => Promise<Record<string, string>>;
      onSettingsUpdated: (listener: (_event: unknown, settings: AppSettings) => void) => void;
      offSettingsUpdated: (listener: (_event: unknown, settings: AppSettings) => void) => void;
      onThemeUpdated: (listener: (_event: unknown, theme: ThemeDefinition) => void) => void;
      offThemeUpdated: (listener: (_event: unknown, theme: ThemeDefinition) => void) => void;
    };
    electronAPI?: {
      checkForUpdates: () => Promise<void>;
      applyUpdate: () => Promise<void>;
      openWindow: (windowName: OpenWindowPayload) => Promise<void>;
      showNotification: (title: string, body: string) => Promise<void>;
      onUpdateAvailable: (listener: () => void) => void;
      onUpdateNotAvailable: (listener: () => void) => void;
      onUpdateError: (listener: (_event: unknown, message: string) => void) => void;
      onUpdateDownloadPending: (listener: () => void) => void;
      onUpdateDownloadProgress: (listener: (_event: unknown, progress: ProgressInfo) => void) => void;
      onUpdateDownloaded: (listener: () => void) => void;
      offUpdateAvailable: (listener: () => void) => void;
      offUpdateNotAvailable: (listener: () => void) => void;
      offUpdateError: (listener: (_event: unknown, message: string) => void) => void;
      offUpdateDownloadPending: (listener: () => void) => void;
      offUpdateDownloadProgress: (listener: (_event: unknown, progress: ProgressInfo) => void) => void;
      offUpdateDownloaded: (listener: () => void) => void;
      onDeepLink: (listener: (_event: unknown, payload: DeepLinkPayload) => void) => void;
      offDeepLink: (listener: (_event: unknown, payload: DeepLinkPayload) => void) => void;
    };
    aboutAPI?: {
      getAppVersion: () => Promise<string>;
      getNodeVersion: () => string;
      getElectronVersion: () => string;
      getChromeVersion: () => string;
    };
    settingsAPI?: {
      getSettings: () => Promise<AppSettings>;
      updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      getAvailableFonts: () => Promise<FontAsset[]>;
      listThemes: () => Promise<ThemeDefinition[]>;
      getActiveTheme: () => Promise<ThemeDefinition>;
      createTheme: (data: Omit<ThemeDefinition, "id" | "builtIn">) => Promise<ThemeDefinition>;
      updateTheme: (id: ThemeId, patch: Partial<ThemeDefinition>) => Promise<ThemeDefinition>;
      deleteTheme: (id: ThemeId) => Promise<void>;
      importTheme: (raw: unknown) => Promise<ThemeDefinition>;
      exportTheme: (id: ThemeId) => Promise<ExportedTheme>;
    };
  }
}

export {};
