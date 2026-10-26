import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Same-origin API calls in development: the browser talks to Vite, Vite forwards /api.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8020',
    },
    // Bind mounts from Windows/macOS hosts into Docker do not emit file events.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
  },
})
