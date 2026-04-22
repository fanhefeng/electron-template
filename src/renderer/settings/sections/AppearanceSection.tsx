import { useMemo } from "react";
import type { FontAsset } from "@shared/fonts";
import { SYSTEM_FONT_ID, SYSTEM_FONT_STACK } from "@shared/fonts";
import { SettingRow } from "../components/SettingRow";
import { selectClass } from "../components/styles";
import { ThemePicker } from "./theme/ThemePicker";
import type { SettingsSectionProps } from "./types";

interface AppearanceSectionProps extends SettingsSectionProps {
  fonts: FontAsset[];
}

export const AppearanceSection = ({ settings, fonts, onUpdate, t }: AppearanceSectionProps) => {
  const currentFont = useMemo(() => fonts.find((f) => f.id === settings.fontFamily), [fonts, settings.fontFamily]);

  const previewFontFamily = useMemo(() => {
    if (!currentFont || currentFont.id === SYSTEM_FONT_ID) {
      return `var(--app-font-family, ${SYSTEM_FONT_STACK})`;
    }
    return `"${currentFont.cssFamily}", ${SYSTEM_FONT_STACK}`;
  }, [currentFont]);

  const handleThemeChange = (themeId: string) => {
    onUpdate({ themeId });
  };

  return (
    <div>
      {/* Theme picker */}
      <ThemePicker activeThemeId={settings.themeId} onThemeChange={handleThemeChange} t={t} />

      {/* Font selector */}
      <div className="divide-y divide-border-primary [margin-block-start:1.5rem]">
        <SettingRow label={t("settings.font.label")}>
          <select
            value={settings.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className={selectClass}
          >
            {fonts.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
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
