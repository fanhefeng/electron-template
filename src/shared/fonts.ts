export const SYSTEM_FONT_ID = "system";

export const SYSTEM_FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export type FontFormat = "woff2" | "woff" | "truetype" | "opentype" | "embedded-opentype";

export interface FontAsset {
  id: string;
  label: string;
  cssFamily: string;
  source?: string;
  format?: FontFormat;
}
