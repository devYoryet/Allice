import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI, orderAPI } from '../api/client';
import { VisitaBadge } from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Modal para reasignar kg sin asignar ────────────────────────────────────
function ModalReasignar({ orphaned, businesses, onClose, onDone }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [targetId,      setTargetId]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [done,          setDone]          = useState(new Set()); // ids de grupos ya reasignados

  const fmtDt = (d) =>
    new Date(d).toLocaleString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const handleReasignar = async () => {
    if (!selectedGroup || !targetId) return;
    setLoading(true);
    try {
      await Promise.all(
        selectedGroup.orders.map((o) => orderAPI.update(o.id, { business_id: parseInt(targetId) }))
      );
      setDone((prev) => new Set([...prev, selectedGroup.business.id]));
      setSelectedGroup(null);
      setTargetId('');
    } catch (err) {
      alert('Error al reasignar: ' + (err.response?.data?.error || 'desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const remaining = orphaned.filter((g) => !done.has(g.business.id));
  const allDone   = remaining.length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {allDone ? '✅ Kilos reasignados' : 'Reasignar kg sin asignar'}
          </h3>
          <button
            onClick={allDone ? onDone : onClose}
            className="text-gray-400 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {allDone ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-bold text-green-700 mb-4">
              Todos los pedidos han sido reasignados
            </p>
            <button onClick={onDone} className="btn-primary">Cerrar</button>
          </div>
        ) : (
          remaining.map((group) => (
            <div key={group.business.id} className="card border-orange-200 bg-orange-50 space-y-3">
              {/* Cabecera del grupo */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-800">{group.business.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Eliminado: {fmtDt(group.business.deleted_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Por: {group.business.deleted_by_email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-700">
                    {group.total_kilos.toLocaleString('es-CL')} kg
                  </p>
                  <p className="text-xs text-gray-500">
                    {group.orders.length} pedido{group.orders.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Selector de destino */}
              {selectedGroup?.business.id === group.business.id ? (
                <div className="space-y-2">
                  <label className="label">Asignar a:</label>
                  <select
                    className="input-field"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    <option value="">Selecciona el negocio...</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setSelectedGroup(null); setTargetId(''); }}
                      className="btn-secondary text-sm py-2.5"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReasignar}
                      disabled={!targetId || loading}
                      className="py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold active:bg-orange-600 disabled:opacity-40"
                    >
                      {loading ? 'Reasignando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setSelectedGroup(group); setTargetId(''); }}
                  className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold active:bg-orange-600"
                >
                  Reasignar {group.total_kilos.toLocaleString('es-CL')} kg a otro negocio →
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
  const [businesses,   setBusinesses]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [orphaned,     setOrphaned]     = useState([]);
  const [showReasignar, setShowReasignar] = useState(false);

  const loadOrphaned = useCallback(() => {
    businessAPI.getOrphaned()
      .then(({ data }) => setOrphaned(data.orphaned || []))
      .catch(() => {});
  }, []);

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
  useEffect(() => { loadOrphaned(); }, [loadOrphaned]);

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

      {/* Banner kg sin asignar */}
      {orphaned.length > 0 && (
        <button
          onClick={() => setShowReasignar(true)}
          className="w-full card bg-orange-50 border-orange-300 text-left mb-2 active:bg-orange-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div className="flex-1">
              <p className="font-bold text-orange-800 text-sm">
                {orphaned.reduce((s, g) => s + g.total_kilos, 0).toLocaleString('es-CL')} kg sin asignar
              </p>
              <p className="text-xs text-orange-600">
                {orphaned.length} negocio{orphaned.length !== 1 ? 's' : ''} eliminado{orphaned.length !== 1 ? 's' : ''} · Toca para reasignar
              </p>
            </div>
            <span className="text-orange-400 text-xl font-bold">›</span>
          </div>
        </button>
      )}

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

      {/* Modal reasignación */}
      {showReasignar && (
        <ModalReasignar
          orphaned={orphaned}
          businesses={businesses}
          onClose={() => setShowReasignar(false)}
          onDone={() => { setShowReasignar(false); loadOrphaned(); load(); }}
        />
      )}
    </div>
  );
}
