# Repository Guidelines

## Project Structure

- `src/main/` — Electron main process: lifecycle, services, IPC handlers
- `src/preload/` — Preload scripts: `contextBridge` APIs, bundled by esbuild
- `src/renderer/` — React apps bootstrapped by Vite (multi-page)
- `src/shared/` — Cross-process type contracts, synced via `npm run sync:shared`
- `scripts/` — Build automation helpers
- `resources/` — Icons, fonts, static assets

## Commands

- `npm run dev` — Start dev environment (TS watchers + Vite + Electron)
- `npm run build` — Production build
- `npm run package` — Build + package with electron-builder
- `npm run lint` / `npm run lint:fix` / `npm run format` / `npm run typecheck` — Code quality

## Coding Style

- TypeScript with Prettier (double quotes, 2-space indent, 120 char width)
- React components: `PascalCase`; hooks: `useCamelCase`; modules: `kebab-case.ts`
- IPC channel constants: `SCREAMING_SNAKE_CASE` in `src/shared/`
- Run `npm run sync:shared` after changing shared types

## Testing

- No automated suite yet; manual verification via `npm run dev`
- Future tests: vitest + React Testing Library in `src/renderer/__tests__/*.spec.tsx`

## Commits & PRs

- Format: `<type>: <imperative summary>` (under ~60 chars)
- Squash related work before PR, describe risk areas, link issues
- Provide screenshots for UI changes
