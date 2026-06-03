import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Where the app is served from. Root deploy -> '/' (default).
  // Subfolder deploy (e.g. https://site.com/app/) -> build with BASE_PATH=/app/
  base: process.env.BASE_PATH || '/',
  server: {
    port: 5173,
    // Proxy API calls to the Express server in development (no CORS friction).
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
