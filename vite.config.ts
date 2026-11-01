import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * The security headers nginx.conf sends, minus the Content-Security-Policy: the dev server and its hot reload need
 * inline and eval'd scripts, so the CSP is only enforced by the production image.
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // Table QR links carry their token in the URL: never send it to another site in the Referer.
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    headers: SECURITY_HEADERS,
    // Same-origin API calls in development: the browser talks to Vite, Vite forwards /api.
    proxy: {
      // changeOrigin keeps what the string shorthand did before. The proxy pipes responses as they
      // arrive, so the Server-Sent Events (/api/v1/table/events, /api/v1/staff/events) stream unbuffered; the API
      // also sends Cache-Control: no-cache and X-Accel-Buffering: no for proxies in front of it.
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8020',
        changeOrigin: true,
        // xfwd adds the X-Forwarded-Proto/Host/Port headers; X-Forwarded-For is then overwritten below.
        xfwd: true,
        configure: (proxy) => {
          // The API counts login attempts per device: it gets the real socket address, never a value the
          // client chose (xfwd alone would append to a client-sent X-Forwarded-For).
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('x-forwarded-for', req.socket.remoteAddress ?? '')
          })
        },
      },
    },
    // Bind mounts from Windows/macOS hosts into Docker do not emit file events.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
  },
})
