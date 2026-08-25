import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Droplet,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'donors', label: 'Donors', icon: Users },
  { id: 'operations', label: 'Operations', icon: Activity },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function Navbar({ activeTab = 'dashboard', onTabChange }) {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = (tabId) => {
    if (typeof onTabChange === 'function') {
      onTabChange(tabId);
    }
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 shadow-[0_1px_0_rgb(15_23_42/0.03)] backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="group flex cursor-pointer items-center gap-2.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-white shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-6 group-hover:scale-105">
            <Droplet className="h-5 w-5 fill-white" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-slate-900">
              NSS Rudhirasena
            </span>
            <span className="block text-xs font-medium text-slate-500">
              Donor Directory
            </span>
          </span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1.5 md:flex">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-[color,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                  isActive
                    ? 'bg-red-50 text-red-700 shadow-xs ring-1 ring-inset ring-red-200/60'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-red-700' : 'text-slate-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}

          <div className="mx-2 h-4 w-px bg-slate-200" />

          <button
            type="button"
            onClick={logout}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-[color,background-color,border-color,transform] duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Logout
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-[background-color,transform] duration-150 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-90 md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="animate-fade border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1.5 pt-3">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-red-700' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={logout}
              className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
