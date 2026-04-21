import { useEffect, useState } from "react";
import type { ProgressInfo } from "electron-updater";
import type { DeepLinkPayload } from "@shared/deepLink";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";

const UpdateStatus = ({ t }: { t: (key: string, params?: Record<string, string>) => string }) => {
  const [status, setStatus] = useState("");

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const handleAvailable = () => setStatus(t("update.status.available"));
    const handleNotAvailable = () => setStatus(t("update.status.notAvailable"));
    const handleError = (_event: unknown, message: string) => {
      setStatus(t("update.status.error", { message }));
    };
    const handleDownloaded = () => setStatus(t("update.status.downloaded"));
    const handlePending = () => setStatus(t("update.status.downloading"));
    const handleProgress = (_event: unknown, progress: ProgressInfo) => {
      if (typeof progress.percent === "number") {
        setStatus(t("update.status.downloadingPercent", { percent: progress.percent.toFixed(0) }));
      }
    };

    api.onUpdateAvailable(handleAvailable);
    api.onUpdateNotAvailable(handleNotAvailable);
    api.onUpdateError(handleError);
    api.onUpdateDownloaded(handleDownloaded);
    api.onUpdateDownloadPending(handlePending);
    api.onUpdateDownloadProgress(handleProgress);

    return () => {
      api.offUpdateAvailable(handleAvailable);
      api.offUpdateNotAvailable(handleNotAvailable);
      api.offUpdateError(handleError);
      api.offUpdateDownloaded(handleDownloaded);
      api.offUpdateDownloadPending(handlePending);
      api.offUpdateDownloadProgress(handleProgress);
    };
  }, [t]);

  return <p>{status || t("update.status.idle")}</p>;
};

export const App = () => {
  const { t } = useI18n();
  const logger = useLogger("App");
  const [deepLinkInfo, setDeepLinkInfo] = useState<string>("");

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const handleDeepLink = (_event: unknown, payload: DeepLinkPayload) => {
      const info = `path=${payload.path} params=${JSON.stringify(payload.params)}`;
      logger.info("deep-link-received", info);
      setDeepLinkInfo(info);
    };

    api.onDeepLink(handleDeepLink);
    return () => {
      api.offDeepLink(handleDeepLink);
    };
  }, [logger]);

  const handleOpenWindow = (windowName: "about" | "settings") => {
    logger.click(`${windowName} button`);
    window.electronAPI?.openWindow(windowName);
  };

  return (
    <div style={{ paddingBlock: "2rem", paddingInline: "2rem", fontFamily: "var(--app-font-family, system-ui)" }}>
      <h1>{t("app.title")}</h1>
      <div style={{ display: "flex", gap: "1rem", marginBlockEnd: "1.5rem" }}>
        <button
          type="button"
          onClick={() => {
            logger.click("Check for Updates button");
            window.electronAPI?.checkForUpdates();
          }}
        >
          {t("update.button.check")}
        </button>
        <button
          type="button"
          onClick={() => {
            logger.click("Apply Update button");
            window.electronAPI?.applyUpdate();
          }}
        >
          {t("update.button.apply")}
        </button>
      </div>
      <UpdateStatus t={t} />
      {deepLinkInfo && (
        <p>
          {t("deepLink.label")}: {deepLinkInfo}
        </p>
      )}
      <div style={{ display: "flex", gap: "1rem", marginBlockStart: "2rem" }}>
        <button type="button" onClick={() => handleOpenWindow("about")}>
          {t("nav.about")}
        </button>
        <button type="button" onClick={() => handleOpenWindow("settings")}>
          {t("nav.settings")}
        </button>
      </div>
    </div>
  );
};
