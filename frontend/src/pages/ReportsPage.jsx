import React, { useState, useEffect } from 'react';
import { reportAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Constantes del negocio (extraídas de la hoja de costos) ──────────────────
const META_MIN_KG   = 1800;   // kg/mes mínimo
const META_MAX_KG   = 2800;   // kg/mes máximo
const PRECIO_KG     = 400;    // $ por kg
const COSTOS_FIJOS  = {
  cuota:  253000,
  luz:     70000,
  agua:    10000,
  bolsas:  72000,
};
const TOTAL_COSTOS = Object.values(COSTOS_FIJOS).reduce((a, b) => a + b, 0); // 405 000
const BREAK_EVEN   = Math.ceil(TOTAL_COSTOS / PRECIO_KG);                    // 1 013 kg

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function MetaTeresa({ kilosVendidos }) {
  const kg = kilosVendidos || 0;

  // Porcentaje dentro de la barra 0 → META_MAX_KG
  const pctBE   = clamp((BREAK_EVEN  / META_MAX_KG) * 100, 0, 100);
  const pctMin  = clamp((META_MIN_KG / META_MAX_KG) * 100, 0, 100);
  const pctActual = clamp((kg / META_MAX_KG) * 100, 0, 100);

  let estado, estadoColor, estadoBg;
  if (kg < BREAK_EVEN) {
    estado = '🔴 Bajo punto de equilibrio'; estadoColor = 'text-red-600'; estadoBg = 'bg-red-50 border-red-200';
  } else if (kg < META_MIN_KG) {
    estado = '🟡 En camino a la meta mínima'; estadoColor = 'text-amber-600'; estadoBg = 'bg-amber-50 border-amber-200';
  } else if (kg < META_MAX_KG) {
    estado = '🟢 Meta mínima alcanzada'; estadoColor = 'text-green-600'; estadoBg = 'bg-green-50 border-green-200';
  } else {
    estado = '🏆 ¡Meta máxima superada!'; estadoColor = 'text-blue-700'; estadoBg = 'bg-blue-50 border-blue-200';
  }

  const ingresos = kg * PRECIO_KG;
  const ganancia = ingresos - TOTAL_COSTOS;
  const faltaMin = Math.max(0, META_MIN_KG - kg);
  const faltaMax = Math.max(0, META_MAX_KG - kg);

  // Día del mes para proyección
  const hoy    = new Date();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diaActual = hoy.getDate();
  const ritmoActual = diaActual > 0 ? kg / diaActual : 0;
  const proyectado  = Math.round(ritmoActual * diasMes);

  return (
    <div className={`card border ${estadoBg} mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-800">Meta mensual All ice</p>
        <span className={`text-xs font-semibold ${estadoColor}`}>{estado}</span>
      </div>

      {/* Barra de progreso */}
      <div className="relative mb-1">
        <div className="h-4 bg-gray-200 rounded-full overflow-visible relative">
          {/* Zona rellena */}
          <div
            className="h-4 rounded-full transition-all duration-500"
            style={{
              width: `${pctActual}%`,
              background: kg < BREAK_EVEN ? '#ef4444' : kg < META_MIN_KG ? '#f59e0b' : '#22c55e',
            }}
          />
          {/* Marca break-even */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${pctBE}%` }}
            title={`Break-even: ${BREAK_EVEN} kg`}
          />
          {/* Marca meta mínima */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
            style={{ left: `${pctMin}%` }}
            title={`Meta mín: ${META_MIN_KG} kg`}
          />
        </div>
        {/* Etiquetas bajo la barra */}
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>0</span>
          <span style={{ position: 'absolute', left: `${pctBE}%`, transform: 'translateX(-50%)' }} className="text-red-500 font-medium">
            {BREAK_EVEN}
          </span>
          <span style={{ position: 'absolute', left: `${pctMin}%`, transform: 'translateX(-50%)' }} className="text-amber-500 font-medium">
            {META_MIN_KG}
          </span>
          <span>{META_MAX_KG}</span>
        </div>
      </div>

      {/* Stat principal */}
      <div className="text-center mt-4 mb-3">
        <p className="text-4xl font-black text-gray-800">{kg.toLocaleString('es-CL')} <span className="text-xl font-semibold text-gray-500">kg</span></p>
        <p className="text-xs text-gray-400 mt-0.5">vendidos este mes · proyección: <span className="font-semibold text-gray-600">{proyectado.toLocaleString('es-CL')} kg</span></p>
      </div>

      {/* Grid de indicadores */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
          <p className="text-sm font-bold text-gray-700">${ingresos.toLocaleString('es-CL')}</p>
          <p className="text-xs text-gray-400">Ingresos</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center border ${ganancia >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm font-bold ${ganancia >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {ganancia >= 0 ? '+' : ''}{ganancia.toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-gray-400">Resultado (costos fijos)</p>
        </div>
        {faltaMin > 0 && (
          <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
            <p className="text-sm font-bold text-amber-700">{faltaMin.toLocaleString('es-CL')} kg</p>
            <p className="text-xs text-gray-400">Para meta mínima</p>
          </div>
        )}
        {faltaMax > 0 && (
          <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
            <p className="text-sm font-bold text-blue-700">{faltaMax.toLocaleString('es-CL')} kg</p>
            <p className="text-xs text-gray-400">Para meta máxima</p>
          </div>
        )}
      </div>

      {/* Costos fijos desglosados */}
      <details className="mt-3">
        <summary className="text-xs text-gray-400 cursor-pointer select-none">Ver costos fijos (${TOTAL_COSTOS.toLocaleString('es-CL')}/mes)</summary>
        <div className="mt-2 space-y-1">
          {Object.entries(COSTOS_FIJOS).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs text-gray-600">
              <span className="capitalize">{k}</span>
              <span>${v.toLocaleString('es-CL')}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

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
  const [monthKilos, setMonthKilos] = useState(null);

  // Siempre carga el total del mes para la meta
  useEffect(() => {
    reportAPI.getSummary('month')
      .then(({ data }) => setMonthKilos(data.total_kilos))
      .catch(() => setMonthKilos(0));
  }, []);

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

      {/* Meta Teresa — siempre muestra datos del mes actual */}
      <MetaTeresa kilosVendidos={monthKilos} />

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
