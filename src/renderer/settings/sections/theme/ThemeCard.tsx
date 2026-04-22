import type { ThemeDefinition, ThemeId } from "@shared/theme";

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
    onClick={onClick}
    className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
  >
    {children}
  </button>
);

const PencilIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const CopyIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
