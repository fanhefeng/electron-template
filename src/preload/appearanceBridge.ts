import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings } from "../shared/settings";
import type { FontAsset } from "../shared/fonts";
import type { ThemeDefinition } from "../shared/theme";
import { buildThemeCSSVars } from "../shared/theme";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK, buildFontFaceRule } from "../shared/fonts";
import { IPC_CHANNELS } from "../shared/ipcChannels";

const FONT_FACE_STYLE_ID = "app-font-face-definitions";
const THEME_STYLE_ID = "app-theme-variables";
const FONT_VARIABLE = "--app-font-family";

const LOCALE_TO_LANG: Record<string, string> = {
  en: "en",
  "zh-CN": "zh-CN",
};

let fontCatalogPromise: Promise<Map<string, FontAsset>> | null = null;
const injectedFonts = new Set<string>();

export const initializeAppearanceBridge = (): void => {
  contextBridge.exposeInMainWorld("app", {
    getMessages: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MESSAGES) as Promise<Record<string, string>>,
    onSettingsUpdated: (callback: (_event: Electron.IpcRendererEvent, settings: AppSettings) => void) =>
      ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATED, callback),
    offSettingsUpdated: (callback: (_event: Electron.IpcRendererEvent, settings: AppSettings) => void) =>
      ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_UPDATED, callback),
    onThemeUpdated: (callback: (_event: Electron.IpcRendererEvent, theme: ThemeDefinition) => void) =>
      ipcRenderer.on(IPC_CHANNELS.THEME_UPDATED, callback),
    offThemeUpdated: (callback: (_event: Electron.IpcRendererEvent, theme: ThemeDefinition) => void) =>
      ipcRenderer.removeListener(IPC_CHANNELS.THEME_UPDATED, callback),
  });

  ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATED, (_event, settings: AppSettings) => {
    fontCatalogPromise = null;
    void applyAppearance(settings).catch((error) =>
      console.error("[appearanceBridge] Failed to apply appearance", error)
    );
  });

  ipcRenderer.on(IPC_CHANNELS.THEME_UPDATED, (_event, theme: ThemeDefinition) => {
    void applyTheme(theme).catch((error) => console.error("[appearanceBridge] Failed to apply theme", error));
  });

  void (ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS) as Promise<AppSettings>)
    .then((settings) => applyAppearance(settings))
    .catch((error) => console.error("[appearanceBridge] Failed to apply initial settings", error));

  void (ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_THEME) as Promise<ThemeDefinition>)
    .then((theme) => applyTheme(theme))
    .catch((error) => console.error("[appearanceBridge] Failed to apply initial theme", error));
};

const applyTheme = async (theme: ThemeDefinition): Promise<void> => {
  await ensureDocumentReady();

  const cssText = buildThemeCSSVars(theme);
  let styleEl = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = THEME_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `:root {\n${cssText}\n}`;

  document.documentElement.style.colorScheme = theme.colorScheme;
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

  if (settings.locale) {
    const effectiveLocale =
      settings.locale === "system" ? (navigator.language.startsWith("zh") ? "zh-CN" : "en") : settings.locale;
    const lang = LOCALE_TO_LANG[effectiveLocale];
    if (lang) {
      document.documentElement.lang = lang;
    }
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
  if (injectedFonts.has(font.id)) {
    return;
  }

  const fontFace = buildFontFaceRule(font);
  if (!fontFace) return;

  const styleElement = getStyleElement();
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
