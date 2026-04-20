import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK } from "@shared/fonts";
import { useI18n } from "../hooks/useI18n";

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

    styleElement.textContent = fonts
      .filter((font) => font.source && font.format)
      .map(
        (font) =>
          `@font-face { font-family: "${font.cssFamily}"; src: url('${font.source}') format('${font.format}'); font-display: swap; }`
      )
      .join("\n");

    return () => {
      styleElement?.remove();
    };
  }, [fonts]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.settingsAPI
      ?.updateSettings(settings)
      .then((updated) => setSettings(updated))
      .catch(console.error);
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
    <form onSubmit={handleSubmit} style={{ padding: "2rem", fontFamily: "var(--app-font-family, system-ui)" }}>
      <h2>{t("settings.title")}</h2>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        {t("settings.theme.label")} &nbsp;
        <select
          value={settings.theme}
          onChange={(event) => setSettings((prev) => ({ ...prev, theme: event.target.value as "light" | "dark" }))}
        >
          <option value="light">{t("settings.theme.light")}</option>
          <option value="dark">{t("settings.theme.dark")}</option>
        </select>
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        <input
          type="checkbox"
          checked={settings.autoLaunch}
          onChange={(event) => setSettings((prev) => ({ ...prev, autoLaunch: event.target.checked }))}
        />
        {t("settings.autoLaunch")}
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={(event) => setSettings((prev) => ({ ...prev, enableNotifications: event.target.checked }))}
        />
        {t("settings.notifications")}
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        {t("settings.locale.label")}
        <select
          value={settings.locale}
          onChange={(event) =>
            setSettings((prev) => ({ ...prev, locale: event.target.value as AppSettings["locale"] }))
          }
          style={{ display: "block", marginBlockStart: "0.5rem" }}
        >
          <option value="system">{t("settings.locale.system")}</option>
          <option value="en">English</option>
          <option value="zh-CN">中文</option>
        </select>
      </label>

      <label style={{ display: "block", marginBlockEnd: "1rem" }}>
        {t("settings.font.label")}
        <select
          value={settings.fontFamily}
          onChange={(event) => setSettings((prev) => ({ ...prev, fontFamily: event.target.value }))}
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
          padding: "0.75rem",
          marginBlockEnd: "1rem",
          fontFamily: previewFontFamily,
        }}
      >
        {t("settings.font.preview")}
      </div>

      <button type="submit">{t("settings.button.save")}</button>
    </form>
  );
};
