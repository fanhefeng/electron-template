import type { OpenWindowPayload } from "../../../shared/ipcChannels";
import { checkForUpdates, applyUpdate, getUpdateState } from "./updaterHandler";
import { getSettings, updateSettings, isPartialSettings } from "./settingsHandler";
import { listFonts } from "./fontHandler";
import { getAppVersion } from "./appHandler";
import { getI18nMessages } from "./i18nHandler";
import { showNotification, isNotificationPayload } from "./notificationHandler";
import { createConsumePendingDeepLink } from "./deepLinkHandler";
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
  isThemeCreatePayload,
  isThemeUpdatePayload,
  isThemeIdPayload,
  isThemeImportPayload,
} from "./themeHandler";
import type { WindowManager } from "../../window-manager/WindowManager";
import { handleTypedWithLogging } from "../typed";

export const registerIpcHandlers = (windowManager: WindowManager): void => {
  registerLogHandler();

  handleTypedWithLogging("app/check-for-updates", checkForUpdates);
  handleTypedWithLogging("app/apply-update", applyUpdate);
  handleTypedWithLogging("app/update-state", getUpdateState);
  handleTypedWithLogging("settings/get", getSettings);
  handleTypedWithLogging("settings/update", updateSettings, isPartialSettings);
  handleTypedWithLogging("fonts/list", listFonts);
  handleTypedWithLogging("app/version", getAppVersion);
  handleTypedWithLogging("i18n/messages", getI18nMessages);
  handleTypedWithLogging("notification/show", showNotification, isNotificationPayload);
  // Type guard (not inline validation) so an invalid payload is rejected with
  // the standard "[ipc] invalid payload rejected" warning BEFORE being
  // summarized into the invoke log — consistent with every guarded channel.
  const isOpenWindowPayload = (value: unknown): value is OpenWindowPayload =>
    value === "about" || value === "settings";
  handleTypedWithLogging(
    "window/open",
    (_event, payload: OpenWindowPayload) => {
      windowManager.open(payload);
      return undefined as void;
    },
    isOpenWindowPayload
  );
  handleTypedWithLogging("theme/list", listThemes);
  handleTypedWithLogging("theme/get", getTheme, isThemeIdPayload);
  handleTypedWithLogging("theme/create", createTheme, isThemeCreatePayload);
  handleTypedWithLogging("theme/update", updateTheme, isThemeUpdatePayload);
  handleTypedWithLogging("theme/delete", deleteTheme, isThemeIdPayload);
  handleTypedWithLogging("theme/import", importTheme, isThemeImportPayload);
  handleTypedWithLogging("theme/export", exportTheme, isThemeIdPayload);
  handleTypedWithLogging("theme/active", getActiveTheme);
  handleTypedWithLogging("deep-link/consume-pending", createConsumePendingDeepLink(windowManager));
};
