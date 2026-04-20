import type { AppSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import type { OpenWindowPayload } from "@shared/ipcChannels";
import type { DeepLinkPayload } from "@shared/deepLink";
import type { ProgressInfo } from "electron-updater";

declare global {
  interface Window {
    app?: {
      getMessages: () => Promise<Record<string, string>>;
      onSettingsUpdated: (listener: (_event: unknown, settings: AppSettings) => void) => void;
      offSettingsUpdated: (listener: (_event: unknown, settings: AppSettings) => void) => void;
    };
    electronAPI?: {
      checkForUpdates: () => Promise<void>;
      applyUpdate: () => Promise<void>;
      openWindow: (windowName: OpenWindowPayload) => Promise<void>;
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
    };
  }
}

export {};
