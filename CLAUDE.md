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

## Workflow Rules

- **每完成一个功能后必须进行 code review**：运行 `typecheck` + `lint` + 全面审查代码逻辑、类型安全、边界情况和潜在 bug，修复所有发现的问题后再继续下一个任务。
- **页面 UI 与 app 功能解耦**：页面只负责布局和展示，所有功能通过引入 API（preload 暴露的接口）实现，不在 renderer 中直接操作业务逻辑。
- **国际化优先**：页面中所有用户可见文本、标签、占位符等均不能写死，必须预留国际化（i18n）接入点。
- **CSS 逻辑布局**：使用逻辑属性（`inline-start/end`、`block-start/end`、`margin-inline`、`padding-block` 等），禁止使用物理方向属性（`left`、`right`、`top`、`bottom`、`margin-left` 等），以支持 RTL 语言。
- **日志详细度**：日志系统需要达到光看日志就能了解用户的每一步操作，调用了哪些方法功能函数等。每个 service 方法入口处记录调用信息（方法名、关键参数），状态变更和错误处理等关键节点也需要日志输出。
- **功能逻辑归属 service 层**：renderer 页面只能调用 preload 暴露的方法，不自行编写业务逻辑。系统级功能（如开机自启）应放入对应的 service（如 `SystemService`）中，由 handler 调用 service，preload 暴露接口给 renderer。

## Coding Conventions

- Prettier: double quotes, semicolons, 120 char width, ES5 trailing commas
- React components: `PascalCase`; hooks: `useCamelCase`; modules: `kebab-case.ts`
- IPC channels: `SCREAMING_SNAKE_CASE` constants in `src/shared/`
- Commits: `<type>: <imperative summary>` under ~60 chars
