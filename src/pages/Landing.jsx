// src/pages/Landing.jsx
// Public marketing/landing page, served at "/".
//
// Wrapped in PublicOnlyRoute (same as /login) — an already-authenticated
// visitor is redirected to /dashboard automatically by that guard, so
// this component only ever needs to handle the "not logged in" case.
//
// The "Sign In" / "Get Started" buttons are plain <Link to="/login">
// — they don't reimplement auth, they just route to the existing
// Login.jsx screen untouched.

import { Link } from 'react-router-dom';
import {
  LogIn,
  Package,
  Tags,
  PackagePlus,
  PackageMinus,
  LayoutDashboard,
  BarChart3,
  Moon,
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Product Management',
    description:
      'Create, edit, delete, and search products with fast, paginated tables.',
  },
  {
    icon: Tags,
    title: 'Categories & Suppliers',
    description:
      'Full CRUD for inventory classifications and vendor records.',
  },
  {
    icon: PackagePlus,
    title: 'Stock-In Tracking',
    description: 'Record incoming inventory against suppliers as it arrives.',
  },
  {
    icon: PackageMinus,
    title: 'Stock-Out Tracking',
    description: 'Log outgoing inventory with reason tracking built in.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'KPIs and recent activity at a glance, the moment you sign in.',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description:
      'Inventory, low-stock, stock-in, and stock-out reports on demand.',
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-base-200">
      {/* Nav */}
      <header className="navbar bg-base-100 shadow-sm px-4 sm:px-8">
        <div className="flex-1">
          <span className="text-lg font-semibold">
            Inventory Management System
          </span>
        </div>
        <div className="flex-none">
          <Link to="/login" className="btn btn-primary btn-sm">
            <LogIn size={16} />
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero py-16 sm:py-24 px-4">
        <div className="hero-content text-center max-w-2xl flex-col">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Inventory, under control.
          </h1>
          <p className="py-6 text-base-content/70 text-base sm:text-lg">
            A fast, modern way to manage products, suppliers, categories, and
            stock movements — with real-time reports and a dashboard that
            keeps you on top of it all.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">
            <LogIn size={18} />
            Sign in to continue
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon size={20} />
                  </div>
                  <h2 className="card-title text-base">{title}</h2>
                </div>
                <p className="text-sm text-base-content/70">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-center p-6 bg-base-100 border-t border-base-300 text-base-content/60 text-sm">
        <div className="flex items-center gap-2">
          <Moon size={14} />
          <span>Light &amp; dark theme supported · Sign in to get started</span>
        </div>
      </footer>
    </main>
  );
}