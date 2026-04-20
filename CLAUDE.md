# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start full dev environment (TS watchers + Vite + Electron)
npm run build            # Production build (shared → main → preload → renderer)
npm run package          # Build + package with electron-builder → dist_electron/
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier formatting
npm run typecheck        # TypeScript type checking
npm run sync:shared      # Sync compiled shared code to main process (after changing src/shared/)
```

No automated test suite. Use `npm run dev` for manual smoke testing.

## Architecture

Multi-process Electron app: main process + per-window renderer processes, bridged by typed preload scripts.

### Process Layout

- **Main process** (`src/main/`): `main.ts` → `MainApp.ts` bootstraps services, registers windows, sets up IPC handlers.
- **Preload scripts** (`src/preload/`): One per window type (mainPreload, settingsPreload, aboutPreload). Each exposes a scoped API via `contextBridge`. All windows share `appearanceBridge.ts` for font/theme injection. Bundled by esbuild into single files for sandbox support.
- **Renderer** (`src/renderer/`): Three separate React apps (main, settings, about), each with its own `index.html` entry. Bundled by Vite with multi-page config.
- **Shared** (`src/shared/`): Cross-process contracts — IPC channel constants, type schemas, settings/font interfaces. Source of truth for IPC types.

### Key Patterns

**Window management**: `AbstractWindow` base class with security defaults (contextIsolation, sandbox, no nodeIntegration). `WindowManager` provides lazy-instantiation registry.

**Type-safe IPC**: Channel constants (`SCREAMING_SNAKE_CASE`) in `src/shared/ipcChannels.ts`, request/response types in `src/shared/ipc/schema.ts`, main-side `handleTyped()` in `src/main/ipc/typed.ts`, renderer types in `src/renderer/global.d.ts`.

**Shared code sync**: `src/shared/` compiles to `dist/shared/`, synced to `dist/main/shared/` via `scripts/sync-shared.cjs`. Preload does not need sync — esbuild bundles directly from source.

**Settings persistence**: JSON at `app.getPath('userData')/settings.json`, cached in memory, changes broadcast to all windows via `settings:updated` IPC event.

### Build Pipeline

- **Main/Shared**: TypeScript compiler (`tsc`) with project references
- **Preload**: esbuild bundles each entry into a single file (`electron` marked as external)
- **Renderer**: Vite 8 (React)
- Separate `tsconfig.*.json` per process. Build output: `dist/`, packaged apps: `dist_electron/`

## Coding Conventions

- Prettier: double quotes, semicolons, 120 char width, ES5 trailing commas
- React components: `PascalCase`; hooks: `useCamelCase`; modules: `kebab-case.ts`
- IPC channels: `SCREAMING_SNAKE_CASE` constants in `src/shared/`
- Commits: `<type>: <imperative summary>` under ~60 chars
