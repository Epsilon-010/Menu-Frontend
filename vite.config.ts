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
    // xfwd adds X-Forwarded-For, so the API counts login attempts per device, not per proxy.
    proxy: {
      // changeOrigin keeps what the string shorthand did before. The proxy pipes responses as they
      // arrive, so the table's Server-Sent Events (/api/v1/table/events) stream unbuffered; the API
      // also sends Cache-Control: no-cache and X-Accel-Buffering: no for proxies in front of it.
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:8020', changeOrigin: true, xfwd: true },
    },
    // Bind mounts from Windows/macOS hosts into Docker do not emit file events.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
  },
})
