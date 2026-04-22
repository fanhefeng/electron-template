import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings } from "@shared/settings";
import { defaultSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import { buildFontFaceCSS } from "@shared/fonts";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";
import { GeneralSection } from "./sections/GeneralSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { LanguageSection } from "./sections/LanguageSection";

type SectionId = "general" | "appearance" | "language";

const NAV_ITEMS: { id: SectionId; labelKey: string }[] = [
  { id: "general", labelKey: "settings.nav.general" },
  { id: "appearance", labelKey: "settings.nav.appearance" },
  { id: "language", labelKey: "settings.nav.language" },
];

export const SettingsApp = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [saveError, setSaveError] = useState("");
  const dataLoadedRef = useRef(false);
  const { t } = useI18n();
  const logger = useLogger("SettingsApp");

  useEffect(() => {
    const api = window.settingsAPI;
    if (!api || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    api
      .getSettings()
      .then(setSettings)
      .catch((error) => logger.error("load-settings", String(error)));
    api
      .getAvailableFonts()
      .then(setFonts)
      .catch((error) => logger.error("load-fonts", String(error)));
  }, [logger]);

  useEffect(() => {
    if (!fonts.length) return;
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

  const handleUpdate = useCallback(
    (patch: Partial<AppSettings>) => {
      const key = Object.keys(patch)[0];
      const val = Object.values(patch)[0];
      logger.change(String(key), String(val));
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [logger]
  );

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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-screen overflow-hidden bg-bg-primary text-text-primary"
      style={{ fontFamily: "var(--app-font-family, system-ui)" }}
    >
      {/* Sidebar */}
      <nav className="flex w-44 shrink-0 flex-col border-e border-border-primary bg-bg-secondary px-3 py-5">
        <h2 className="mbe-4 ps-2 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
          {t("settings.title")}
        </h2>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  logger.click(`nav: ${item.id}`);
                  setActiveSection(item.id);
                }}
                className={`w-full rounded-lg px-3 py-1.5 text-start text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? "bg-accent-primary text-text-inverse shadow-sm"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {t(item.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="mbe-4 text-base font-semibold text-text-primary">
            {t(NAV_ITEMS.find((n) => n.id === activeSection)?.labelKey ?? "")}
          </h3>

          {activeSection === "general" && <GeneralSection settings={settings} onUpdate={handleUpdate} t={t} />}
          {activeSection === "appearance" && (
            <AppearanceSection settings={settings} fonts={fonts} onUpdate={handleUpdate} t={t} />
          )}
          {activeSection === "language" && <LanguageSection settings={settings} onUpdate={handleUpdate} t={t} />}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-bs border-border-primary px-6 py-3">
          <button
            type="submit"
            className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-accent-hover active:bg-accent-active"
          >
            {t("settings.button.save")}
          </button>
          {saveError && <span className="text-sm text-status-error">{saveError}</span>}
        </div>
      </div>
    </form>
  );
};
