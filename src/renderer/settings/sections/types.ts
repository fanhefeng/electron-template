import type { AppSettings } from "@shared/settings";

export interface SettingsSectionProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  t: (key: string) => string;
}
