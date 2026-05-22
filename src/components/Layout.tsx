import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Receipt } from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/klijenti', label: 'Klijenti', icon: Users },
  { to: '/fakture', label: 'Fakture', icon: FileText },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-slate-800 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Receipt className="text-blue-400" size={22} />
            <span className="font-bold text-lg tracking-tight">FaktCRM</span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">Upravljanje fakturama</p>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-700 text-slate-500 text-xs">
          Sva dugovanja u RSD
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
