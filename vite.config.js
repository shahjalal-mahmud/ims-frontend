import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// Local development against a XAMPP-hosted PHP backend.
//
// The Vite dev server (http://localhost:5173) forwards /api/* requests to
// the PHP backend at http://localhost/inventory-management-backend/api.
// This avoids CORS preflight during development while preserving
// `withCredentials: true` so the HttpOnly PHPSESSID cookie still flows to
// the backend.
//
// To run the production build under XAMPP, build with `npm run build` and
// drop the contents of `dist/` into `C:\xampp\htdocs\`. Make sure the
// backend lives at `\xampp\htdocs\inventory-management-backend\api\` so
// the rewritten `/api/*` paths resolve.
const API_TARGET = 'http://localhost/inventory-management-backend/api'

export default defineConfig({
  // Serve the app at http://localhost/ — the root of XAMPP's htdocs.
  // Using './' makes built assets resolve relative to index.html, so the
  // bundle works whether you drop it at the htdocs root or in any
  // subfolder without rebuilding.
  base: './',
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
