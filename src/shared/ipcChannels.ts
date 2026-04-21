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
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type OpenWindowPayload = "about" | "settings";
