import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK, buildFontFaceCSS } from "@shared/fonts";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";

const initialSettings: AppSettings = {
  theme: "light",
  autoLaunch: false,
  enableNotifications: true,
  fontFamily: SYSTEM_FONT_ID,
  locale: "system",
};

export const SettingsApp = () => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const dataLoadedRef = useRef(false);
  const { t } = useI18n();
  const logger = useLogger("SettingsApp");

  useEffect(() => {
    const api = window.settingsAPI;

    if (!api || dataLoadedRef.current) {
      return;
    }

    dataLoadedRef.current = true;

    api.getSettings().then(setSettings).catch(console.error);
    api.getAvailableFonts().then(setFonts).catch(console.error);
  }, []);

  useEffect(() => {
    if (!fonts.length) {
      return;
    }

    const styleElementId = "settings-font-previews";
    let styleElement = document.getElementById(styleElementId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleElementId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = buildFontFaceCSS(fonts);

    return () => {
      styleElement?.remove();
    };
  }, [fonts]);

  const [saveError, setSaveError] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    logger.submit("Settings form");
    const previousSettings = { ...settings };
    window.settingsAPI
      ?.updateSettings(settings)
      .then((updated) => setSettings(updated))
      .catch((error) => {
        logger.error("save-failed", String(error));
        setSettings(previousSettings);
        setSaveError(t("settings.error.saveFailed"));
      });
  };

  const currentFont = useMemo(
    () => fonts.find((font) => font.id === settings.fontFamily),
    [fonts, settings.fontFamily]
  );

  const previewFontFamily = useMemo(() => {
    if (!currentFont || currentFont.id === SYSTEM_FONT_ID) {
      return `var(--app-font-family, ${SYSTEM_FONT_STACK})`;
    }

    return `"${currentFont.cssFamily}", ${SYSTEM_FONT_STACK}`;
  }, [currentFont]);

  return (
    <form
      onSubmit={handleSubmit}
      style={{ paddingBlock: "2rem", paddingInline: "2rem", fontFamily: "var(--app-font-family, system-ui)" }}
    >
      <h2>{t("settings.title")}</h2>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        {t("settings.theme.label")} &nbsp;
        <select
          value={settings.theme}
          onChange={(event) => {
            logger.change("theme select", event.target.value);
            setSettings((prev) => ({ ...prev, theme: event.target.value as "light" | "dark" }));
          }}
        >
          <option value="light">{t("settings.theme.light")}</option>
          <option value="dark">{t("settings.theme.dark")}</option>
        </select>
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        <input
          type="checkbox"
          checked={settings.autoLaunch}
          onChange={(event) => {
            logger.change("autoLaunch checkbox", String(event.target.checked));
            setSettings((prev) => ({ ...prev, autoLaunch: event.target.checked }));
          }}
        />
        {t("settings.autoLaunch")}
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={(event) => {
            logger.change("notifications checkbox", String(event.target.checked));
            setSettings((prev) => ({ ...prev, enableNotifications: event.target.checked }));
          }}
        />
        {t("settings.notifications")}
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        {t("settings.locale.label")}
        <select
          value={settings.locale}
          onChange={(event) => {
            logger.change("locale select", event.target.value);
            setSettings((prev) => ({ ...prev, locale: event.target.value as AppSettings["locale"] }));
          }}
          style={{ display: "block", marginBlockStart: "0.5rem" }}
        >
          <option value="system">{t("settings.locale.system")}</option>
          <option value="en">{t("settings.locale.en")}</option>
          <option value="zh-CN">{t("settings.locale.zhCN")}</option>
        </select>
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        {t("settings.font.label")}
        <select
          value={settings.fontFamily}
          onChange={(event) => {
            logger.change("font select", event.target.value);
            setSettings((prev) => ({ ...prev, fontFamily: event.target.value }));
          }}
          style={{ display: "block", marginBlockStart: "0.5rem" }}
        >
          {fonts.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </label>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          paddingBlock: "0.75rem",
          paddingInline: "0.75rem",
          marginBlockEnd: "1rem",
          fontFamily: previewFontFamily,
        }}
      >
        {t("settings.font.preview")}
      </div>

      {saveError && <p style={{ color: "red", marginBlockEnd: "1rem" }}>{saveError}</p>}
      <button type="submit">{t("settings.button.save")}</button>
    </form>
  );
};
