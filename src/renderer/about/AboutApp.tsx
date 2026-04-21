import { useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";

export const AboutApp = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const nodeVersion = window.aboutAPI?.getNodeVersion() ?? "";
  const electronVersion = window.aboutAPI?.getElectronVersion() ?? "";
  const chromeVersion = window.aboutAPI?.getChromeVersion() ?? "";
  const { t } = useI18n();
  useLogger("AboutApp");

  useEffect(() => {
    window.aboutAPI?.getAppVersion().then(setAppVersion).catch(console.error);
  }, []);

  const unknown = t("about.version.unknown");

  return (
    <div style={{ paddingBlock: "2rem", paddingInline: "2rem", fontFamily: "var(--app-font-family, system-ui)" }}>
      <h2>{t("about.title")}</h2>
      <p>
        {t("about.version.app")}: {appVersion || unknown}
      </p>
      <p>
        {t("about.version.node")}: {nodeVersion || unknown}
      </p>
      <p>
        {t("about.version.electron")}: {electronVersion || unknown}
      </p>
      <p>
        {t("about.version.chrome")}: {chromeVersion || unknown}
      </p>
    </div>
  );
};
