# JSON Toolkit

A powerful JSON toolbox built with **Rust + Tauri 2.0 + React**. Share core logic across desktop (macOS/Windows/Linux) and web via WASM.

## Features

10 core JSON tools, all powered by a shared Rust core:

| Tool | Description |
|------|-------------|
| **Formatter** | Beautify JSON with configurable indent (2/4 spaces, tab) |
| **Minifier** | Compress JSON, remove all whitespace |
| **Sorter** | Sort by key or value, ascending or descending |
| **Decoder** | Base64 / Base64URL / URL / Unicode encode & decode |
| **JSONPath** | Query JSON with JSONPath expressions (RFC 9535) |
| **Tree View** | Collapsible interactive JSON tree browser |
| **Table View** | Flatten JSON arrays/objects to tables, export CSV |
| **Diff** | Compare two JSON objects, highlight added/removed/modified |
| **Schema Validator** | Validate JSON against JSON Schema |
| **CSV Converter** | Convert between JSON and CSV/TSV bidirectionally |

## Tech Stack

- **Core**: Rust (`serde_json`, `jsonpath_lib`, `jsonschema`, `csv`, `base64`)
- **Desktop**: Tauri 2.0 (macOS, Windows, Linux)
- **Web**: Vite + React 18 + TypeScript + TailwindCSS
- **Bridge**: WASM (`wasm-pack` + `wasm-bindgen`)
- **State**: Zustand with persistence
- **CI/CD**: GitHub Actions (test, build, deploy to GitHub Pages)

## Architecture

```
                    ┌─────────────┐
                    │  json-core  │  (Rust library)
                    │  10 tools   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌───────▼───────┐
       │   WASM      │          │    Tauri      │
       │ (wasm-pack) │          │  (native)     │
       └──────┬──────┘          └───────┬───────┘
              │                         │
       ┌──────▼──────┐          ┌───────▼───────┐
       │  Web (Vite) │          │   Desktop App │
       │  React SPA  │          │  (macOS/Win)  │
       └─────────────┘          └───────────────┘
```

**Key design**: The Rust `json-core` crate compiles to both WASM (for web) and native (for Tauri desktop). A platform adapter in the frontend auto-detects the environment and routes calls accordingly.

## Project Structure

```
json-toolkit/
├── crates/json-core/     # Shared Rust core (10 JSON tools)
├── src-tauri/            # Tauri desktop app
├── web/                  # Web app (Vite + React)
│   └── src/wasm/         # Generated WASM output (gitignored)
├── .github/workflows/    # CI/CD
├── Cargo.toml            # Rust workspace root
├── package.json          # pnpm workspace root
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Rust 1.75+ (`rustup`)
- Node.js 20+ and pnpm 10+
- wasm-pack (`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`)

### Development

```bash
# Install dependencies
pnpm install

# Build WASM (required before first run)
pnpm wasm:build

# Run web dev server
pnpm dev:web

# Run Tauri desktop dev (macOS)
pnpm dev:tauri
```

### Build

```bash
# Build web app
pnpm build:web

# Build Tauri desktop app
pnpm build:tauri
```

### Test

```bash
# Run Rust unit tests
cargo test --workspace
```

## Deployment

- **Web**: Automatically deployed to GitHub Pages on push to `main`
- **Desktop**: Build triggered by pushing a `v*` tag (creates GitHub Release with `.dmg`/`.app`)

## Roadmap

| Platform | Status | Strategy |
|----------|--------|----------|
| macOS | ✅ MVP | Tauri 2.0 |
| Web | ✅ MVP | Vite + WASM |
| Windows | 📋 Planned | Tauri 2.0 |
| Linux | 📋 Planned | Tauri 2.0 |
| Android | 📋 Planned | Tauri Mobile |
| iOS | 📋 Planned | Tauri Mobile |
| Chrome Extension | 📋 Planned | WXT + WASM |
| WeChat Mini Program | 📋 Planned | Taro + WASM |

## License

MIT
