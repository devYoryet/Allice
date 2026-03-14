import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI } from '../api/client';
import { VisitaBadge } from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short',
  });
}

function BusinessCard({ business, onClick }) {
  return (
    <div
      className="card active:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{business.nombre}</h3>
          <p className="text-sm text-gray-500 truncate mt-0.5">{business.direccion}</p>
          {business.persona_cargo && (
            <p className="text-xs text-gray-400 mt-0.5">👤 {business.persona_cargo}</p>
          )}
        </div>
        <VisitaBadge estado={business.estado_visita} />
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400">Última visita</p>
          <p className="text-sm font-medium text-gray-700">
            {business.ultima_visita ? formatDate(business.ultima_visita) : '—'}
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400">Últimos kilos</p>
          <p className="text-sm font-medium text-gray-700">
            {business.ultimos_kilos ? `${business.ultimos_kilos} kg` : '—'}
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400">Próxima visita</p>
          <p className="text-sm font-medium text-gray-700">
            {business.proxima_visita ? formatDate(business.proxima_visita) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BusinessListPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await businessAPI.getAll(search);
      setBusinesses(data);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  return (
    <div className="page-container">
      {/* Header de página */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Negocios</h2>
        <button
          onClick={() => navigate('/businesses/new')}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl active:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <span className="text-base">+</span> Nuevo
        </button>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="search"
          className="input-field flex-1"
          placeholder="Buscar por nombre o dirección..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl active:bg-blue-700">
          🔍
        </button>
        {search && (
          <button type="button" onClick={clearSearch} className="bg-gray-200 text-gray-600 px-3 rounded-xl">
            ✕
          </button>
        )}
      </form>

      {/* Resultados */}
      {loading ? (
        <LoadingSpinner />
      ) : businesses.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🏪</span>
          <p className="text-gray-500 mt-3">
            {search ? 'No se encontraron negocios' : 'Aún no hay negocios registrados'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/businesses/new')}
              className="mt-4 btn-primary w-auto px-6 inline-block"
            >
              Agregar primer negocio
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{businesses.length} negocio{businesses.length !== 1 ? 's' : ''}</p>
          {businesses.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              onClick={() => navigate(`/businesses/${b.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
