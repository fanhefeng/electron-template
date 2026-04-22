import { SettingRow } from "../components/SettingRow";
import { selectClass } from "../components/styles";
import type { SettingsSectionProps } from "./types";

export const LanguageSection = ({ settings, onUpdate, t }: SettingsSectionProps) => {
  return (
    <div className="divide-y divide-border-primary">
      <SettingRow label={t("settings.locale.label")}>
        <select
          value={settings.locale}
          onChange={(e) => onUpdate({ locale: e.target.value as AppSettings["locale"] })}
          className={selectClass}
        >
          <option value="system">{t("settings.locale.system")}</option>
          <option value="en">{t("settings.locale.en")}</option>
          <option value="zh-CN">{t("settings.locale.zhCN")}</option>
        </select>
      </SettingRow>
    </div>
  );
};
