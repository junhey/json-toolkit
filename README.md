# ⚡ JSON Toolkit

A powerful multi-platform JSON toolbox built with **Rust + Tauri 2.0 + React**. One Rust core, every platform — desktop, web, mobile, browser extension, and mini program.

**Live Demo**: [https://junhey.github.io/json-toolkit/](https://junhey.github.io/json-toolkit/)

## Features

10 core JSON tools, all powered by a shared Rust core:

| Tool | Description | Web | Desktop | Extension | Mini Program |
|------|-------------|:---:|:-------:|:---------:|:------------:|
| **Formatter** | Beautify JSON with configurable indent | ✅ | ✅ | ✅ | ✅ |
| **Minifier** | Compress JSON, remove all whitespace | ✅ | ✅ | ✅ | ✅ |
| **Sorter** | Sort by key or value, ascending/descending | ✅ | ✅ | ✅ | ✅ |
| **Codec Toolkit** | 24 encode/decode transforms (Unicode/URL/UTF16/Base64/MD5/Hex/SHA1/HTML/Gzip/JWT/Cookie/Proto Hex…) | ✅ | ✅ | ✅ | ✅ |
| **JSONPath** | Query JSON with JSONPath expressions | ✅ | ✅ | ✅ | ✅ |
| **Tree View** | Collapsible interactive JSON tree browser | ✅ | ✅ | ✅ | — |
| **Table View** | Flatten JSON arrays/objects to tables | ✅ | ✅ | ✅ | — |
| **Diff** | Compare two JSON objects, highlight changes | ✅ | ✅ | ✅ | — |
| **Schema Validator** | Validate JSON against JSON Schema | ✅ | ✅ | — | — |
| **CSV Converter** | Convert between JSON and CSV/TSV | ✅ | ✅ | ✅ | ✅ |

## Platform Support

| Platform | Status | Tech | How to Get |
|----------|--------|------|------------|
| **Web** | ✅ Deployed | Vite + React + WASM | [Open in browser](https://junhey.github.io/json-toolkit/) |
| **macOS** | ✅ Ready | Tauri 2.0 | `pnpm build:tauri` → `.dmg` / `.app` |
| **Windows** | ✅ Ready | Tauri 2.0 | CI builds `.msi` / `.exe` on tag push |
| **Linux** | ✅ Ready | Tauri 2.0 | CI builds `.deb` / `.AppImage` on tag push |
| **Android** | ✅ Configured | Tauri Mobile | CI builds `.apk` (see [setup](#android-ios)) |
| **iOS** | ✅ Configured | Tauri Mobile | CI builds `.ipa` (see [setup](#android-ios)) |
| **Chrome Extension** | ✅ Ready | WXT + React + WASM | Load unpacked (see [setup](#chrome-extension)) |
| **WeChat Mini Program** | ✅ Ready | Taro 4 + React | Import to WeChat DevTools (see [setup](#wechat-mini-program)) |

## Architecture

```
                         ┌─────────────┐
                         │  json-core  │  (Rust library)
                         │  10 tools   │
                         └──────┬──────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
       ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐
       │   WASM      │  │    Tauri      │  │  Pure JS    │
       │ (wasm-pack) │  │  (native)     │  │ (fallback)  │
       └──────┬──────┘  └───────┬───────┘  └──────┬──────┘
              │                 │                  │
      ┌───────┴───────┐  ┌─────┴──────┐    ┌──────┴──────┐
      │               │  │            │    │             │
 ┌────▼────┐  ┌───────▼──┐ │ ┌────────▼──┐ │ ┌──────────▼──┐
 │ Web SPA │  │ Chrome   │ │ │ macOS App │ │ │ Mini Program│
 │ (Vite)  │  │ Extension│ │ │ Win/Linux │ │ │ (Taro)      │
 └─────────┘  └──────────┘ │ │ Android   │ │ └─────────────┘
                           │ │ iOS       │ │
              ┌────────────┘ └───────────┘ │
              └─ Mobile uses Tauri native ─┘
```

**Key design**: The Rust `json-core` crate compiles to both WASM (for web/extension) and native (for Tauri desktop/mobile). A platform adapter auto-detects the environment and routes calls accordingly. The mini program uses a pure JS fallback since WASM support is limited in that environment.

## Project Structure

```
json-toolkit/
├── crates/json-core/        # Shared Rust core (10 JSON tools + WASM bindings)
├── src-tauri/               # Tauri desktop + mobile app
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   ├── lib.rs           # Tauri app setup
│   │   └── commands.rs      # 12 Tauri commands wrapping json-core
│   ├── Cargo.toml           # Tauri dependencies
│   ├── tauri.conf.json      # Tauri config (desktop + mobile)
│   └── capabilities/        # Tauri 2.0 capability configs
├── web/                     # Web app (Vite + React + TailwindCSS)
│   ├── src/
│   │   ├── App.tsx          # Main app with sidebar + tool routing
│   │   ├── tools/           # 10 tool components
│   │   ├── lib/
│   │   │   ├── adapter.ts   # Platform adapter (WASM vs Tauri)
│   │   │   ├── types.ts     # Shared TypeScript types
│   │   │   ├── tools.ts     # Tool metadata + categories
│   │   │   └── i18n.ts      # Chinese/English translations
│   │   ├── components/      # Shared UI components
│   │   ├── store.ts         # Zustand state (theme, lang, history)
│   │   └── wasm/            # Generated WASM output (gitignored)
│   ├── vite.config.ts
│   └── package.json
├── extension/               # Chrome Extension (WXT + React + WASM)
│   ├── entrypoints/
│   │   ├── popup/           # 400×500 popup with 4 quick tools
│   │   ├── sidepanel/       # Full side panel with all 9 tools
│   │   ├── background.ts    # Service worker
│   │   └── content.ts       # Auto-detect JSON on pages
│   ├── utils/wasm.ts        # WASM loader via chrome.runtime
│   ├── wasm/                # Copied WASM files (gitignored)
│   ├── wxt.config.ts        # WXT config with manifest
│   └── package.json
├── miniprogram/             # WeChat Mini Program (Taro 4 + React)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index/       # Main page (tool grid + input/output)
│   │   │   ├── result/      # Result display page
│   │   │   └── about/       # About page
│   │   ├── utils/
│   │   │   └── jsonTools.ts # Pure JS implementation (7 tools)
│   │   ├── app.ts           # App entry
│   │   ├── app.config.ts    # Pages + tabBar config
│   │   └── app.css          # Global styles
│   ├── config/index.ts      # Taro build config
│   ├── project.config.json  # WeChat DevTools config
│   └── package.json
├── .github/workflows/
│   ├── ci.yml               # Rust tests + web build (on push/PR)
│   ├── deploy-web.yml       # Deploy to GitHub Pages (on push to main)
│   ├── build-desktop.yml    # Build macOS/Win/Linux (on tag push)
│   ├── build-mobile.yml     # Build Android/iOS (on tag push)
│   └── build-extension.yml  # Build Chrome Extension (on tag push)
├── Cargo.toml               # Rust workspace root
├── package.json             # pnpm workspace root (all scripts)
├── pnpm-workspace.yaml      # Workspace: web + extension + miniprogram
└── rust-toolchain.toml      # Rust toolchain config
```

## Getting Started

### Prerequisites

- **Rust** 1.75+ (`rustup`)
- **Node.js** 20+ and **pnpm** 10+
- **wasm-pack** (`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`)
- **Android Studio** (for Android builds only)
- **Xcode** (for iOS builds only, macOS only)
- **WeChat DevTools** (for mini program only)

### Quick Start

```bash
# Clone
git clone https://github.com/junhey/json-toolkit.git
cd json-toolkit

# Install dependencies
pnpm install

# Build WASM core (required before first run)
pnpm wasm:build

# Run web dev server
pnpm dev:web          # → http://localhost:5173

# Run Tauri desktop dev (macOS)
pnpm dev:tauri        # → opens desktop window

# Run tests
pnpm test:rust        # → 37 Rust unit tests
```

## Platform Guide

### Web

Already deployed to GitHub Pages: [https://junhey.github.io/json-toolkit/](https://junhey.github.io/json-toolkit/)

```bash
# Dev
pnpm dev:web

# Build for production
pnpm build:web

# Build for GitHub Pages (uses /json-toolkit/ base path)
GITHUB_PAGES=true pnpm --filter web build
```

Deployment is automatic — pushing to `main` triggers the `deploy-web.yml` workflow.

### Desktop (macOS / Windows / Linux)

```bash
# Dev (macOS)
pnpm dev:tauri

# Build for current platform
pnpm build:tauri
# Output: src-tauri/target/release/bundle/

# Cross-compile (macOS only)
pnpm build:tauri -- --target aarch64-apple-darwin  # Apple Silicon
pnpm build:tauri -- --target x86_64-apple-darwin   # Intel
```

**CI builds**: Push a `v*` tag to trigger automatic builds for all desktop platforms:

```bash
git tag v0.2.0
git push origin v0.2.0
# → GitHub Actions builds .dmg (macOS), .msi (Windows), .deb (Linux)
```

**Linux prerequisites**:
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Android / iOS

Tauri Mobile uses the same React frontend and Rust core, packaged as a native mobile app.

**One-time setup**:

```bash
# Android: Install Android Studio + NDK + set ANDROID_HOME
# https://tauri.app/start/prerequisites/#android

# iOS: Install Xcode (macOS only)
# https://tauri.app/start/prerequisites/#ios

# Initialize mobile projects (generates src-tauri/gen/)
pnpm tauri android init
pnpm tauri ios init
```

**Development**:

```bash
# Android dev (requires Android emulator or device)
pnpm dev:android

# iOS dev (requires iOS Simulator or device)
pnpm dev:ios
```

**Build**:

```bash
# Build Android APK
pnpm build:android
# Output: src-tauri/gen/android/app/build/outputs/apk/

# Build iOS (requires Apple Developer account for device builds)
pnpm build:ios
# Output: src-tauri/gen/apple/build/Release-iphoneos/
```

**CI builds**: The `build-mobile.yml` workflow runs on tag push. Android builds on Ubuntu, iOS builds on macOS. Both use `continue-on-error: true` since mobile builds may fail without proper signing keys.

### Chrome Extension

Built with [WXT](https://wxt.dev) framework — modern WebExtension development with Vite.

**Features**:
- **Popup** (400×500): Quick access to Format, Minify, Sort, JSONPath
- **Side Panel**: Full workspace with all 9 tools
- **Content Script**: Auto-detects JSON on web pages, shows badge
- **Powered by WASM**: Uses the same Rust core compiled to WASM

**Build**:

```bash
# Build WASM + copy to extension
pnpm wasm:build
pnpm wasm:copy-ext

# Build extension
pnpm build:extension
# Output: extension/.output/chrome-mv3/
```

**Load in Chrome**:

1. Run `pnpm build:extension`
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension/.output/chrome-mv3/` directory
6. The JSON Toolkit icon appears in your toolbar

**Dev mode**:

```bash
pnpm dev:extension    # → WXT dev mode with hot reload
```

**CI builds**: Push a `v*` tag to build and package the extension as a `.zip` for Chrome Web Store submission.

### WeChat Mini Program

Built with [Taro 4](https://taro.jd.com) — cross-platform mini program framework.

**Features**:
- **7 tools**: Format, Minify, Sort, Decode, JSONPath, Validate, CSV
- **Pure JS implementation** (WASM not directly available in MP runtime)
- **TabBar navigation**: Tools + About
- **Chinese UI** optimized for mobile

> **Note**: WeChat Mini Programs have limited WASM support. This implementation uses a pure JavaScript fallback that handles all core operations. To integrate WASM, see [WeChat WASM docs](https://developers.weixin.qq.com/miniprogram/dev/framework/client-sdk/wasm.html).

**Build**:

```bash
# Install miniprogram dependencies
pnpm --filter miniprogram install

# Build for WeChat
pnpm build:miniprogram
# Output: miniprogram/dist/
```

**Import to WeChat DevTools**:

1. Run `pnpm build:miniprogram`
2. Open **WeChat DevTools** (微信开发者工具)
3. Select **Import project** (导入项目)
4. Choose the `miniprogram/` directory
5. Set your AppID (or use test AppID)
6. The project loads with the built files in `miniprogram/dist/`

**Dev mode**:

```bash
pnpm dev:miniprogram    # → Watch mode, rebuilds on file change
```

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Push to main/PR | Rust tests + WASM build + Web build verification |
| `deploy-web.yml` | Push to main | Build web → Deploy to GitHub Pages |
| `build-desktop.yml` | Tag `v*` push | Build macOS (.dmg), Windows (.msi), Linux (.deb) |
| `build-mobile.yml` | Tag `v*` push | Build Android (.apk) + iOS (.ipa) |
| `build-extension.yml` | Tag `v*` push | Build Chrome Extension (.zip) |

**Release flow**:

```bash
# 1. Update version in package.json and src-tauri/tauri.conf.json
# 2. Commit and push
git commit -am "release: v0.2.0"
git push

# 3. Create tag
git tag v0.2.0
git push origin v0.2.0

# 4. GitHub Actions builds all platforms automatically
# → Draft release with all artifacts attached
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Core** | Rust, serde_json, jsonpath_lib, jsonschema, csv, base64 |
| **Desktop/Mobile** | Tauri 2.0 (macOS, Windows, Linux, Android, iOS) |
| **Web** | Vite, React 18, TypeScript, TailwindCSS |
| **Extension** | WXT, React, Chrome Manifest V3 |
| **Mini Program** | Taro 4, React |
| **Bridge** | wasm-pack, wasm-bindgen (Web + Extension) |
| **State** | Zustand with localStorage persistence |
| **CI/CD** | GitHub Actions (5 workflows) |

## Scripts Reference

| Command | Description |
|---------|------------|
| `pnpm wasm:build` | Build Rust core to WASM |
| `pnpm wasm:copy-ext` | Copy WASM files to extension dir |
| `pnpm dev:web` | Web dev server (port 5173) |
| `pnpm dev:tauri` | Tauri desktop dev |
| `pnpm dev:android` | Android dev (needs SDK) |
| `pnpm dev:ios` | iOS dev (needs Xcode) |
| `pnpm dev:extension` | Chrome extension dev with HMR |
| `pnpm dev:miniprogram` | Mini program dev with watch |
| `pnpm build:web` | Build web for production |
| `pnpm build:tauri` | Build desktop app |
| `pnpm build:android` | Build Android APK |
| `pnpm build:ios` | Build iOS app |
| `pnpm build:extension` | Build Chrome extension |
| `pnpm build:miniprogram` | Build WeChat mini program |
| `pnpm test:rust` | Run 37 Rust unit tests |

## License

MIT
