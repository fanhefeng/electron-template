import type { AppSettings } from "../../shared/settings";
import type { FontAsset } from "../../shared/fonts";
import type { OpenWindowPayload } from "../../shared/ipcChannels";
import type { NotificationPayload } from "../../shared/notification";
import type { ThemeDefinition, ThemeId, ExportedTheme } from "../../shared/theme";

export type IpcContract = {
  "app/check-for-updates": { req: void; res: void };
  "app/apply-update": { req: void; res: void };
  "settings/get": { req: void; res: AppSettings };
  "settings/update": { req: Partial<AppSettings>; res: AppSettings };
  "fonts/list": { req: void; res: FontAsset[] };
  "app/version": { req: void; res: string };
  "window/open": { req: OpenWindowPayload; res: void };
  "i18n/messages": { req: void; res: Record<string, string> };
  "notification/show": { req: NotificationPayload; res: void };
  "theme/list": { req: void; res: ThemeDefinition[] };
  "theme/get": { req: ThemeId; res: ThemeDefinition | null };
  "theme/create": { req: Omit<ThemeDefinition, "id" | "builtIn">; res: ThemeDefinition };
  "theme/update": { req: { id: ThemeId; patch: Partial<ThemeDefinition> }; res: ThemeDefinition };
  "theme/delete": { req: ThemeId; res: void };
  "theme/import": { req: unknown; res: ThemeDefinition };
  "theme/export": { req: ThemeId; res: ExportedTheme };
  "theme/active": { req: void; res: ThemeDefinition };
};

export type IpcChannel = keyof IpcContract;
