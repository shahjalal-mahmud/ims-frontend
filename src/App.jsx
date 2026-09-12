// src/App.jsx
// Full route table per docs/Routing.md §1–2.
//
//   /                                — PublicOnlyRoute → Landing
//   /login                           — PublicOnlyRoute → Login
//   /  (layout route, Protected)     — AppShell (Sidebar + Topbar + <Outlet/>)
//     /dashboard                     — Dashboard
//     /inventory/products            — ProductsList
//     /inventory/products/new        — ProductForm (create)
//     /inventory/products/:id/edit   — ProductForm (edit)
//     /inventory/categories          — CategoriesList
//     /inventory/suppliers           — SuppliersList
//     /inventory/stock-in            — StockInList
//     /inventory/stock-out           — StockOutList
//   /reports/inventory               — InventoryReport
//   /reports/low-stock               — LowStockReport
//   /reports/stock-in                — StockInReport
//   /reports/stock-out               — StockOutReport
//   *                                — NotFound
//
// Note on "/" vs the protected layout:
//   "/" is now owned by the public Landing page (wrapped in
//   PublicOnlyRoute, same as /login) — an already-authenticated
//   visitor hitting "/" is redirected to /dashboard by
//   PublicOnlyRoute's own logic, identical to how it already
//   handles /login. The protected AppShell no longer declares an
//   `index` route; its children are absolute paths ("dashboard",
//   "inventory/products", etc.) that resolve the same as before —
//   removing the index route doesn't affect them.
//
// No `<BrowserRouter basename>` — the app is served at the XAMPP
// root (http://localhost/), so `<Link to="/dashboard">` produces
// /dashboard as expected.
//
// Each protected child route sets `handle.title`, which the AppShell
// uses to populate the Topbar heading. That means future milestones
// can drop in a new route without touching the shell — the title is
// declared next to the route definition.

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import AppShell from './components/layout/AppShell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

import ProductsList from './pages/inventory/ProductsList';
import ProductForm from './pages/inventory/ProductForm';
import CategoriesList from './pages/inventory/CategoriesList';
import SuppliersList from './pages/inventory/SuppliersList';
import StockInList from './pages/inventory/StockInList';
import StockOutList from './pages/inventory/StockOutList';

import InventoryReport from './pages/reports/InventoryReport';
import LowStockReport from './pages/reports/LowStockReport';
import StockInReport from './pages/reports/StockInReport';
import StockOutReport from './pages/reports/StockOutReport';

export default function App() {
  return (
    // No basename — the app is served at http://localhost/ (XAMPP root),
    // so <Link to="/dashboard"> produces /dashboard as expected.
    <BrowserRouter>
      <Routes>
        {/* Public-only */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected (AppShell) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route
              path="dashboard"
              element={<Dashboard />}
              handle={{ title: 'Dashboard' }}
            />

            <Route
              path="inventory/products"
              element={<ProductsList />}
              handle={{ title: 'Products' }}
            />
            <Route
              path="inventory/products/new"
              element={<ProductForm />}
              handle={{ title: 'New Product' }}
            />
            <Route
              path="inventory/products/:id/edit"
              element={<ProductForm />}
              handle={{ title: 'Edit Product' }}
            />
            <Route
              path="inventory/categories"
              element={<CategoriesList />}
              handle={{ title: 'Categories' }}
            />
            <Route
              path="inventory/suppliers"
              element={<SuppliersList />}
              handle={{ title: 'Suppliers' }}
            />
            <Route
              path="inventory/stock-in"
              element={<StockInList />}
              handle={{ title: 'Stock In' }}
            />
            <Route
              path="inventory/stock-out"
              element={<StockOutList />}
              handle={{ title: 'Stock Out' }}
            />

            <Route
              path="reports/inventory"
              element={<InventoryReport />}
              handle={{ title: 'Inventory Report' }}
            />
            <Route
              path="reports/low-stock"
              element={<LowStockReport />}
              handle={{ title: 'Low Stock Report' }}
            />
            <Route
              path="reports/stock-in"
              element={<StockInReport />}
              handle={{ title: 'Stock In Report' }}
            />
            <Route
              path="reports/stock-out"
              element={<StockOutReport />}
              handle={{ title: 'Stock Out Report' }}
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}