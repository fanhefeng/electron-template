import { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { logger } from '../../services/logger-service';
import { updateService } from '../../services/update-service';
import type { SystemService } from '../../services/system-service/SystemService';

export const checkForUpdates = async (event: IpcMainInvokeEvent): Promise<void> => {
  logger.info('IPC: check for updates');
  const window = BrowserWindow.fromWebContents(event.sender);
  updateService.checkForUpdates(window ?? undefined);
};

export const applyUpdate = async (_event: IpcMainInvokeEvent): Promise<void> => {
  logger.info('IPC: apply update');
  updateService.applyUpdate();
};

export const registerUpdaterListeners = (
  browserWindow: BrowserWindow,
  systemService?: SystemService
): void => {
  updateService.registerListeners(browserWindow, systemService);
};
