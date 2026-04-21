import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { RendererLogLevel, RendererLogEntry } from "../shared/logTypes";

export const initializeLogBridge = (source: string): void => {
  const send = (level: RendererLogLevel, action: string, details?: string): void => {
    const entry: RendererLogEntry = { level, source, action, details };
    ipcRenderer.send(IPC_CHANNELS.LOG_FROM_RENDERER, entry);
  };

  contextBridge.exposeInMainWorld("log", {
    info: (action: string, details?: string) => send("info", action, details),
    warn: (action: string, details?: string) => send("warn", action, details),
    error: (action: string, details?: string) => send("error", action, details),
    debug: (action: string, details?: string) => send("debug", action, details),
  });
};
