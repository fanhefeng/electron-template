import type { AppSettings } from "@shared/settings";
import type { OpenWindowPayload } from "@shared/ipcChannels";
import type { ProgressInfo } from "electron-updater";

declare global {
  interface Window {
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
      getAvailableFonts: () => Promise<import("@shared/fonts").FontAsset[]>;
    };
  }
}

export {};
