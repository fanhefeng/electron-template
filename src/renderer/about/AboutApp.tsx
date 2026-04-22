import { useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";

export const AboutApp = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const nodeVersion = window.aboutAPI?.getNodeVersion() ?? "";
  const electronVersion = window.aboutAPI?.getElectronVersion() ?? "";
  const chromeVersion = window.aboutAPI?.getChromeVersion() ?? "";
  const { t } = useI18n();
  const logger = useLogger("AboutApp");

  useEffect(() => {
    window.aboutAPI
      ?.getAppVersion()
      .then(setAppVersion)
      .catch((error) => logger.error("load-app-version", String(error)));
  }, [logger]);

  const unknown = t("about.version.unknown");

  const rows = [
    { label: t("about.version.app"), value: appVersion },
    { label: t("about.version.node"), value: nodeVersion },
    { label: t("about.version.electron"), value: electronVersion },
    { label: t("about.version.chrome"), value: chromeVersion },
  ];

  return (
    <div
      className="min-h-screen bg-bg-primary text-text-primary"
      style={{ fontFamily: "var(--app-font-family, system-ui)" }}
    >
      <div className="[padding-block:2rem] [padding-inline:2rem]">
        <h2 className="text-lg font-bold text-text-primary [margin-block-end:1rem]">{t("about.title")}</h2>
        <div className="divide-y divide-border-primary rounded-lg border border-border-primary bg-surface-primary">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-text-secondary">{row.label}</span>
              <span className="text-sm font-medium text-text-primary">{row.value || unknown}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
