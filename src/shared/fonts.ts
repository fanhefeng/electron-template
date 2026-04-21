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

const escapeCssString = (value: string): string => value.replace(/[\\'"\n\r]/g, (ch) => `\\${ch}`);

export const buildFontFaceRule = (font: FontAsset): string | null => {
  if (!font.source || !font.format) return null;
  const family = escapeCssString(font.cssFamily);
  const source = escapeCssString(font.source);
  return `@font-face { font-family: "${family}"; src: url('${source}') format('${font.format}'); font-display: swap; }`;
};

export const buildFontFaceCSS = (fonts: FontAsset[]): string => fonts.map(buildFontFaceRule).filter(Boolean).join("\n");
