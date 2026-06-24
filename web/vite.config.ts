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
  // GitHub Pages uses /json-toolkit/ base, other deployments use /
  base: process.env.GITHUB_PAGES === 'true' ? '/json-toolkit/' : '/',
});
