import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

function optionalTauriApi(): Plugin {
  const require = createRequire(import.meta.url);
  const available = (() => {
    try {
      require.resolve('@tauri-apps/api/core');
      return true;
    } catch {
      return false;
    }
  })();

  return {
    name: 'optional-tauri-api',
    resolveId(id) {
      if (id === '@tauri-apps/api/core' && !available) {
        return '\0tauri-api-stub';
      }
    },
    load(id) {
      if (id === '\0tauri-api-stub') {
        return 'export async function invoke() { throw new Error("Tauri API is only available in the desktop app"); }';
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), optionalTauriApi()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['@tauri-apps/api/core'],
  },
  build: {
    target: ['es2021', 'chrome105', 'safari13'],
    rollupOptions: {
      external: ['@tauri-apps/api/core'],
    },
  },
  base: process.env.GITHUB_PAGES === 'true' ? '/json-toolkit/' : '/',
});
