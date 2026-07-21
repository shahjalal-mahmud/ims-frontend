import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// Dev-only API proxy: forwards /api/* requests from the Vite dev server
// (http://localhost:5173) to the PHP backend at
// http://localhost/inventory-management/backend/api. This avoids CORS
// preflight during development while preserving `withCredentials: true`
// so the HttpOnly PHPSESSID cookie still flows to the backend.
//
// In production, Vite is not in the picture — `src/config.js` reads
// VITE_API_BASE_URL directly, so this proxy is dev-only by construction.
const API_TARGET = 'http://localhost/inventory-management/backend/api'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        // Strip the /api prefix so /api/auth/me.php → /auth/me.php on the PHP server.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
