import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IceLogo from './IceLogo';
import OfflineBanner from './OfflineBanner';

const navItems = [
  { to: '/',          label: 'Inicio',    icon: '🏠', exact: true },
  { to: '/businesses',label: 'Negocios',  icon: '🏪' },
  { to: '/produccion',label: 'Fábrica',   icon: '🏭' },
  { to: '/cobros',    label: 'Cobros',    icon: '💰' },
  { to: '/reports',   label: 'Reportes',  icon: '📊' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Banner offline/sincronizando */}
      <OfflineBanner />

      {/* Header */}
      <header
        className="text-white sticky top-0 z-40 shadow-md"
        style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <IceLogo variant="header" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-blue-200 font-medium">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-blue-100 active:text-white text-sm px-3 py-1.5 rounded-lg active:bg-blue-800 transition-colors border border-blue-400 border-opacity-40"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="pt-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors ${
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-500 active:text-gray-700'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
