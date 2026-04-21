export type RendererLogLevel = "info" | "warn" | "error" | "debug";

export interface RendererLogEntry {
  level: RendererLogLevel;
  source: string;
  action: string;
  details?: string;
}
