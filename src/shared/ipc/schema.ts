import type { AppSettings } from '../../shared/settings';
import type { FontAsset } from '../../shared/fonts';
import type { OpenWindowPayload } from '../../shared/ipcChannels';

export type IpcContract = {
  'app/check-for-updates': { req: void; res: void };
  'app/apply-update': { req: void; res: void };
  'settings/get': { req: void; res: AppSettings };
  'settings/update': { req: Partial<AppSettings>; res: AppSettings };
  'fonts/list': { req: void; res: FontAsset[] };
  'app/version': { req: void; res: string };
  'window/open': { req: OpenWindowPayload; res: void };
};

export type IpcChannel = keyof IpcContract;