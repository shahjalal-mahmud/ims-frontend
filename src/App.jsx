// src/App.jsx
// Milestone 0: minimal router placeholder — no real routes yet.
// Real route table is defined in docs/Routing.md and will be added in
// later milestones (protected routes, login, dashboard, etc.).

import { BrowserRouter, Routes, Route } from 'react-router-dom';

function MilestoneZero() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card bg-base-100 shadow-md w-full max-w-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl">Inventory Management System</h1>
          <p className="text-base-content/70">Milestone 0 — frontend ready.</p>
          <ul className="list-disc list-inside text-sm text-base-content/70 mt-2 space-y-1">
            <li>Vite + React + Tailwind + DaisyUI</li>
            <li>React Query + React Hot Toast</li>
            <li>Axios client pointed at the configured backend</li>
            <li>Routes: coming in a later milestone</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<MilestoneZero />} />
      </Routes>
    </BrowserRouter>
  );
}
