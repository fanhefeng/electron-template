# Electron Template

Lightweight multi-window Electron + Vite + React + TypeScript starter with IPC, auto-updates, font protocol and logging.

## Quick links
- Project manifest: [package.json](package.json)  
- Vite config: [vite.config.ts](vite.config.ts)  
- Main entry: [src/main/main.ts](src/main/main.ts)  
- Application bootstrap: [`MainApp`](src/main/MainApp.ts)  
- Window base class: [`AbstractWindow`](src/main/window-manager/AbstractWindow.ts)  
- Update logic: [`UpdateService`](src/main/services/update-service/UpdateService.ts)  
- Font serving protocol: [`ProtocolService`](src/main/services/protocol-service/ProtocolService.ts)  
- Font scanner: [`FontService`](src/main/services/font-service/FontService.ts)  
- Resource helpers: [`ResourceService`](src/main/services/resource-service/ResourceService.ts)  
- Dev update config: [dev-app-update.yml](dev-app-update.yml)  
- Local update server: [updater-server/server.cjs](updater-server/server.cjs)  
- Deploy script: [scripts/deploy-update.js](scripts/deploy-update.js)  
- Git ignore: [.gitignore](.gitignore)

## Requirements
- Node.js (LTS)
- npm
- macOS / Windows / Linux for packaging
- For code-signing (macOS) — Apple Developer account (see CODESIGN_SETUP.md)

## Development
1. Install deps:
   npm install

2. Start dev environment (renderer Vite server + watchers + electron):
   npm run dev

3. Renderer dev URL: http://localhost:5173

Notes:
- The app uses project references; shared code is built with `tsc -p tsconfig.shared.json`.
- Preload and main bundles are built to `dist/*` and synced by `scripts/sync-shared.cjs`.

## Build & Package
- Build: npm run build
- Package: npm run package (runs electron-builder after build)
- Output: `dist_electron/`

## Auto-update (local testing)
1. Build & package to generate `latest.yml` and artifacts into `dist_electron/`.
2. Deploy update files to the local update server:
   npm run deploy-update
   (This copies selected files into `updater-server/public/`.)
3. Start the update server:
   npm run start-update-server
   Server serves update files at: http://localhost:8080/updates

See [UPDATE_SETUP.md](UPDATE_SETUP.md) and [`UpdateService`](src/main/services/update-service/UpdateService.ts) for details.

## Project structure (high level)
- src/main — Electron main process and services
- src/preload — preload scripts (expose safe APIs)
- src/renderer — Vite React apps for windows (main / about / settings)
- src/shared — shared types & helpers
- updater-server — minimal static server for update files
- scripts — helper scripts (sync, deploy)

## Important notes
- Fonts are exposed via a custom protocol `app-font://fonts/...` implemented in [`ProtocolService`](src/main/services/protocol-service/ProtocolService.ts) and referenced by [`FontService`](src/main/services/font-service/FontService.ts).
- Appearance and font injection are done in preloads (`src/preload/*`) via `initializeAppearanceBridge`.
- IPC channels are defined in [src/shared/ipcChannels.ts](src/shared/ipcChannels.ts) and handlers in [src/main/ipc/handlers](src/main/ipc/handlers).

## Contributing
- Run linter: npm run lint
- Format: npm run format
- Typecheck: npm run typecheck

## License
MIT
```// filepath: /Users/fhf/IT/code/electron-template/README.md
# Electron Template

Lightweight multi-window Electron + Vite + React + TypeScript starter with IPC, auto-updates, font protocol and logging.

## Quick links
- Project manifest: [package.json](package.json)  
- Vite config: [vite.config.ts](vite.config.ts)  
- Main entry: [src/main/main.ts](src/main/main.ts)  
- Application bootstrap: [`MainApp`](src/main/MainApp.ts)  
- Window base class: [`AbstractWindow`](src/main/window-manager/AbstractWindow.ts)  
- Update logic: [`UpdateService`](src/main/services/update-service/UpdateService.ts)  
- Font serving protocol: [`ProtocolService`](src/main/services/protocol-service/ProtocolService.ts)  
- Font scanner: [`FontService`](src/main/services/font-service/FontService.ts)  
- Resource helpers: [`ResourceService`](src/main/services/resource-service/ResourceService.ts)  
- Dev update config: [dev-app-update.yml](dev-app-update.yml)  
- Local update server: [updater-server/server.cjs](updater-server/server.cjs)  
- Deploy script: [scripts/deploy-update.js](scripts/deploy-update.js)  
- Git ignore: [.gitignore](.gitignore)

## Requirements
- Node.js (LTS)
- npm
- macOS / Windows / Linux for packaging
- For code-signing (macOS) — Apple Developer account (see CODESIGN_SETUP.md)

## Development
1. Install deps:
   npm install

2. Start dev environment (renderer Vite server + watchers + electron):
   npm run dev

3. Renderer dev URL: http://localhost:5173

Notes:
- The app uses project references; shared code is built with `tsc -p tsconfig.shared.json`.
- Preload and main bundles are built to `dist/*` and synced by `scripts/sync-shared.cjs`.

## Build & Package
- Build: npm run build
- Package: npm run package (runs electron-builder after build)
- Output: `dist_electron/`

## Auto-update (local testing)
1. Build & package to generate `latest.yml` and artifacts into `dist_electron/`.
2. Deploy update files to the local update server:
   npm run deploy-update
   (This copies selected files into `updater-server/public/`.)
3. Start the update server:
   npm run start-update-server
   Server serves update files at: http://localhost:8080/updates

See [UPDATE_SETUP.md](UPDATE_SETUP.md) and [`UpdateService`](src/main/services/update-service/UpdateService.ts) for details.

## Project structure (high level)
- src/main — Electron main process and services
- src/preload — preload scripts (expose safe APIs)
- src/renderer — Vite React apps for windows (main / about / settings)
- src/shared — shared types & helpers
- updater-server — minimal static server for update files
- scripts — helper scripts (sync, deploy)

## Important notes
- Fonts are exposed via a custom protocol `app-font://fonts/...` implemented in [`ProtocolService`](src/main/services/protocol-service/ProtocolService.ts) and referenced by [`FontService`](src/main/services/font-service/FontService.ts).
- Appearance and font injection are done in preloads (`src/preload/*`) via `initializeAppearanceBridge`.
- IPC channels are defined in [src/shared/ipcChannels.ts](src/shared/ipcChannels.ts) and handlers in [src/main/ipc/handlers](src/main/ipc/handlers).

## Contributing
- Run linter: npm run lint
- Format: npm run format
- Typecheck: npm run typecheck

## License
MIT