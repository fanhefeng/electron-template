# Electron Template

A production-ready Electron starter template built with Vite, React and TypeScript.

## Tech Stack

- **Electron 41** — cross-platform desktop framework
- **React 19** — UI library
- **TypeScript 6** — type-safe JavaScript
- **Vite 8** — fast build tool (renderer)
- **esbuild** — preload script bundler (sandbox-safe)
- **electron-builder** — packaging & distribution
- **electron-updater** — auto-update support

## Getting Started

```bash
# Install dependencies
npm install

# Start development environment
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev environment (watchers + Vite + Electron) |
| `npm run build` | Production build |
| `npm run package` | Build + package installer (DMG / NSIS / AppImage) |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier formatting |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
src/
├── main/          # Electron main process, services, IPC handlers
├── preload/       # Preload scripts (contextBridge APIs)
├── renderer/      # React apps (Vite multi-page)
└── shared/        # Cross-process type contracts
```

## Security

- `contextIsolation: true` — renderer cannot access Node.js
- `sandbox: true` — OS-level process sandboxing
- `nodeIntegration: false` — no Node APIs in renderer
- Preload scripts bundled as single files via esbuild
- Navigation guards block external URLs
- Custom protocol with path traversal protection

## Auto-Update (Local Testing)

```bash
npm run package              # Build installer
npm run deploy-update        # Deploy to local update server
npm run start-update-server  # Start server at http://localhost:8080
```

See [UPDATE_SETUP.md](UPDATE_SETUP.md) for details.

## Code Signing (macOS)

See [CODESIGN_SETUP.md](CODESIGN_SETUP.md) for Apple Developer setup.

## License

MIT
