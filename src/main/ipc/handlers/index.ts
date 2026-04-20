import type { OpenWindowPayload } from "../../../shared/ipcChannels";
import { checkForUpdates, applyUpdate } from "./updaterHandler";
import { getSettings, updateSettings } from "./settingsHandler";
import { listFonts } from "./fontHandler";
import { getAppVersion } from "./appHandler";
import type { WindowManager } from "../../window-manager/WindowManager";
import { handleTyped } from "../typed";

export const registerIpcHandlers = (windowManager: WindowManager): void => {
  handleTyped("app/check-for-updates", checkForUpdates);
  handleTyped("app/apply-update", applyUpdate);
  handleTyped("settings/get", getSettings);
  handleTyped("settings/update", updateSettings);
  handleTyped("fonts/list", listFonts);
  handleTyped("app/version", getAppVersion);
  handleTyped("window/open", (_event, payload: OpenWindowPayload) => {
    const validWindows: OpenWindowPayload[] = ["about", "settings"];
    if (!validWindows.includes(payload)) {
      throw new Error(`Invalid window name: ${payload}`);
    }
    windowManager.open(payload);
    return undefined as void;
  });
};
