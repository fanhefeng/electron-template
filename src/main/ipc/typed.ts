import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { IpcChannel, IpcContract } from '../../shared/ipc/schema';

export function handleTyped<C extends IpcChannel>(
  channel: C,
  handler: (event: IpcMainInvokeEvent, payload: IpcContract[C]['req']) => Promise<IpcContract[C]['res']> | IpcContract[C]['res']
): void {
  ipcMain.handle(channel, handler as any);
}