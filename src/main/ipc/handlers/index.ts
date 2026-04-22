import type { OpenWindowPayload } from "../../../shared/ipcChannels";
import { checkForUpdates, applyUpdate } from "./updaterHandler";
import { getSettings, updateSettings } from "./settingsHandler";
import { listFonts } from "./fontHandler";
import { getAppVersion } from "./appHandler";
import { getI18nMessages } from "./i18nHandler";
import { registerLogHandler } from "./logHandler";
import {
  listThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  importTheme,
  exportTheme,
  getActiveTheme,
} from "./themeHandler";
import type { WindowManager } from "../../window-manager/WindowManager";
import { handleTypedWithLogging } from "../typed";

export const registerIpcHandlers = (windowManager: WindowManager): void => {
  registerLogHandler();

  handleTypedWithLogging("app/check-for-updates", checkForUpdates);
  handleTypedWithLogging("app/apply-update", applyUpdate);
  handleTypedWithLogging("settings/get", getSettings);
  handleTypedWithLogging("settings/update", updateSettings);
  handleTypedWithLogging("fonts/list", listFonts);
  handleTypedWithLogging("app/version", getAppVersion);
  handleTypedWithLogging("i18n/messages", getI18nMessages);
  handleTypedWithLogging("window/open", (_event, payload: OpenWindowPayload) => {
    const validWindows: OpenWindowPayload[] = ["about", "settings"];
    if (!validWindows.includes(payload)) {
      throw new Error(`Invalid window name: ${payload}`);
    }
    windowManager.open(payload);
    return undefined as void;
  });
  handleTypedWithLogging("theme/list", listThemes);
  handleTypedWithLogging("theme/get", getTheme);
  handleTypedWithLogging("theme/create", createTheme);
  handleTypedWithLogging("theme/update", updateTheme);
  handleTypedWithLogging("theme/delete", deleteTheme);
  handleTypedWithLogging("theme/import", importTheme);
  handleTypedWithLogging("theme/export", exportTheme);
  handleTypedWithLogging("theme/active", getActiveTheme);
};
