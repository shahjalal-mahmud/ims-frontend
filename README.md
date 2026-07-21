# Inventory Management System — Frontend

A modern, responsive web application for managing inventory, products, suppliers, categories, and stock movements. Built with React 19, Vite, and TanStack Query, this frontend pairs with a PHP backend to deliver a fast, intuitive stock-management experience.

---

## ✨ Features

- 🔐 **Authentication** — Session-based login with HttpOnly cookies and protected routes
- 📦 **Product Management** — Create, edit, delete, and search products with pagination
- 🏷️ **Category & Supplier Management** — Full CRUD for inventory classifications and vendors
- 📥 **Stock-In Tracking** — Record incoming inventory against suppliers
- 📤 **Stock-Out Tracking** — Record outgoing inventory with reason tracking
- 📊 **Dashboard** — KPIs and recent activity at a glance
- 📈 **Reports** — Inventory, low-stock, stock-in, and stock-out reports
- 🌙 **Light / Dark Theme** — User-selectable, persisted to localStorage
- 🎨 **Modern UI** — Tailwind CSS + DaisyUI with a consistent design system
- ⚡ **Optimistic UX** — Skeleton loaders, debounced search, and `keepPreviousData` pagination

---

## 🛠️ Tech Stack

| Concern                | Choice                          |
| ---------------------- | ------------------------------- |
| Build tool             | [Vite](https://vite.dev)        |
| Framework              | [React 19](https://react.dev)   |
| Routing                | [React Router v7](https://reactrouter.com) |
| HTTP client            | [Axios](https://axios-http.com) |
| Server state / caching | [TanStack Query](https://tanstack.com/query) |
| Forms                  | [React Hook Form](https://react-hook-form.com) |
| Validation             | [Zod](https://zod.dev)          |
| Styling                | [Tailwind CSS v4](https://tailwindcss.com) + [DaisyUI](https://daisyui.com) |
| Icons                  | [Lucide React](https://lucide.dev) |
| Notifications          | [React Hot Toast](https://react-hot-toast.com) |
| Linting                | [ESLint](https://eslint.org)    |

---

## 📋 Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or `pnpm` / `yarn`)
- A running PHP backend — see [`inventory-management-backend`](https://github.com/your-org/inventory-management-backend) for setup instructions.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/ims-frontend.git
cd ims-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.development` file (already present in this repo):

```env
# In development, leave VITE_API_BASE_URL unset so the Vite proxy
# (see vite.config.js) forwards /api/* to the PHP backend.
# VITE_API_BASE_URL=
```

For production builds, create `.env.production`:

```env
VITE_API_BASE_URL=https://api.your-domain.com
```

### 4. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

API requests to `/api/*` are proxied to `http://localhost/inventory-management-backend/api` (configurable in `vite.config.js`).

---

## 📜 Available Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start the Vite dev server with HMR       |
| `npm run build`    | Build the app for production into `dist/` |
| `npm run preview`  | Preview the production build locally     |
| `npm run lint`     | Run ESLint across the project            |

---

## 📁 Project Structure

```
src/
├── api/           # Thin Axios wrappers — one file per backend resource
├── queries/       # TanStack Query hooks — one file per resource
├── auth/          # AuthContext, AuthBootstrap, route guards, theme
├── pages/         # Top-level route components
│   ├── inventory/
│   └── reports/
├── components/
│   ├── ui/        # Generic, app-agnostic building blocks
│   ├── layout/    # AppShell, Sidebar, Topbar
│   └── domain/    # Feature-specific composites
├── lib/           # Shared helpers (validators, format, queryKeys, errors)
├── config.js      # BASE_URL, timeouts
├── App.jsx        # Route table
└── main.jsx       # QueryClientProvider + AuthBootstrap + Toaster + Router
```

See [`docs/Frontend_Architecture.md`](./docs/Frontend_Architecture.md) for an in-depth walkthrough.

---

## 🏗️ Architecture Overview

The codebase follows a strict layered data flow:

```
Component
   │  calls
   ▼
queries/useXQueries.js   (useQuery / useMutation, owns cache key + invalidation)
   │  calls
   ▼
api/x.js                 (one function per endpoint, unwraps { data } envelope)
   │  calls
   ▼
api/client.js            (Axios instance: baseURL, withCredentials, interceptors)
   │
   ▼
PHP Backend
```

**Key rules:**
- Components **never** call `axios` or the `api/` layer directly — always go through `queries/`.
- The `queries/` layer **never** touches the DOM or React state beyond what Query manages.
- URL search params hold filter & pagination state so views are shareable and survive refresh.
- A single global Axios response interceptor handles `401` (clears auth + query cache, redirects to login).

Full architecture details, authentication flow, and error-handling matrix live in [`docs/`](./docs).

---

## 🎨 Design System

Styling is built on Tailwind CSS v4 + DaisyUI. The theme tokens, component primitives, and loading-state patterns are documented in [`docs/UI_Design_System.md`](./docs/UI_Design_System.md). Light/dark themes are toggled via a `ThemeContext` and persisted to `localStorage`.

---

## 📚 Documentation

Comprehensive design and implementation docs live in the [`docs/`](./docs) directory:

- 📘 [Frontend Architecture](./docs/Frontend_Architecture.md)
- 📘 [API Integration Guide](./docs/FRONTEND_API_INTEGRATION_GUIDE.md)
- 📘 [Routing](./docs/Routing.md)
- 📘 [State Management](./docs/State_Management.md)
- 📘 [Component Architecture](./docs/Component_Architecture.md)
- 📘 [UI Design System](./docs/UI_Design_System.md)
- 📘 [UI Screens](./docs/UI_Screens.md)
- 📘 [Form Validation](./docs/Form_Validation.md)
- 📘 [Error Handling](./docs/Error_Handling.md)
- 📘 [Frontend Implementation Roadmap](./docs/Frontend_Implementation_Roadmap.md)

---

## 🚢 Deployment

1. Build the production bundle:

   ```bash
   npm run build
   ```

2. The output lives in `dist/`. Because `vite.config.js` sets `base: './'`, assets are loaded relative to `index.html`, making the bundle safe to drop into any subdirectory on cPanel, nginx, or any static host.

3. Ensure `VITE_API_BASE_URL` is set to your production API origin at build time.

4. Upload `dist/` to your hosting provider and configure your web server to serve `index.html` for unknown routes (SPA fallback).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure `npm run lint` passes and follow the conventions laid out in [`docs/Frontend_Architecture.md`](./docs/Frontend_Architecture.md).

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 🙏 Acknowledgments

- [Vite](https://vite.dev) for the blazing-fast dev experience
- [TanStack](https://tanstack.com) for Query
- [Tailwind CSS](https://tailwindcss.com) and [DaisyUI](https://daisyui.com) for the styling foundation
- The React community for an incredible ecosystem
