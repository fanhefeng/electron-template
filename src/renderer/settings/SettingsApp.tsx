import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings } from "@shared/settings";
import { defaultSettings } from "@shared/settings";
import type { FontAsset } from "@shared/fonts";
import { buildFontFaceCSS } from "@shared/fonts";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";
import { useDeepLink } from "../hooks/useDeepLink";
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
  // Tracks unsaved local edits so a settings broadcast from another window
  // doesn't clobber what the user is currently editing.
  const dirtyRef = useRef(false);
  // Mirrors the latest settings so event handlers can read the current value
  // without an impure read inside a setState updater (StrictMode-safe).
  const settingsRef = useRef(settings);
  const { t, ready } = useI18n();
  const logger = useLogger("SettingsApp");

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    // Localize the OS window title (the static HTML <title> is only a
    // pre-load fallback); re-runs when the locale dictionary changes.
    if (ready) document.title = `${t("app.title")} - ${t("settings.title")}`;
  }, [ready, t]);

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
    // Keep the form in sync when settings change elsewhere (theme applied live,
    // another window saved). With unsaved local edits only themeId is merged,
    // since theme selection persists immediately and is never "dirty".
    const appBridge = window.app;
    if (!appBridge) return;
    const handleSettingsUpdated = (_event: unknown, next: AppSettings) => {
      setSettings((prev) => (dirtyRef.current ? { ...prev, themeId: next.themeId } : next));
    };
    appBridge.onSettingsUpdated(handleSettingsUpdated);
    return () => {
      appBridge.offSettingsUpdated(handleSettingsUpdated);
    };
  }, []);

  // Deep links can target this window (electrontemplate://settings/...). The
  // template logs receipt; pass a callback to extend (e.g. jump to the section
  // named by payload.path).
  useDeepLink(window.settingsAPI, logger);

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
      dirtyRef.current = true;
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [logger]
  );

  const handleThemeChange = useCallback(
    (themeId: string) => {
      logger.change("themeId", themeId);
      // Clear any stale error from a previous failed apply before retrying.
      setSaveError("");
      // Read the current themeId from the ref (no impure read inside a setState
      // updater), so we can roll back if the immediate persist fails.
      const previousThemeId = settingsRef.current.themeId;
      setSettings((prev) => ({ ...prev, themeId }));
      // Theme selection applies immediately — consistent with the theme editor,
      // whose create/update/delete also take effect live. Other form fields
      // still persist only on Save.
      window.settingsAPI?.updateSettings({ themeId }).catch((error) => {
        logger.error("apply-theme-failed", String(error));
        setSaveError(t("settings.error.saveFailed"));
        // Roll back ONLY if this failed theme is still the selected one. If the
        // user has since picked another theme (rapid switching with a flaky
        // persist), a late rejection must not clobber the newer selection.
        setSettings((current) => (current.themeId === themeId ? { ...current, themeId: previousThemeId } : current));
      });
    },
    [logger, t]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    logger.submit("Settings form");
    window.settingsAPI
      ?.updateSettings(settings)
      .then(() => window.close())
      .catch((error) => {
        logger.error("save-failed", String(error));
        // Keep the edits on screen AND keep the dirty flag: the save never
        // reached disk, so the form intentionally diverges from disk until the
        // user retries Save. Clearing dirty here would let the next
        // settings:updated broadcast silently overwrite the still-displayed
        // edits the user believes are pending.
        setSaveError(t("settings.error.saveFailed"));
      });
  };

  // Gate the first paint on the i18n dictionary (blank frame beats a flash of
  // raw dotted keys). Hooks above still run; only the JSX is deferred.
  if (!ready) return null;

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
            <AppearanceSection
              settings={settings}
              fonts={fonts}
              onUpdate={handleUpdate}
              onThemeChange={handleThemeChange}
              t={t}
            />
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
