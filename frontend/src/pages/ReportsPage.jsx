import React, { useState, useEffect } from 'react';
import { reportAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

function formatNum(n) {
  return n?.toLocaleString('es-CL', { maximumFractionDigits: 1 }) || '0';
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card text-center">
      <span className="text-3xl">{icon}</span>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('week');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Comparación
  const [compare, setCompare] = useState({
    desde1: '', hasta1: '', desde2: '', hasta2: '',
  });
  const [compareResult, setCompareResult] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState('');

  useEffect(() => {
    setLoadingSummary(true);
    reportAPI.getSummary(period)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [period]);

  const handleCompare = async (e) => {
    e.preventDefault();
    setCompareError('');
    if (!compare.desde1 || !compare.hasta1 || !compare.desde2 || !compare.hasta2) {
      setCompareError('Todos los campos son requeridos');
      return;
    }
    setLoadingCompare(true);
    try {
      const { data } = await reportAPI.compareRanges(
        compare.desde1, compare.hasta1,
        compare.desde2, compare.hasta2
      );
      setCompareResult(data);
    } catch {
      setCompareError('Error al comparar rangos');
    } finally {
      setLoadingCompare(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Reportes</h2>

      {/* Selector período */}
      <div className="flex gap-2 mb-4">
        {[
          { value: 'week', label: '🗓️ Esta semana' },
          { value: 'month', label: '📅 Este mes' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Resumen */}
      {loadingSummary ? (
        <LoadingSpinner />
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              icon="⚖️"
              label="Kilos vendidos"
              value={`${formatNum(summary.total_kilos)} kg`}
            />
            <StatCard
              icon="📦"
              label="Pedidos"
              value={summary.total_pedidos}
            />
          </div>

          {/* Top negocios */}
          {summary.top_negocios.length > 0 && (
            <div className="card mb-4">
              <p className="section-title">🏆 Top negocios</p>
              <div className="space-y-2">
                {summary.top_negocios.map((n, i) => (
                  <div key={n.id} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{n.nombre}</p>
                      <p className="text-xs text-gray-500">{n.pedidos} pedido{n.pedidos !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{formatNum(n.kilos)} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">Sin datos para este período</div>
      )}

      {/* Comparación de rangos */}
      <div className="card">
        <p className="section-title">📊 Comparar períodos</p>
        <form onSubmit={handleCompare} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Período A</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Desde</label>
                <input
                  type="date"
                  className="input-field py-2 text-sm"
                  max={today}
                  value={compare.desde1}
                  onChange={(e) => setCompare({ ...compare, desde1: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">Hasta</label>
                <input
                  type="date"
                  className="input-field py-2 text-sm"
                  max={today}
                  value={compare.hasta1}
                  onChange={(e) => setCompare({ ...compare, hasta1: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Período B</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Desde</label>
                <input
                  type="date"
                  className="input-field py-2 text-sm"
                  max={today}
                  value={compare.desde2}
                  onChange={(e) => setCompare({ ...compare, desde2: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">Hasta</label>
                <input
                  type="date"
                  className="input-field py-2 text-sm"
                  max={today}
                  value={compare.hasta2}
                  onChange={(e) => setCompare({ ...compare, hasta2: e.target.value })}
                />
              </div>
            </div>
          </div>

          {compareError && (
            <p className="text-red-600 text-sm">{compareError}</p>
          )}

          <button type="submit" className="btn-primary" disabled={loadingCompare}>
            {loadingCompare ? 'Comparando...' : 'Comparar'}
          </button>
        </form>

        {/* Resultado comparación */}
        {compareResult && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Período A</p>
                <p className="text-xl font-bold text-blue-700">{formatNum(compareResult.rango_a.kilos)} kg</p>
                <p className="text-xs text-gray-500">{compareResult.rango_a.pedidos} pedidos</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Período B</p>
                <p className="text-xl font-bold text-purple-700">{formatNum(compareResult.rango_b.kilos)} kg</p>
                <p className="text-xs text-gray-500">{compareResult.rango_b.pedidos} pedidos</p>
              </div>
            </div>

            <div className={`rounded-xl p-3 text-center ${
              compareResult.variacion_porcentaje >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className="text-xs text-gray-500 mb-1">Variación B vs A</p>
              <p className={`text-2xl font-bold ${
                compareResult.variacion_porcentaje >= 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {compareResult.variacion_porcentaje >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(compareResult.variacion_porcentaje)}%
              </p>
            </div>

            {compareResult.estimacion_produccion && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">💡 Estimación de producción (Período A +10%)</p>
                <p className="text-xl font-bold text-amber-700">
                  {formatNum(compareResult.estimacion_produccion)} kg
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
