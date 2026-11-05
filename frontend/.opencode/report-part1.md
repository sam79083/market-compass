# market_compass/frontend — Deep Review Report

Generated: 2026-11-05

---

## 1. Build Configuration Overview

### 1.1. `tsconfig.json` (root)
- Defines `strict`, `esModuleInterop`, `jsx: react-jsx`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`.
- These are **correct for a strict codebase** — they enforce no unused imports/variables, which is good for maintainability but will cause build failures when issues are present (see Section 2).

### 1.2. `tsconfig.app.json`
- Extends `./tsconfig.json`, sets `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`.
- `noEmit: true` is correct because Vite handles emits.
- `include: ["src/**/*.ts", "src/**/*.tsx"]` is correct.

### 1.3. `tsconfig.node.json`
- Extends `./tsconfig.json`, sets `target: "ES2022"`, `module: "ESNext"`.
- `include: ["vite.config.ts"]` correct for Vite's node-side config.

### 1.4. `vite.config.ts`
- Root `resolve.alias → @`: `path.resolve(__dirname, 'src')` — correct.
- Dev server on `:3000`.
- Proxy: `/v1/`, `/charts/`, `/api/` → `http://localhost:8000`. **Note**: `target` is hardcoded to `localhost:8000`. If the backend runs anywhere else (Docker, different machine), this must be changed.
- Custom AdSense plugin `inject-adSense` reads `ADSENSE_FILE` env var and injects HTML into `index.html` via `transformIndexHtml`. **Potential issue**: If `ADSENSE_FILE` is not set, the plugin silently does nothing. No warning/error is emitted.

### 1.5. `package.json`
- Dependencies: React 19.3.1, ECharts 6.1.0, and no other third-party libs (no axios, no react-router — good, minimal).
- Dev deps: `typescript`, `vite`, `tailwindcss`, `@tailwindcss/vite`, `@types/react`, `@types/react-dom`.
- **Missing**: Tailwind CSS config files are not visible in the file tree. Tailwind must be configured via `tailwind.config.*` or via CSS imports (`@import "tailwindcss"`). The `package.json` does not show a `tailwind.config.js`. If not present, Tailwind won't process styles.

---

(continuing in next part)
