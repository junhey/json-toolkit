import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JSON Toolkit',
    description: 'Format, minify, sort, query JSON with JSONPath, and more - powered by Rust WASM',
    version: '0.1.0',
    permissions: ['storage', 'activeTab', 'sidePanel'],
    host_permissions: ['<all_urls>'],
    action: {
      defaultTitle: 'JSON Toolkit',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    web_accessible_resources: [
      {
        resources: ['wasm/*'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    build: {
      target: 'es2021',
    },
  }),
});
