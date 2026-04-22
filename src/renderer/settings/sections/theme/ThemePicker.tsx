import { useCallback, useEffect, useState } from "react";
import type { ThemeDefinition, ThemeId } from "@shared/theme";
import { DEFAULT_THEME_ID } from "@shared/themes";
import { ThemeCard } from "./ThemeCard";
import { ThemeEditorModal } from "./ThemeEditorModal";
import { ThemeImportButton, exportThemeToFile } from "./ThemeImportExport";
import { useLogger } from "../../../hooks/useLogger";

interface ThemePickerProps {
  activeThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  t: (key: string) => string;
}

export const ThemePicker = ({ activeThemeId, onThemeChange, t }: ThemePickerProps) => {
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeDefinition | undefined>();
  const [error, setError] = useState("");
  const logger = useLogger("ThemePicker");

  const loadThemes = useCallback(() => {
    window.settingsAPI
      ?.listThemes()
      .then(setThemes)
      .catch((err) => {
        logger.error("load-themes-failed", String(err));
      });
  }, [logger]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const handleSelect = (id: ThemeId) => {
    logger.click(`select theme: ${id}`);
    onThemeChange(id);
  };

  const handleEdit = (id: ThemeId) => {
    const theme = themes.find((th) => th.id === id);
    if (theme && !theme.builtIn) {
      setEditingTheme(theme);
      setEditorOpen(true);
    }
  };

  const handleDelete = async (id: ThemeId) => {
    if (!confirm(t("theme.picker.deleteConfirm"))) return;
    try {
      await window.settingsAPI?.deleteTheme(id);
      setError("");
      if (activeThemeId === id) {
        onThemeChange(DEFAULT_THEME_ID);
      }
      loadThemes();
    } catch (err) {
      logger.error("delete-theme-failed", String(err));
    }
  };

  const handleDuplicate = async (id: ThemeId) => {
    const source = themes.find((th) => th.id === id);
    if (!source) return;
    try {
      const created = await window.settingsAPI?.createTheme({
        name: `${source.builtIn ? t(source.name) : source.name} (copy)`,
        colorScheme: source.colorScheme,
        colors: { ...source.colors },
        spacing: source.spacing ? { ...source.spacing } : undefined,
        version: source.version,
      });
      if (created) {
        setError("");
        loadThemes();
      }
    } catch (err) {
      logger.error("duplicate-theme-failed", String(err));
    }
  };

  const handleExport = (id: ThemeId) => {
    exportThemeToFile(id).catch((err) => logger.error("export-theme-failed", String(err)));
  };

  const handleCreate = () => {
    setEditingTheme(undefined);
    setEditorOpen(true);
  };

  const handleEditorSave = async (data: Omit<ThemeDefinition, "id" | "builtIn">) => {
    try {
      if (editingTheme) {
        await window.settingsAPI?.updateTheme(editingTheme.id, data);
        if (activeThemeId === editingTheme.id) {
          onThemeChange(editingTheme.id);
        }
      } else {
        const created = await window.settingsAPI?.createTheme(data);
        if (created) {
          onThemeChange(created.id);
        }
      }
      setError("");
      setEditorOpen(false);
      setEditingTheme(undefined);
      loadThemes();
    } catch (err) {
      logger.error("save-theme-failed", String(err));
    }
  };

  const handleImported = (theme: ThemeDefinition) => {
    setError("");
    loadThemes();
    onThemeChange(theme.id);
  };

  const builtInThemes = themes.filter((th) => th.builtIn);
  const customThemes = themes.filter((th) => !th.builtIn);

  return (
    <div>
      {/* Built-in themes */}
      <h4 className="mb-2 text-xs font-semibold text-text-tertiary uppercase">{t("theme.picker.builtIn")}</h4>
      <div className="grid grid-cols-3 gap-2">
        {builtInThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeThemeId === theme.id}
            onSelect={handleSelect}
            onExport={handleExport}
            onDuplicate={handleDuplicate}
            t={t}
          />
        ))}
      </div>

      {/* Custom themes */}
      {customThemes.length > 0 && (
        <>
          <h4 className="mb-2 text-xs font-semibold text-text-tertiary uppercase [margin-block-start:1rem]">
            {t("theme.picker.custom")}
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {customThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={activeThemeId === theme.id}
                onSelect={handleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onExport={handleExport}
                onDuplicate={handleDuplicate}
                t={t}
              />
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 [margin-block-start:1rem]">
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg border border-border-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
        >
          {t("theme.picker.createCustom")}
        </button>
        <ThemeImportButton onImported={handleImported} onError={setError} t={t} />
      </div>

      {error && <p className="mt-2 text-xs text-status-error">{error}</p>}

      {editorOpen && (
        <ThemeEditorModal
          initialTheme={editingTheme}
          onSave={handleEditorSave}
          onCancel={() => {
            setEditorOpen(false);
            setEditingTheme(undefined);
          }}
          t={t}
        />
      )}
    </div>
  );
};
