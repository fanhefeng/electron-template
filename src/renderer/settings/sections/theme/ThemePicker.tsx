import { useCallback, useEffect, useState } from "react";
import type { ThemeDefinition, ThemeId } from "@shared/theme";
import { ThemeCard } from "./ThemeCard";
import { ThemeEditorModal } from "./ThemeEditorModal";
import { ThemeImportButton, exportThemeToFile } from "./ThemeImportExport";
import { ConfirmDialog } from "../../components/ConfirmDialog";
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
  // id of the theme awaiting delete confirmation (null = no dialog open).
  const [pendingDeleteId, setPendingDeleteId] = useState<ThemeId | null>(null);
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

  useEffect(() => {
    // Keep the list fresh when themes change elsewhere (another window's edit,
    // live re-apply of the active theme) — without this the picker shows a
    // stale set until remount.
    const appBridge = window.app;
    if (!appBridge) return;
    const handleThemeUpdated = () => loadThemes();
    appBridge.onThemeUpdated(handleThemeUpdated);
    return () => {
      appBridge.offThemeUpdated(handleThemeUpdated);
    };
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

  const handleDelete = (id: ThemeId) => {
    // Open the accessible confirm dialog instead of the native blocking
    // confirm() (whose OS-provided buttons can't be localized or themed).
    logger.click(`request delete theme: ${id}`);
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await window.settingsAPI?.deleteTheme(id);
      setError("");
      // No onThemeChange here: when the deleted theme was active, the main-side
      // handler already persisted themeId=default and broadcast settings:updated
      // (which updates this picker's activeThemeId) — a renderer call would just
      // write the same value to disk a second time.
      loadThemes();
    } catch (err) {
      logger.error("delete-theme-failed", String(err));
      // Surface the failure in the shared error slot — a silent rejection
      // looks like the click simply did nothing.
      setError(t("theme.picker.deleteFailed"));
    }
  };

  const handleDuplicate = async (id: ThemeId) => {
    const source = themes.find((th) => th.id === id);
    if (!source) return;
    try {
      const created = await window.settingsAPI?.createTheme({
        name: `${source.builtIn ? t(source.name) : source.name}${t("theme.picker.copySuffix")}`,
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
      setError(t("theme.picker.duplicateFailed"));
    }
  };

  const handleExport = (id: ThemeId) => {
    exportThemeToFile(id).catch((err) => {
      logger.error("export-theme-failed", String(err));
      setError(t("theme.export.error"));
    });
  };

  const handleCreate = () => {
    setEditingTheme(undefined);
    setEditorOpen(true);
  };

  const handleEditorSave = async (data: Omit<ThemeDefinition, "id" | "builtIn">) => {
    try {
      if (editingTheme) {
        // No onThemeChange for the active theme: ThemeService.updateTheme
        // already re-applies + broadcasts theme:updated when the edited theme
        // is active; re-persisting the unchanged themeId would only add a
        // redundant disk write + broadcast.
        await window.settingsAPI?.updateTheme(editingTheme.id, data);
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
      // Re-throw so the modal (which stays open with the user's edits) can
      // show the failure inline — the picker's error slot sits BEHIND the
      // modal overlay and would be invisible.
      throw err;
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
      <h4 className="mbe-2 text-xs font-semibold text-text-tertiary uppercase">{t("theme.picker.builtIn")}</h4>
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
          <h4 className="mbe-2 mbs-4 text-xs font-semibold text-text-tertiary uppercase">{t("theme.picker.custom")}</h4>
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

      {error && <p className="mbs-2 text-xs text-status-error">{error}</p>}

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

      {pendingDeleteId !== null && (
        <ConfirmDialog
          message={t("theme.picker.deleteConfirm")}
          confirmLabel={t("theme.picker.deleteTheme")}
          cancelLabel={t("theme.editor.cancel")}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
};
