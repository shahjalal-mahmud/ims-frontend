// src/App.jsx
// Minimal route table for Milestone 1.
//   /login                    — PublicOnlyRoute → Login
//   /  (index)                — ProtectedRoute → redirect to /dashboard
//   /dashboard                — ProtectedRoute → Dashboard placeholder
//   *                         — NotFound
// Full protected route table (products, categories, …) is wired in
// Milestone 2 per docs/Routing.md.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public-only */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}