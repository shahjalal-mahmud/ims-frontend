// src/components/layout/AppShell.jsx
// Protected layout — renders Sidebar + Topbar + <Outlet />. The element on
// the protected layout route (see docs/Routing.md §2).
//
// The Topbar's title comes from the matched child route's handle.title
// (configured on each route below). Falls back to a sensible default.

import { Outlet, useMatches } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell() {
  const matches = useMatches();
  // Find the deepest matched child route's handle.title, if any.
  const titleMatch = [...matches].reverse().find((m) => m.handle?.title);
  const title = titleMatch?.handle?.title;

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
