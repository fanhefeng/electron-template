import { useMemo } from "react";
import type { FontAsset } from "@shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK } from "@shared/fonts";
import { SettingRow } from "../components/SettingRow";
import { selectClass } from "../components/styles";
import { ThemePicker } from "./theme/ThemePicker";
import type { SettingsSectionProps } from "./types";

interface AppearanceSectionProps extends SettingsSectionProps {
  fonts: FontAsset[];
  onThemeChange: (themeId: string) => void;
}

export const AppearanceSection = ({ settings, fonts, onUpdate, onThemeChange, t }: AppearanceSectionProps) => {
  const currentFont = useMemo(() => fonts.find((f) => f.id === settings.fontFamily), [fonts, settings.fontFamily]);

  const previewFontFamily = useMemo(() => {
    if (!currentFont || currentFont.id === SYSTEM_FONT_ID) {
      return `var(--app-font-family, ${SYSTEM_FONT_STACK})`;
    }
    return `"${currentFont.cssFamily}", ${SYSTEM_FONT_STACK}`;
  }, [currentFont]);

  return (
    <div>
      {/* Theme picker — selection applies immediately (no Save needed) */}
      <ThemePicker activeThemeId={settings.themeId} onThemeChange={onThemeChange} t={t} />

      {/* Font selector */}
      <div className="divide-y divide-border-primary [margin-block-start:1.5rem]">
        <SettingRow label={t("settings.font.label")} htmlFor="setting-font">
          <select
            id="setting-font"
            value={settings.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className={selectClass}
          >
            {fonts.map((font) => (
              <option key={font.id} value={font.id}>
                {/* The system font's label is resolved through i18n (same pattern
                    as built-in theme names); file-derived labels stay literal. */}
                {font.id === SYSTEM_FONT_ID ? t("settings.font.systemDefault") : font.label}
              </option>
            ))}
          </select>
        </SettingRow>
      </div>

      {/* Font preview */}
      <div
        className="rounded-lg border border-dashed border-border-secondary px-4 py-3 text-sm text-text-secondary [margin-block-start:1rem]"
        style={{ fontFamily: previewFontFamily }}
      >
        {t("settings.font.preview")}
      </div>
    </div>
  );
};
