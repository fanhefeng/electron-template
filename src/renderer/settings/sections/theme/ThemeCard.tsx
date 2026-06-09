import type { ThemeDefinition, ThemeId } from "@shared/theme";
import { PencilIcon, CopyIcon, DownloadIcon, TrashIcon } from "./icons";

interface ThemeCardProps {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: (id: ThemeId) => void;
  onEdit?: (id: ThemeId) => void;
  onDelete?: (id: ThemeId) => void;
  onExport: (id: ThemeId) => void;
  onDuplicate: (id: ThemeId) => void;
  t: (key: string) => string;
}

const SWATCH_KEYS = ["bgPrimary", "textPrimary", "accentPrimary", "surfacePrimary", "borderPrimary"] as const;

export const ThemeCard = ({
  theme,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onExport,
  onDuplicate,
  t,
}: ThemeCardProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(theme.id)}
      className={`group relative flex flex-col gap-2 rounded-lg border-2 p-3 text-start transition-colors ${
        isActive
          ? "border-accent-primary bg-accent-subtle"
          : "border-border-primary bg-surface-primary hover:border-border-secondary"
      }`}
    >
      {/* Color swatches */}
      <div className="flex gap-1">
        {SWATCH_KEYS.map((key) => (
          <span
            key={key}
            className="size-5 rounded-sm border border-border-primary"
            style={{ backgroundColor: theme.colors[key] }}
          />
        ))}
      </div>

      {/* Theme name */}
      <span className="text-xs font-medium text-text-primary">{theme.builtIn ? t(theme.name) : theme.name}</span>

      {/* Active badge */}
      {isActive && (
        <span className="absolute end-2 inset-bs-2 rounded-full bg-accent-primary px-1.5 py-0.5 text-[10px] font-medium text-text-inverse">
          {t("theme.picker.active")}
        </span>
      )}

      {/* Action buttons */}
      <div className="absolute end-1 inset-be-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!theme.builtIn && onEdit && (
          <ActionButton
            label={t("theme.picker.editTheme")}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(theme.id);
            }}
          >
            <PencilIcon />
          </ActionButton>
        )}
        <ActionButton
          label={t("theme.picker.duplicateTheme")}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(theme.id);
          }}
        >
          <CopyIcon />
        </ActionButton>
        <ActionButton
          label={t("theme.picker.exportTheme")}
          onClick={(e) => {
            e.stopPropagation();
            onExport(theme.id);
          }}
        >
          <DownloadIcon />
        </ActionButton>
        {!theme.builtIn && onDelete && (
          <ActionButton
            label={t("theme.picker.deleteTheme")}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(theme.id);
            }}
          >
            <TrashIcon />
          </ActionButton>
        )}
      </div>
    </button>
  );
};

const ActionButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
  >
    {children}
  </button>
);
