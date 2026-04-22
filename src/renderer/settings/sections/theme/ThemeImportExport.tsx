import { useRef } from "react";
import type { ThemeId, ExportedTheme, ThemeDefinition } from "@shared/theme";

interface ThemeImportExportProps {
  onImported: (theme: ThemeDefinition) => void;
  onError: (message: string) => void;
  t: (key: string) => string;
}

export const ThemeImportButton = ({ onImported, onError, t }: ThemeImportExportProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const theme = await window.settingsAPI?.importTheme(raw);
      if (theme) {
        onImported(theme);
      }
    } catch {
      onError(t("theme.import.error"));
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border border-border-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
      >
        {t("theme.picker.importTheme")}
      </button>
    </>
  );
};

export const exportThemeToFile = async (id: ThemeId): Promise<void> => {
  const exported: ExportedTheme | undefined = await window.settingsAPI?.exportTheme(id);
  if (!exported) return;

  const json = JSON.stringify(exported, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `theme-${exported.name.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
