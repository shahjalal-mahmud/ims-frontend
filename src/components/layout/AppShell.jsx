// src/components/layout/AppShell.jsx
// Protected layout — renders Sidebar + Topbar + <Outlet />. The element on
// the protected layout route (see docs/Routing.md §2).
//
// The Topbar's title comes from a hardcoded mapping here (pathname
// prefix → label). Each protected route still sets a `handle.title`
// in App.jsx so future routes can be added in one place if we want
// route-driven titles; for now the AppShell prefix mapping is what
// drives the Topbar heading. Falls back to "Dashboard" otherwise.

import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell() {
    const location = useLocation();

    let title = "Dashboard";

    if (location.pathname.startsWith("/categories"))
        title = "Categories";
    else if (location.pathname.startsWith("/suppliers"))
        title = "Suppliers";
    else if (location.pathname.startsWith("/products"))
        title = "Products";
    else if (location.pathname.startsWith("/reports"))
        title = "Reports";

  return (
    <div className="min-h-screen flex bg-base-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
