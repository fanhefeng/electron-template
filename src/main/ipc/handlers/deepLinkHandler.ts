import type { IpcMainInvokeEvent } from "electron";
import type { DeepLinkPayload } from "../../../shared/deepLink";
import { deepLinkService } from "../../services/deep-link-service";
import type { WindowManager } from "../../window-manager/WindowManager";

/**
 * The pending deep-link slot is per-window. The caller's identity is derived
 * from the IPC sender (event.sender → WindowManager registry), never from a
 * renderer-supplied id, so one window can never drain a deep link that was
 * targeted at another window.
 */
export const createConsumePendingDeepLink =
  (windowManager: WindowManager) =>
  async (event: IpcMainInvokeEvent): Promise<DeepLinkPayload | null> => {
    const windowId = windowManager.getWindowIdForWebContents(event.sender);
    if (!windowId) {
      return null;
    }
    return deepLinkService.consumePending(windowId);
  };
