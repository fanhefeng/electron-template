import { app, Menu } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import { logger } from "../services/logger-service";
import { i18nService } from "../services/i18n-service";
import type { WindowManager } from "../window-manager/WindowManager";

const isMac = process.platform === "darwin";

export const buildAppMenu = (windowManager: WindowManager): void => {
  logger.info("[menu] buildAppMenu called");

  const t = (key: string, params?: Record<string, string>) => i18nService.t(key, params);
  const appName = app.getName();

  const openWindow = (id: "about" | "settings") => {
    try {
      windowManager.open(id);
    } catch (error) {
      logger.error(`[menu] Failed to open window: ${id}`, error);
    }
  };

  const macAppMenu: MenuItemConstructorOptions = {
    label: appName,
    submenu: [
      { label: t("menu.app.about", { appName }), click: () => openWindow("about") },
      { type: "separator" },
      { label: t("menu.app.settings"), click: () => openWindow("settings"), accelerator: "CmdOrCtrl+," },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { label: t("menu.app.quit", { appName }), role: "quit" },
    ],
  };

  const fileMenu: MenuItemConstructorOptions = {
    label: t("menu.file"),
    submenu: [
      { label: t("menu.file.settings"), click: () => openWindow("settings"), accelerator: "CmdOrCtrl+," },
      { type: "separator" },
      { label: t("menu.file.quit"), role: "quit" },
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: t("menu.edit"),
    submenu: [
      { label: t("menu.edit.undo"), role: "undo" },
      { label: t("menu.edit.redo"), role: "redo" },
      { type: "separator" },
      { label: t("menu.edit.cut"), role: "cut" },
      { label: t("menu.edit.copy"), role: "copy" },
      { label: t("menu.edit.paste"), role: "paste" },
      { label: t("menu.edit.selectAll"), role: "selectAll" },
    ],
  };

  const windowMenu: MenuItemConstructorOptions = {
    label: t("menu.window"),
    submenu: [
      { label: t("menu.window.minimize"), role: "minimize" },
      { label: t("menu.window.close"), role: "close" },
    ],
  };

  const helpMenu: MenuItemConstructorOptions = {
    label: t("menu.help"),
    submenu: [
      {
        label: t("menu.help.viewLogs"),
        click: () => {
          logger.info("[menu] View Logs clicked");
          logger.openLogFile().catch((error) => {
            logger.error("[menu] Failed to open log file", error);
          });
        },
      },
      ...(isMac
        ? []
        : [
            { type: "separator" as const },
            {
              label: t("menu.app.about", { appName }),
              click: () => openWindow("about"),
            },
          ]),
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : [fileMenu]),
    editMenu,
    ...(isMac ? [windowMenu] : []),
    helpMenu,
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  logger.info("[menu] Application menu set");
};
