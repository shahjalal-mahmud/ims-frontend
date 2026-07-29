// src/components/layout/Sidebar.jsx
// Primary navigation for the protected app.
//
// Active state highlights the current route via React Router's
// NavLink. Groups (Inventory, Reports) keep the menu organized and
// grow cleanly as new routes land — just add an item to the right
// NAV_GROUPS entry.
//
// Per docs/Component_Architecture.md §1 and docs/UI_Design_System.md §1.

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Tags,
  Truck,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileBarChart2,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/inventory/products', label: 'Products', icon: Package },
      { to: '/inventory/categories', label: 'Categories', icon: Tags },
      { to: '/inventory/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/inventory/stock-in', label: 'Stock In', icon: ArrowDownToLine },
      { to: '/inventory/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: '/reports/inventory', label: 'Inventory', icon: FileBarChart2 },
      { to: '/reports/low-stock', label: 'Low Stock', icon: FileBarChart2 },
      { to: '/reports/stock-in', label: 'Stock In', icon: FileBarChart2 },
      { to: '/reports/stock-out', label: 'Stock Out', icon: FileBarChart2 },
    ],
  },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-base-content/80 hover:bg-base-200'
          }`
        }
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
      </NavLink>
    </li>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-base-300 bg-base-100">
      <div className="px-4 py-4 border-b border-base-300">
        <h1 className="text-lg font-semibold">IMS</h1>
        <p className="text-xs text-base-content/60">Inventory Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi === 0 ? '' : 'mt-4'}>
            {group.title && (
              <h2 className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">
                {group.title}
              </h2>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
