import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Receipt, Building2 } from 'lucide-react';
import { useFirma } from '../context/FirmaContext';
import { getFirme } from '../utils/storage';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/klijenti', label: 'Klijenti', icon: Users },
  { to: '/fakture', label: 'Fakture', icon: FileText },
];

export default function Layout() {
  const { selectedFirmaId, setSelectedFirmaId } = useFirma();
  const firme = getFirme();

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

        {/* Firma selector */}
        <div className="px-3 py-3 border-b border-slate-700">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 px-1">
            <Building2 size={11} />
            <span>Firma</span>
          </div>
          <select
            value={selectedFirmaId ?? ''}
            onChange={e => setSelectedFirmaId(e.target.value || undefined)}
            className="w-full bg-slate-700 text-white text-sm rounded-lg px-2.5 py-2 border border-slate-600 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Sve firme</option>
            {firme.map(f => (
              <option key={f.id} value={f.id}>{f.naziv}</option>
            ))}
          </select>
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

        {selectedFirmaId && (
          <div className="px-3 py-2 mx-2 mb-2 bg-blue-900/40 rounded-lg border border-blue-700/30">
            <div className="text-xs text-blue-300 font-medium truncate">
              {firme.find(f => f.id === selectedFirmaId)?.naziv}
            </div>
            <button
              onClick={() => setSelectedFirmaId(undefined)}
              className="text-xs text-blue-400 hover:text-white mt-0.5"
            >
              Prikaži sve firme
            </button>
          </div>
        )}

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
