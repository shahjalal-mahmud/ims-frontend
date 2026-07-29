// src/pages/NotFound.jsx
// Catch-all 404 page. Mounted on `*` in src/App.jsx — anything that
// doesn't match a route above lands here.
//
// See docs/Routing.md.

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card bg-base-100 shadow-md w-full max-w-md">
        <div className="card-body">
          <h1 className="card-title text-2xl">Page not found</h1>
          <p className="text-base-content/70">
            The page you’re looking for doesn’t exist.
          </p>
          <div className="card-actions justify-end mt-2">
            <Link to="/dashboard" className="btn btn-primary">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}