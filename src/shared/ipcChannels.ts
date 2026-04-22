export const IPC_CHANNELS = {
  CHECK_FOR_UPDATES: "app/check-for-updates",
  APPLY_UPDATE: "app/apply-update",
  GET_SETTINGS: "settings/get",
  UPDATE_SETTINGS: "settings/update",
  LIST_FONTS: "fonts/list",
  GET_APP_VERSION: "app/version",
  OPEN_WINDOW: "window/open",
  DEEP_LINK_NAVIGATE: "deep-link/navigate",
  GET_MESSAGES: "i18n/messages",
  SETTINGS_UPDATED: "settings:updated",
  LOG_FROM_RENDERER: "log/from-renderer",
  LIST_THEMES: "theme/list",
  GET_THEME: "theme/get",
  CREATE_THEME: "theme/create",
  UPDATE_THEME: "theme/update",
  DELETE_THEME: "theme/delete",
  IMPORT_THEME: "theme/import",
  EXPORT_THEME: "theme/export",
  GET_ACTIVE_THEME: "theme/active",
  THEME_UPDATED: "theme:updated",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type OpenWindowPayload = "about" | "settings";
