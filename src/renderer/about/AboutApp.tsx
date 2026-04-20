import { useEffect, useState } from "react";

export const AboutApp = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const nodeVersion = window.aboutAPI?.getNodeVersion() ?? "unknown";
  const electronVersion = window.aboutAPI?.getElectronVersion() ?? "unknown";
  const chromeVersion = window.aboutAPI?.getChromeVersion() ?? "unknown";

  useEffect(() => {
    window.aboutAPI?.getAppVersion().then(setAppVersion).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "var(--app-font-family, system-ui)" }}>
      <h2>About</h2>
      <p>App Version: {appVersion || "unknown"}</p>
      <p>Node Version: {nodeVersion}</p>
      <p>Electron Version: {electronVersion}</p>
      <p>Chrome Version: {chromeVersion}</p>
    </div>
  );
};
