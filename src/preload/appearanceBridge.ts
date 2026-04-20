import { ipcRenderer } from "electron";
import type { AppSettings } from "../shared/settings";
import type { FontAsset } from "../shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK } from "../shared/fonts";
import { IPC_CHANNELS } from "../shared/ipcChannels";

const FONT_FACE_STYLE_ID = "app-font-face-definitions";
const FONT_VARIABLE = "--app-font-family";

let fontCatalogPromise: Promise<Map<string, FontAsset>> | null = null;
const injectedFonts = new Set<string>();

export const initializeAppearanceBridge = (): void => {
  ipcRenderer.on("settings:updated", (_event, settings: AppSettings) => {
    fontCatalogPromise = null;
    void applyAppearance(settings);
  });

  void (ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS) as Promise<AppSettings>)
    .then((settings) => applyAppearance(settings))
    .catch((error) => console.error("[appearanceBridge] Failed to apply initial settings", error));
};

const applyAppearance = async (settings: AppSettings): Promise<void> => {
  await ensureDocumentReady();
  const catalog = await getFontCatalog();
  const font = catalog.get(settings.fontFamily) ?? catalog.get(SYSTEM_FONT_ID);
  if (!font) {
    return;
  }

  if (font.source && font.format) {
    injectFontFace(font);
  }

  const fontStack = font.id === SYSTEM_FONT_ID ? SYSTEM_FONT_STACK : `"${font.cssFamily}", ${SYSTEM_FONT_STACK}`;
  document.documentElement.style.setProperty(FONT_VARIABLE, fontStack);
  if (document.body) {
    document.body.style.fontFamily = `var(${FONT_VARIABLE}, ${SYSTEM_FONT_STACK})`;
  }
};

const getFontCatalog = async (): Promise<Map<string, FontAsset>> => {
  if (!fontCatalogPromise) {
    fontCatalogPromise = (ipcRenderer.invoke(IPC_CHANNELS.LIST_FONTS) as Promise<FontAsset[]>)
      .then((fonts) => new Map(fonts.map((font: FontAsset) => [font.id, font])))
      .catch((error) => {
        console.error("[appearanceBridge] Failed to load font catalog", error);
        fontCatalogPromise = null;
        return new Map<string, FontAsset>();
      });
  }

  return fontCatalogPromise;
};

const injectFontFace = (font: FontAsset): void => {
  if (!font.source || !font.format || injectedFonts.has(font.id)) {
    return;
  }

  const styleElement = getStyleElement();
  const fontFace = `@font-face { font-family: "${font.cssFamily}"; src: url('${font.source}') format('${font.format}'); font-display: swap; }`;
  styleElement.appendChild(document.createTextNode(`${fontFace}\n`));
  injectedFonts.add(font.id);
};

const getStyleElement = (): HTMLStyleElement => {
  let styleElement = document.getElementById(FONT_FACE_STYLE_ID) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = FONT_FACE_STYLE_ID;
    document.head.appendChild(styleElement);
  }

  return styleElement;
};

const ensureDocumentReady = async (): Promise<void> => {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    return;
  }

  await new Promise<void>((resolve) => {
    window.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
};
