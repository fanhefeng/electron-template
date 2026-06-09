/**
 * Snapshot of the updater's current state, pulled by a (re)opened renderer on
 * mount. Push events alone are insufficient: a window (re)created mid-download
 * registers its listeners only after React mounts, so any event pushed around
 * did-finish-load is silently dropped.
 */
export interface UpdateStateSnapshot {
  /** An update was reported available in the current check cycle (not yet downloaded). */
  isUpdateAvailable: boolean;
  isDownloading: boolean;
  isDownloaded: boolean;
  /** Last reported download progress percent, or null before the first tick. */
  percent: number | null;
}
