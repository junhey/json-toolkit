import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: ['es2021', 'chrome105', 'safari13'],
    rollupOptions: {
      external: ['@tauri-apps/api/core'],
    },
  },
  base: process.env.GITHUB_PAGES ? '/json-toolkit/' : '/',
});
