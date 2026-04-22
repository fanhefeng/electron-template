import type { ReactNode } from "react";

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export const SettingRow = ({ label, description, children }: SettingRowProps) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && <div className="mt-0.5 text-xs text-text-tertiary">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
};
