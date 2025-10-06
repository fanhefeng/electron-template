import type { IpcMainInvokeEvent } from 'electron';
import { FontAsset } from '../../../shared/fonts';
import { fontService } from '../../services/font-service';

export const listFonts = async (_event: IpcMainInvokeEvent): Promise<FontAsset[]> => {
  return fontService.listFonts({ forceRefresh: true });
};
