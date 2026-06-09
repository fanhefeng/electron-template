import type { ReactNode } from "react";

interface SettingRowProps {
  label: string;
  description?: string;
  /**
   * When the row wraps a native form control (e.g. `<select>`), pass the
   * control's `id` so the label is rendered as a real `<label htmlFor>` and
   * screen readers announce it. Omit it for controls that carry their own
   * accessible name (e.g. ToggleSwitch sets `aria-label`).
   */
  htmlFor?: string;
  children: ReactNode;
}

export const SettingRow = ({ label, description, htmlFor, children }: SettingRowProps) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary">
            {label}
          </label>
        ) : (
          <div className="text-sm font-medium text-text-primary">{label}</div>
        )}
        {description && <div className="mbs-0.5 text-xs text-text-tertiary">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
};
