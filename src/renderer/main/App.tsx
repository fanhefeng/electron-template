import { useEffect, useState } from "react";
import type { ProgressInfo } from "electron-updater";
import { useI18n } from "../hooks/useI18n";
import { useLogger } from "../hooks/useLogger";
import { useDeepLink } from "../hooks/useDeepLink";

type UpdateStatusMessage = { key: string; params?: Record<string, string> };

const UpdateStatus = ({ t }: { t: (key: string, params?: Record<string, string>) => string }) => {
  // Store the i18n KEY (translated at render time): the listeners then register
  // once on mount instead of tearing down and re-registering all six on every
  // settings change (t's identity changes whenever messages reload), and an
  // already-displayed status follows a locale switch automatically.
  const [status, setStatus] = useState<UpdateStatusMessage | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const handleAvailable = () => setStatus({ key: "update.status.available" });
    const handleNotAvailable = () => setStatus({ key: "update.status.notAvailable" });
    const handleError = (_event: unknown, message: string) => {
      setStatus({ key: "update.status.error", params: { message } });
    };
    const handleDownloaded = () => setStatus({ key: "update.status.downloaded" });
    const handlePending = () => setStatus({ key: "update.status.downloading" });
    const handleProgress = (_event: unknown, progress: ProgressInfo) => {
      if (typeof progress.percent === "number") {
        setStatus({ key: "update.status.downloadingPercent", params: { percent: progress.percent.toFixed(0) } });
      }
    };

    api.onUpdateAvailable(handleAvailable);
    api.onUpdateNotAvailable(handleNotAvailable);
    api.onUpdateError(handleError);
    api.onUpdateDownloaded(handleDownloaded);
    api.onUpdateDownloadPending(handlePending);
    api.onUpdateDownloadProgress(handleProgress);

    // Pull the current updater state: a (re)opened window missed any events
    // fired before this effect ran (download finished while hidden to tray,
    // window recreated mid-download, etc.).
    api
      .getUpdateState()
      .then((state) => {
        // Functional update gated on `current`: the pull can resolve AFTER a
        // fresher live push event already set a status, and must never revert
        // it (e.g. "downloaded" back to a stale "downloading" snapshot).
        setStatus((current) => {
          if (current) return current;
          if (state.isDownloaded) {
            return { key: "update.status.downloaded" };
          }
          if (state.isDownloading) {
            return state.percent !== null
              ? { key: "update.status.downloadingPercent", params: { percent: state.percent.toFixed(0) } }
              : { key: "update.status.downloading" };
          }
          if (state.isUpdateAvailable) {
            // Update reported available before this window (re)opened: without
            // this branch the UI would fall back to "idle" and lose the cue
            // that an update is ready to download.
            return { key: "update.status.available" };
          }
          return current;
        });
      })
      .catch((error) => window.log?.error("get-update-state-failed", String(error)));

    return () => {
      api.offUpdateAvailable(handleAvailable);
      api.offUpdateNotAvailable(handleNotAvailable);
      api.offUpdateError(handleError);
      api.offUpdateDownloaded(handleDownloaded);
      api.offUpdateDownloadPending(handlePending);
      api.offUpdateDownloadProgress(handleProgress);
    };
  }, []);

  return (
    <div className="rounded-lg bg-bg-tertiary px-4 py-3">
      <p className="text-sm text-text-secondary">
        {status ? t(status.key, status.params) : t("update.status.idle")}
      </p>
    </div>
  );
};

export const App = () => {
  const { t, ready } = useI18n();
  const logger = useLogger("App");
  const [deepLinkInfo, setDeepLinkInfo] = useState<string>("");

  useEffect(() => {
    // Localize the OS window title (the static HTML <title> is only a
    // pre-load fallback); re-runs when the locale dictionary changes.
    if (ready) document.title = t("app.title");
  }, [ready, t]);

  useDeepLink(window.electronAPI, logger, (payload) => {
    setDeepLinkInfo(`path=${payload.path} params=${JSON.stringify(payload.params)}`);
  });

  const handleOpenWindow = (windowName: "about" | "settings") => {
    logger.click(`${windowName} button`);
    window.electronAPI?.openWindow(windowName);
  };

  // Gate the first paint on the i18n dictionary: rendering before it loads
  // flashes raw dotted keys ("app.title", …) for a frame. A blank frame is
  // the lesser evil. (Hooks above still run; only the JSX is deferred.)
  if (!ready) return null;

  return (
    <div
      className="min-h-screen bg-bg-primary text-text-primary"
      style={{ fontFamily: "var(--app-font-family, system-ui)" }}
    >
      <div className="mx-auto max-w-2xl [padding-block:2rem] [padding-inline:2rem]">
        {/* Header */}
        <h1 className="text-2xl font-bold text-text-primary [margin-block-end:1.5rem]">{t("app.title")}</h1>

        {/* Status card */}
        <div className="rounded-lg border border-border-primary bg-surface-primary p-4 shadow-sm [margin-block-end:1.5rem]">
          <div className="flex items-center gap-3 [margin-block-end:0.75rem]">
            <button
              type="button"
              onClick={() => {
                logger.click("Check for Updates button");
                window.electronAPI?.checkForUpdates();
              }}
              className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-hover active:bg-accent-active"
            >
              {t("update.button.check")}
            </button>
            <button
              type="button"
              onClick={() => {
                logger.click("Apply Update button");
                window.electronAPI?.applyUpdate();
              }}
              className="rounded-lg border border-border-secondary px-4 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              {t("update.button.apply")}
            </button>
          </div>
          <UpdateStatus t={t} />
        </div>

        {/* Deep link info */}
        {deepLinkInfo && (
          <div className="rounded-lg border border-border-primary bg-accent-subtle px-4 py-3 [margin-block-end:1.5rem]">
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-accent-primary">{t("deepLink.label")}:</span> {deepLinkInfo}
            </p>
          </div>
        )}

        {/* Status badges demo */}
        <div className="flex flex-wrap gap-2 [margin-block-end:1.5rem]">
          <span className="rounded-full bg-status-success/15 px-3 py-1 text-xs font-medium text-status-success">
            {t("update.status.idle")}
          </span>
          <span className="rounded-full bg-status-info/15 px-3 py-1 text-xs font-medium text-status-info">
            {t("update.status.available")}
          </span>
          <span className="rounded-full bg-status-warning/15 px-3 py-1 text-xs font-medium text-status-warning">
            {t("update.status.downloading")}
          </span>
          <span className="rounded-full bg-status-error/15 px-3 py-1 text-xs font-medium text-status-error">
            {t("update.status.error", { message: "demo" })}
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleOpenWindow("about")}
            className="rounded-lg border border-border-secondary px-4 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            {t("nav.about")}
          </button>
          <button
            type="button"
            onClick={() => handleOpenWindow("settings")}
            className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-hover active:bg-accent-active"
          >
            {t("nav.settings")}
          </button>
        </div>
      </div>
    </div>
  );
};
