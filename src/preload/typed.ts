import { ipcRenderer } from 'electron';
import type { IpcChannel, IpcContract } from '../shared/ipc/schema';

export function invokeTyped<C extends IpcChannel>(
  channel: C,
  payload: IpcContract[C]['req']
): Promise<IpcContract[C]['res']> {
  return ipcRenderer.invoke(channel, payload as any);
}