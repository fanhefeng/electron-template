import { useCallback, useState } from "react";
import type { ThemeColors, ThemeDefinition, ThemeSpacing } from "@shared/theme";
import { DEFAULT_SPACING, THEME_SCHEMA_VERSION } from "@shared/theme";
import { ColorTokenEditor } from "./ColorTokenEditor";

type ColorGroup = {
  labelKey: string;
  keys: (keyof ThemeColors)[];
};

const COLOR_GROUPS: ColorGroup[] = [
  {
    labelKey: "theme.color.group.backgrounds",
    keys: ["bgPrimary", "bgSecondary", "bgTertiary"],
  },
  {
    labelKey: "theme.color.group.surfaces",
    keys: ["surfacePrimary", "surfaceHover", "surfaceActive"],
  },
  {
    labelKey: "theme.color.group.text",
    keys: ["textPrimary", "textSecondary", "textTertiary", "textInverse"],
  },
  {
    labelKey: "theme.color.group.borders",
    keys: ["borderPrimary", "borderSecondary"],
  },
  {
    labelKey: "theme.color.group.accent",
    keys: ["accentPrimary", "accentHover", "accentActive", "accentSubtle"],
  },
  {
    labelKey: "theme.color.group.status",
    keys: ["statusError", "statusWarning", "statusSuccess", "statusInfo"],
  },
  {
    labelKey: "theme.color.group.other",
    keys: ["focusRing", "scrollbarThumb", "scrollbarTrack"],
  },
];

const SPACING_KEYS: (keyof ThemeSpacing)[] = ["radiusSm", "radiusMd", "radiusLg", "radiusFull"];

interface ThemeEditorModalProps {
  initialTheme?: ThemeDefinition;
  onSave: (data: Omit<ThemeDefinition, "id" | "builtIn">) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export const ThemeEditorModal = ({ initialTheme, onSave, onCancel, t }: ThemeEditorModalProps) => {
  const [name, setName] = useState(initialTheme?.name ?? "");
  const [colorScheme, setColorScheme] = useState<"light" | "dark">(initialTheme?.colorScheme ?? "light");
  const [colors, setColors] = useState<ThemeColors>(
    initialTheme?.colors ?? {
      bgPrimary: "#ffffff",
      bgSecondary: "#f9fafb",
      bgTertiary: "#f3f4f6",
      surfacePrimary: "#ffffff",
      surfaceHover: "#f3f4f6",
      surfaceActive: "#e5e7eb",
      textPrimary: "#111827",
      textSecondary: "#6b7280",
      textTertiary: "#9ca3af",
      textInverse: "#ffffff",
      borderPrimary: "#e5e7eb",
      borderSecondary: "#d1d5db",
      accentPrimary: "#3b82f6",
      accentHover: "#2563eb",
      accentActive: "#1d4ed8",
      accentSubtle: "#eff6ff",
      statusError: "#ef4444",
      statusWarning: "#f59e0b",
      statusSuccess: "#22c55e",
      statusInfo: "#3b82f6",
      focusRing: "#3b82f6",
      scrollbarThumb: "#d1d5db",
      scrollbarTrack: "#f3f4f6",
    }
  );
  const [spacing, setSpacing] = useState<ThemeSpacing>(initialTheme?.spacing ?? { ...DEFAULT_SPACING });

  const handleColorChange = useCallback((key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSpacingChange = useCallback((key: keyof ThemeSpacing, value: string) => {
    setSpacing((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      colorScheme,
      colors,
      spacing,
      version: THEME_SCHEMA_VERSION,
    });
  };

  const isEditing = !!initialTheme;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 [padding-block-start:2rem]">
      <div className="flex max-h-[calc(100vh-4rem)] w-[36rem] flex-col rounded-lg bg-bg-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-5 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            {t(isEditing ? "theme.editor.title.edit" : "theme.editor.title.create")}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Name */}
          <div className="[margin-block-end:1rem]">
            <label className="mb-1 block text-xs font-medium text-text-secondary">{t("theme.editor.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Color scheme */}
          <div className="[margin-block-end:1rem]">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("theme.editor.colorScheme")}
            </label>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((scheme) => (
                <button
                  key={scheme}
                  type="button"
                  onClick={() => setColorScheme(scheme)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    colorScheme === scheme
                      ? "bg-accent-primary text-text-inverse"
                      : "bg-surface-hover text-text-secondary"
                  }`}
                >
                  {t(`theme.editor.colorScheme.${scheme}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Color groups */}
          {COLOR_GROUPS.map((group) => (
            <div key={group.labelKey} className="[margin-block-end:1rem]">
              <h4 className="mb-1 text-xs font-semibold text-text-tertiary uppercase">{t(group.labelKey)}</h4>
              {group.keys.map((key) => (
                <ColorTokenEditor
                  key={key}
                  tokenKey={key}
                  value={colors[key]}
                  label={t(`theme.color.${key}`)}
                  onChange={handleColorChange}
                />
              ))}
            </div>
          ))}

          {/* Spacing */}
          <div className="[margin-block-end:1rem]">
            <h4 className="mb-1 text-xs font-semibold text-text-tertiary uppercase">{t("theme.editor.spacing")}</h4>
            {SPACING_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{t(`theme.spacing.${key}`)}</span>
                <input
                  type="text"
                  value={spacing[key]}
                  onChange={(e) => handleSpacingChange(key, e.target.value)}
                  className="w-24 rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border-primary px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            {t("theme.editor.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
          >
            {t("theme.editor.save")}
          </button>
        </div>
      </div>
    </div>
  );
};
