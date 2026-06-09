# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Full dev environment: 6 concurrent processes (tsc watchers for shared/main, shared sync watcher, esbuild preload watcher, Vite, Electron gated by wait-on)
npm run build            # Production build: clean → shared → main → preload → sync:shared → renderer
npm run package          # Build + package with electron-builder → dist_electron/
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier formatting
npm run typecheck        # No-emit typecheck of all 4 projects in parallel (concurrently + tsconfig.*.check.json; fails if any project fails). Never run bare `tsc --noEmit` — it checks 0 files (see Build Pipeline)
npm run sync:shared      # Copy dist/shared → dist/main/shared + dist/preload/shared (required after changing src/shared/)
npm run clean            # Remove dist/, dist_electron/, tsbuildinfo files
npm run package-and-deploy   # package + copy artifacts to local update server (updater-server/public/)
npm run start-update-server  # Local auto-update server at http://localhost:8080
```

No automated test suite. Use `npm run dev` for manual smoke testing.

**Git hooks (husky)**: pre-commit runs lint-staged (eslint --fix + prettier on staged files); commit-msg runs commitlint. Allowed commit types: `feat fix update refactor style docs test chore release revert` — note `perf`/`ci`/`build` are **rejected**.

## Architecture

Multi-process Electron app: main process + three renderer windows (main, settings, about), bridged by typed preload scripts.

### Process Layout

- **Main process** (`src/main/`): `main.ts` → `MainApp.ts` bootstraps services, registers windows, IPC handlers, menu, tray.
- **Preload** (`src/preload/`): one script per window (mainPreload → `window.electronAPI`, settingsPreload → `window.settingsAPI`, aboutPreload → `window.aboutAPI`). Every preload also initializes two shared bridges: `appearanceBridge.ts` (`window.app` — injects theme CSS vars, @font-face rules, and `lang` attribute into the DOM before React mounts) and `logBridge.ts` (`window.log` — renderer→main logging). esbuild bundles each into a single file for sandbox support.
- **Renderer** (`src/renderer/`): three React 19 apps, each with its own `index.html`. Vite 8 multi-page — **Rolldown-based**: config uses `build.rolldownOptions`, not `rollupOptions`. Styling is Tailwind CSS v4 (`@tailwindcss/vite`, zero-config `@import "tailwindcss"` in `app.css`).
- **Shared** (`src/shared/`): cross-process contracts — IPC channels/schema, settings, themes, locales, fonts, `appConfig.ts` (dev/prod env config).

### Service Layer (`src/main/services/`)

Module-level singletons: every service ends with `export const xService = new XService()` (exception: logger-service exports `logger`), imported directly (no DI container). `WindowManager` is injected via setter (`initialize`/`setWindowManager`) where needed. Per Workflow Rules, every service method logs its entry; existing prefix styles are inconsistent (`[service:name]` vs `ClassName.method called`) — prefer `[service:name]` for new code.

- `logger-service` — wraps electron-log; file log at `app.getPath("logs")/main.log`; `reconfigure()` must run after `app.setName()`
- `system-service` — OS features: notifications, auto-launch (login item), clipboard, screenshots
- `theme-service` — builtin + custom themes (CRUD/import/export), persisted to `userData/themes.json`, broadcasts `theme:updated`
- `i18n-service` — current locale, system-locale resolution, `t(key, params)` for main-side strings (menu, tray)
- `tray-service` — system tray + minimize-to-tray (intercepts window `close` when enabled and not quitting)
- `update-service` — electron-updater wrapper; fans out `update:*` IPC events + notifications
- `deep-link-service` — registers `electrontemplate://` (`-dev` in dev) scheme; parses/sanitizes URLs, queues payloads until WindowManager is ready
- `protocol-service` — privileged `app-font://fonts/` scheme serving font files with path-traversal guards (registered at import time, before app.ready)
- `font-service` — scans `resources/fonts`, builds the font catalog with `app-font://` source URLs
- `resource-service` — pure path resolver (renderer HTML, preload, resources), dev vs packaged aware
- `download-service` — hooks `will-download` on the default session

### Bootstrap Order (ordering constraints matter)

In `main.ts`: import side effects register the privileged `app-font://` scheme (must precede `app.ready`) → `app.setName()` (must precede **any** `app.getPath()` call) → `logger.reconfigure()` → single-instance lock → `MainApp.init()`: register windows + IPC handlers → `whenReady` → font protocol → deep links → **settings loaded before menu/tray** (they read i18n/settings) → menu → tray → downloads monitor → open main window → updater listeners.

### Dev/Prod Isolation

Keyed solely on `app.isPackaged` (`src/main/environment.ts` + `src/shared/appConfig.ts`). Dev uses app name `ElectronTemplate-dev` and scheme `electrontemplate-dev`, giving separate userData/logs/updater-cache dirs from production.

### Type-Safe IPC — adding an endpoint

Channel naming: invoke/handle channels use `domain/action` (slash); main→renderer event channels use `domain:event` (colon). Events exist only in `IPC_CHANNELS`, **not** in `IpcContract`.

Checklist for a new invoke endpoint:

1. `src/shared/ipcChannels.ts` — add `DO_THING: "feature/do-thing"` to `IPC_CHANNELS`
2. `src/shared/ipc/schema.ts` — add `"feature/do-thing": { req: ...; res: ... }` to `IpcContract`. **The key must equal the channel string value** (hand-duplicated; no type link between the two files)
3. `src/main/ipc/handlers/<domain>Handler.ts` — thin handler that delegates to a service (business logic lives in the service, never the handler)
4. `src/main/ipc/handlers/index.ts` — register with `handleTypedWithLogging(channel, handler, optionalTypeGuard)`. Always use the `WithLogging` variant (logs redacted params + duration). Runtime validation only happens if you pass a type guard
5. `src/preload/<window>Preload.ts` — expose via `ipcRenderer.invoke(IPC_CHANNELS.DO_THING, arg)`
6. `src/renderer/global.d.ts` — add the signature to the matching `Window` interface. All `window.*` APIs are optional — renderer must null-check (`window.settingsAPI?.method()`)
7. Touched `src/shared/`? Run `npm run sync:shared` (automatic in `npm run dev` watch mode)

For broadcast events: add the colon-style channel, emit with `webContents.send`, expose paired `onX`/`offX` listeners in preload.

### Shared Code Sync

`src/shared/` compiles to `dist/shared/`, which `scripts/sync-shared.cjs` copies into **both** `dist/main/shared/` and `dist/preload/shared/`. The main process loads the synced copy at runtime — skipping sync after editing `src/shared/` means main runs **stale** shared code (symptom: "No handler registered" IPC errors). Preload runtime actually uses the esbuild bundle built from source, so it's immune to stale sync.

### Settings

JSON at `userData/settings.json`, owned by `services/settings-service/SettingsService.ts` (the thin `settingsHandler.ts` just delegates). The service sanitizes via whitelist, migrates legacy keys, serializes concurrent writes (`SerialQueue`), persists atomically (temp+rename via `utils/atomic-file.ts`), backs up an unreadable file rather than overwriting it, and orchestrates side effects — autoLaunch, notifications, tray, active theme, locale (rebuilding the app menu) — before broadcasting `settings:updated` to all windows. Settings UI edits locally and persists only on form submit, except theme selection which applies immediately.

### Theming

`ThemeDefinition` tokens (`src/shared/theme.ts`) → `--theme-*` CSS vars → injected by **preload** (`appearanceBridge`) into a `<style>` tag on load and on `theme:updated`. Tailwind's `@theme` block in `src/renderer/app.css` maps semantic utilities (`bg-bg-primary`, `text-text-secondary`, `border-border-primary`, `text-status-error`…) to those vars. Built-in theme `name`s are i18n keys; custom theme names are literals — UI renders `theme.builtIn ? t(theme.name) : theme.name`.

### i18n

Flat dotted-key dictionaries in `src/shared/locales/` (`en.ts`, `zh-CN.ts` — add new keys to **both**). Main resolves the effective locale; renderers fetch the resolved dict via `window.app.getMessages()` through the `useI18n` hook (`t(key, params)` with `{param}` interpolation, re-fetches on `settings:updated`). Main-side strings (menu, tray, notifications) go through `i18nService.t`.

### Windows

`AbstractWindow` enforces security defaults (contextIsolation, sandbox, no nodeIntegration — merged so a subclass's own `webPreferences` can't drop them) plus hardening: denies all `window.open`, and a `will-navigate`/`will-redirect` whitelist (prod: `file://` only; dev: the `getDevServerBaseUrl()` origin, derived from `ELECTRON_DEV_SERVER_URL` so the guard and the initial load always agree). `WindowManager` is a lazy singleton-per-id registry (`"main" | "about" | "settings"`); `open()` surfaces an existing live window (restore/show/focus) or re-creates a destroyed one, firing a per-id `onCreate` hook so every reopen path (init, activate, tray, deep link) re-wires window concerns like the tray close interceptor.

Adding a new window type touches: a window class + `WindowIdentifier` + registration in `MainApp`, a new preload entry added to **both** `build:preload` and `watch:preload` esbuild commands in package.json, a new `index.html` entry in `vite.config.ts` `rolldownOptions.input`, and `global.d.ts`.

### Logging

Main: `logger` (electron-log) → `userData` logs dir. Renderer: `window.log.info(action, details)` → `log:from-renderer` (fire-and-forget `ipcMain.on`) → main log file. React components use `useLogger(componentName)` (auto mount/unmount logs, `click`/`change`/`submit` helpers). Per Workflow Rules, log verbosity must let you reconstruct every user action from the log alone.

### Auto-Update

electron-updater with a generic provider pointing at `http://localhost:8080/updates` (template placeholder in both `package.json` `build.publish` and `dev-app-update.yml`, which enables update testing in unpackaged dev). Local test flow: `npm run package-and-deploy` then `npm run start-update-server` (Express static server in `updater-server/`). UpdateService events flow to the main window as `update:*` IPC events. macOS builds are currently unsigned (`identity: null`) so applied updates only validate on the build machine — see UPDATE_SETUP.md and CODESIGN_SETUP.md.

### Build Pipeline

- Per-process tsconfigs extending `tsconfig.base.json`; main/preload/shared use Node16 resolution, renderer uses bundler resolution with the `@shared/*` alias (**renderer-only**, declared in both `tsconfig.renderer.json` and `vite.config.ts` — main/preload use relative imports)
- Typecheck uses per-project `tsconfig.*.check.json` configs (run in parallel via `concurrently`, grouped output, fails if any project fails) extending each leaf config with `composite: false` + `noEmit`. The key mechanism: `extends` does **not** inherit `references`, so the checks consume `src/shared/` sources directly instead of built declarations — a plain `tsc -p <leaf> --noEmit` fails with TS6305 ("Output file ... has not been built") on a clean checkout for the configs that have `references` (main/preload/renderer), because shared's `.d.ts` output doesn't exist yet. Note `composite` alone does not block `--noEmit` in `-p` mode (`tsconfig.shared.json` has no references and checks fine directly); the separate TS6310 error only occurs under `tsc -b --noEmit`. Adding a 5th project means adding a matching check config + adding it to the `typecheck` script's command list
- **Never run bare `tsc` / `tsc --noEmit` at the repo root**: it resolves to the solution-style root `tsconfig.json` (`files: []` + references only), checks **0 files**, and exits 0 — a silent false green. The root config exists for editor/tsserver project resolution and `tsc -b`; always typecheck via `npm run typecheck`
- Output nesting is load-bearing: main entry is `dist/main/main/main.js` (tsc `rootDir: src` preserves the `main/` subdir), preload bundles land in `dist/preload/preload/`. The package.json `main` field, wait-on gate, and electron-builder `files` all depend on these exact paths
- Build order exists because shared must compile before main/preload (project references), and `sync:shared` must run after main compiles but before packaging

## Workflow Rules

- **每完成一个功能后必须进行 code review**：运行 `typecheck` + `lint` + 全面审查代码逻辑、类型安全、边界情况和潜在 bug，修复所有发现的问题后再继续下一个任务。
- **页面 UI 与 app 功能解耦**：页面只负责布局和展示，所有功能通过引入 API（preload 暴露的接口）实现，不在 renderer 中直接操作业务逻辑。
- **国际化优先**：页面中所有用户可见文本、标签、占位符等均不能写死，必须预留国际化（i18n）接入点。
- **CSS 逻辑布局**：使用逻辑属性（`inline-start/end`、`block-start/end`、`margin-inline`、`padding-block` 等），禁止使用物理方向属性（`left`、`right`、`top`、`bottom`、`margin-left` 等），以支持 RTL 语言。Tailwind 中使用 `ps-/pe-/ms-/me-/border-s/text-start` 等逻辑工具类；块方向使用 `app.css` 中自定义的 `mbs-*/mbe-*/pbs-*/pbe-*/border-bs/border-be/inset-bs-*` 工具类（Tailwind v4 只内置 inline 方向的逻辑类）。
- **日志详细度**：日志系统需要达到光看日志就能了解用户的每一步操作，调用了哪些方法功能函数等。每个 service 方法入口处记录调用信息（方法名、关键参数），状态变更和错误处理等关键节点也需要日志输出。
- **功能逻辑归属 service 层**：renderer 页面只能调用 preload 暴露的方法，不自行编写业务逻辑。系统级功能（如开机自启）应放入对应的 service（如 `SystemService`）中，由 handler 调用 service，preload 暴露接口给 renderer。

## Coding Conventions

- Prettier: double quotes, semicolons, 120 char width, ES5 trailing commas
- React components: `PascalCase`; hooks: `useCamelCase`; modules: `kebab-case.ts`
- IPC channels: `SCREAMING_SNAKE_CASE` constants in `src/shared/ipcChannels.ts`; invoke values `domain/action`, event values `domain:event`
- Commits: `<type>: <imperative summary>`, aim for ~60 chars (commitlint enforces type from the list above, subject ≤100, header ≤120)
