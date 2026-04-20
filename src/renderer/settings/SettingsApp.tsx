import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK } from "@shared/fonts";

const initialSettings: AppSettings = {
  theme: "light",
  autoLaunch: false,
  enableNotifications: true,
  fontFamily: SYSTEM_FONT_ID,
};

export const SettingsApp = () => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    const api = window.settingsAPI;

    if (!api || dataLoadedRef.current) {
      return;
    }

    dataLoadedRef.current = true;

    api
      .getSettings()
      .then(setSettings)
      .catch((error) => console.error("[settings] Failed to load settings", error));

    api
      .getAvailableFonts()
      .then(setFonts)
      .catch((error) => console.error("[settings] Failed to load fonts", error));
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
      .catch((error) => console.error("[settings] Failed to save settings", error));
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
      <h2>Settings</h2>
      <label style={{ display: "block", marginBottom: "1rem" }}>
        Theme &nbsp;
        <select
          value={settings.theme}
          onChange={(event) => setSettings((prev) => ({ ...prev, theme: event.target.value as "light" | "dark" }))}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label style={{ display: "block", marginBottom: "1rem" }}>
        <input
          type="checkbox"
          checked={settings.autoLaunch}
          onChange={(event) => setSettings((prev) => ({ ...prev, autoLaunch: event.target.checked }))}
        />
        Auto Launch at startup
      </label>
      <label style={{ display: "block", marginBottom: "1rem" }}>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={(event) => setSettings((prev) => ({ ...prev, enableNotifications: event.target.checked }))}
        />
        Enable Notifications
      </label>
      <label style={{ display: "block", marginBottom: "1rem" }}>
        Font Family
        <select
          value={settings.fontFamily}
          onChange={(event) => setSettings((prev) => ({ ...prev, fontFamily: event.target.value }))}
          style={{ display: "block", marginTop: "0.5rem" }}
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
          marginBottom: "1rem",
          fontFamily: previewFontFamily,
        }}
      >
        Font Preview: The quick brown fox jumps over the lazy dog.
      </div>
      <button type="submit">Save Settings</button>
    </form>
  );
};
