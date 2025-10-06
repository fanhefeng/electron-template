import { useEffect, useState } from 'react';
import type { ProgressInfo } from 'electron-updater';

const UpdateStatus = () => {
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    const handleAvailable = () => setStatus('Update available');
    const handleNotAvailable = () => setStatus('No updates available');
    // const handleError = (_event: unknown, message: string) => setStatus(`Error: ${message}`);
    const handleError = (_event: unknown, message: string) => {
      setStatus(`Error: ${message}`);
    }
    const handleDownloaded = () => setStatus('Update downloaded');
    const handlePending = () => setStatus('Downloading update…');
    const handleProgress = (_event: unknown, progress: ProgressInfo) => {
      if (typeof progress.percent === 'number') {
        setStatus(`Downloading update… ${progress.percent.toFixed(0)}%`);
      }
    };

    api.onUpdateAvailable(handleAvailable);
    api.onUpdateNotAvailable(handleNotAvailable);
    api.onUpdateError(handleError);
    api.onUpdateDownloaded(handleDownloaded);
    api.onUpdateDownloadPending(handlePending);
    api.onUpdateDownloadProgress(handleProgress);

    return () => {
      // electron does not automatically remove listeners, but for template we omit cleanup for brevity
    };
  }, []);

  return <p>Update status: {status}</p>;
};

export const App = () => {
  const handleOpenWindow = (windowName: 'about' | 'settings') => {
    window.electronAPI?.openWindow(windowName);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--app-font-family, system-ui)' }}>
      <h1>Electron Template</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => window.electronAPI?.checkForUpdates()}>
          Check for Updates
        </button>
        <button type="button" onClick={() => window.electronAPI?.applyUpdate()}>
          Apply Update
        </button>
      </div>
      <UpdateStatus />
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button type="button" onClick={() => handleOpenWindow('about')}>
          About
        </button>
        <button type="button" onClick={() => handleOpenWindow('settings')}>
          Settings
        </button>
      </div>
    </div>
  );
};
