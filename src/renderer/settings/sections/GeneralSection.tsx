import { ToggleSwitch } from "../components/ToggleSwitch";
import { SettingRow } from "../components/SettingRow";
import type { SettingsSectionProps } from "./types";

export const GeneralSection = ({ settings, onUpdate, t }: SettingsSectionProps) => {
  return (
    <div className="divide-y divide-border-primary">
      <SettingRow label={t("settings.autoLaunch")}>
        <ToggleSwitch
          checked={settings.autoLaunch}
          onChange={(checked) => onUpdate({ autoLaunch: checked })}
          ariaLabel={t("settings.autoLaunch")}
        />
      </SettingRow>
      <SettingRow label={t("settings.notifications")}>
        <ToggleSwitch
          checked={settings.enableNotifications}
          onChange={(checked) => onUpdate({ enableNotifications: checked })}
          ariaLabel={t("settings.notifications")}
        />
      </SettingRow>
    </div>
  );
};
