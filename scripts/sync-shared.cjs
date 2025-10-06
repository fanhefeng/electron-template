#!/usr/bin/env node
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const sharedDist = path.join(distRoot, 'shared');
const targetRoots = [
  path.join(projectRoot, 'dist', 'main', 'shared'),
  path.join(projectRoot, 'dist', 'preload', 'shared')
];

async function pathExists(directory) {
  try {
    await fsp.access(directory, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function copyDirectory(src, dest) {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await fsp.mkdir(dest, { recursive: true });

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        await fsp.copyFile(srcPath, destPath);
      }
    })
  );
}

async function syncOnce({ log = true } = {}) {
  const hasSharedDist = await pathExists(sharedDist);

  if (!hasSharedDist) {
    if (log) {
      console.warn('[sync-shared] dist/shared not found; skipping copy');
    }
    return;
  }

  await Promise.all(
    targetRoots.map(async (target) => {
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.rm(target, { recursive: true, force: true });
      await copyDirectory(sharedDist, target);
    })
  );

  if (log) {
    console.log('[sync-shared] Copied dist/shared to process outputs');
  }
}

async function main() {
  const watchMode = process.argv.includes('--watch');
  await syncOnce();

  if (!watchMode) {
    return;
  }

  if (!(await pathExists(distRoot))) {
    await fsp.mkdir(distRoot, { recursive: true });
  }

  const watcher = fs.watch(
    distRoot,
    { recursive: true },
    async (_eventType, filename) => {
      if (!filename || !filename.startsWith('shared')) {
        return;
      }

      try {
        await syncOnce({ log: false });
        console.log('[sync-shared] Change detected, copies refreshed');
      } catch (error) {
        console.error('[sync-shared] Failed to sync after change', error);
      }
    }
  );

  watcher.on('error', (error) => {
    console.error('[sync-shared] Watcher error', error);
  });
}

main().catch((error) => {
  console.error('[sync-shared] Unhandled error', error);
  process.exitCode = 1;
});
