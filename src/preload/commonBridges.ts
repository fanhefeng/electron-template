import { initializeAppearanceBridge } from "./appearanceBridge";
import { initializeLogBridge } from "./logBridge";

/**
 * Every preload wires the same two shared bridges: renderer→main logging
 * (`window.log`) and the appearance/theme injector (`window.app`, which injects
 * theme CSS vars + @font-face + `lang` before React mounts). Centralized so a
 * new window can't forget one, and so they always initialize in the same order.
 */
export const initializeCommonBridges = (logSource: string): void => {
  initializeLogBridge(logSource);
  initializeAppearanceBridge();
};
