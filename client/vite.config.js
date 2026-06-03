import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Express server in development (no CORS friction).
    proxy: {
      '/api': {
        target: 'https://backandblack.studioubique-dev.com' || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
