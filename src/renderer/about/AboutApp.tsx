import { useEffect, useState } from "react";

export const AboutApp = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const [nodeVersion, setNodeVersion] = useState<string>("");
  const [electronVersion, setElectronVersion] = useState<string>("");
  const [chromeVersion, setChromeVersion] = useState<string>("");

  useEffect(() => {
    window.aboutAPI?.getAppVersion().then(setAppVersion).catch(console.error);
    setNodeVersion(window.aboutAPI?.getNodeVersion() ?? "unknown");
    setElectronVersion(window.aboutAPI?.getElectronVersion() ?? "unknown");
    setChromeVersion(window.aboutAPI?.getChromeVersion() ?? "unknown");
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
