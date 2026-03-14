import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Negocios', icon: '🏪', exact: true },
  { to: '/upcoming', label: 'Visitas', icon: '📅' },
  { to: '/map', label: 'Mapa', icon: '🗺️' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
  { to: '/orders', label: 'Pedidos', icon: '📦' },
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
      {/* Header */}
      <header className="bg-blue-600 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧊</span>
            <div>
              <h1 className="font-bold text-base leading-tight">All ice</h1>
              <p className="text-xs text-blue-200">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-blue-100 active:text-white text-sm px-3 py-1.5 rounded-lg active:bg-blue-700 transition-colors"
          >
            Salir
          </button>
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
