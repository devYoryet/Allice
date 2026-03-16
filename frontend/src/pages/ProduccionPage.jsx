import React, { useState, useEffect, useCallback } from 'react';
import { produccionAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Constantes del cuaderno ────────────────────────────────────────────────
const PRECIO_KG    = 400;
const CUOTA        = 253_000;  // cuota mensual máquina
const COSTO_LUZ    = 70_000;   // luz mensual estimada
const COSTO_AGUA   = 10_000;   // agua mensual estimada
const COSTO_BOLSAS = 72_000;   // bolsas mensual (1 800 bolsas)

// Hitos de break-even (kg/mes necesarios para cubrir cada nivel de costos)
const METAS = [
  { label: 'Cubre cuota',  color: '#0ea5e9', kg: Math.ceil(CUOTA / PRECIO_KG) },                                           // 633
  { label: '+ luz & agua', color: '#f59e0b', kg: Math.ceil((CUOTA + COSTO_LUZ + COSTO_AGUA) / PRECIO_KG) },                // 833
  { label: 'Sin pérdida',  color: '#22c55e', kg: Math.ceil((CUOTA + COSTO_LUZ + COSTO_AGUA + COSTO_BOLSAS) / PRECIO_KG) }, // 1 013
];

const CAPACIDADES = [
  { horas: 15, kg: 1_800, etiqueta: 'Meta (15h/día)' },
  { horas: 24, kg: 2_800, etiqueta: 'Máximo (24h/día)' },
];

function fmt(n)    { return Math.round(n).toLocaleString('es-CL'); }
function fmtDate(d) {
  return new Date(d).toLocaleString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── Barra de progreso mensual hacia break-even ─────────────────────────────
function BarraBreakeven({ kgMes }) {
  const objetivo   = METAS[2].kg;
  const pct        = Math.min((kgMes / objetivo) * 100, 100);
  const nivelActual = [...METAS].reverse().find((m) => kgMes >= m.kg) || null;

  return (
    <div className="card mb-4">
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs font-semibold text-gray-600">Progreso mensual · ventas</p>
        <p className="text-xs font-bold text-gray-700">{fmt(kgMes)} kg vendidos</p>
      </div>

      {/* Barra con marcadores */}
      <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: nivelActual?.color || '#94a3b8' }}
        />
        {METAS.map((m) => (
          <div
            key={m.kg}
            className="absolute top-0 h-full w-0.5 bg-white/70"
            style={{ left: `${Math.min((m.kg / objetivo) * 100, 100)}%` }}
          />
        ))}
      </div>

      {/* Hitos */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {METAS.map((m) => {
          const ok = kgMes >= m.kg;
          return (
            <div key={m.kg}>
              <p className="text-xs font-black" style={{ color: m.color }}>{fmt(m.kg)} kg</p>
              <p className="text-xs text-gray-500">{m.label}</p>
              {ok ? (
                <p className="text-xs font-bold" style={{ color: m.color }}>✓ cubierto</p>
              ) : (
                <p className="text-xs text-gray-400">faltan {fmt(m.kg - kgMes)}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen financiero */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>Ingresos est.: <b className="text-gray-700">${fmt(kgMes * PRECIO_KG)}</b></span>
        <span>Costos fijos: <b className="text-gray-700">${fmt(CUOTA + COSTO_LUZ + COSTO_AGUA + COSTO_BOLSAS)}</b></span>
      </div>
    </div>
  );
}

// ── Modal: registrar carga a congeladora ───────────────────────────────────
function ModalCarga({ onClose, onSuccess }) {
  const [kilos,   setKilos]   = useState('');
  const [horas,   setHoras]   = useState(15);
  const [notas,   setNotas]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const kg = parseFloat(kilos);
    if (!kg || kg <= 0) { setError('Ingresa los kilos cargados'); return; }
    if (kg > 3_000)     { setError('Máximo 3,000 kg por carga'); return; }
    setLoading(true);
    try {
      await produccionAPI.create({ kilos: kg, horas_produccion: horas, notas: notas || null });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Registrar carga a congeladora</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-xs text-gray-500">
          Ingresa los kilos reales que entraron a la congeladora al terminar la producción.
        </p>

        <form onSubmit={submit} className="space-y-4">
          {/* Kilos */}
          <div>
            <label className="label">Kilos cargados *</label>
            <input
              type="number" min="1" max="3000" step="0.5"
              className="input-field text-2xl font-bold"
              placeholder="ej: 800"
              value={kilos}
              onChange={(e) => setKilos(e.target.value)}
              autoFocus
            />
            {/* Atajos rápidos */}
            <div className="flex gap-2 mt-2">
              {[500, 800, 1200, 1800, 2800].map((v) => (
                <button
                  key={v} type="button"
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    parseFloat(kilos) === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100'
                  }`}
                  onClick={() => setKilos(String(v))}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Horas de producción */}
          <div>
            <label className="label">Horas de producción de este ciclo</label>
            <div className="grid grid-cols-2 gap-2">
              {CAPACIDADES.map((c) => (
                <button
                  key={c.horas} type="button"
                  className={`py-3 px-4 rounded-xl text-left text-sm font-semibold border transition-colors ${
                    horas === c.horas
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100'
                  }`}
                  onClick={() => setHoras(c.horas)}
                >
                  <span className="text-lg font-black">{c.horas}h</span>
                  <br />
                  <span className="text-xs opacity-80">{fmt(c.kg)} kg {c.horas === 15 ? '(meta)' : '(máx)'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input-field resize-none" rows={2}
              placeholder="Ej: falla en máquina 2, turno reducido..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
          >
            {loading ? 'Registrando...' : '❄️ Registrar carga'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function ProduccionPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await produccionAPI.getAll();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const lotes = data?.lotes || [];
  const stock = data?.stock || { disponible: 0, kilos_cargados_total: 0, kilos_vendidos_total: 0 };
  const mes   = data?.mes   || { kilos_cargados: 0, kilos_vendidos: 0 };

  const stockColor =
    stock.disponible > 500 ? 'text-green-600' :
    stock.disponible > 100 ? 'text-yellow-500' :
    'text-red-500';

  return (
    <div className="page-container pb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Producción de hielo</h2>
      <p className="text-xs text-gray-500 mb-4">Control de cargas a congeladora · All ice</p>

      {/* ── Stock en congeladora ── */}
      <div
        className="card mb-4"
        style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderColor: '#bae6fd' }}
      >
        <p className="text-xs font-semibold text-blue-700 mb-1">Stock en congeladora</p>
        <div className="flex items-end gap-3 mb-2">
          <p className={`text-6xl font-black leading-none ${stockColor}`}>
            {fmt(stock.disponible)}
          </p>
          <div className="mb-1">
            <p className="text-xl font-bold text-gray-500">kg</p>
            <p className="text-sm font-semibold text-gray-600">
              ${fmt(stock.disponible * PRECIO_KG)}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-blue-700/70">
          <span>↑ {fmt(stock.kilos_cargados_total)} kg cargado total</span>
          <span>↓ {fmt(stock.kilos_vendidos_total)} kg vendido total</span>
        </div>
      </div>

      {/* ── Referencia capacidad máquina ── */}
      <div className="card bg-slate-50 border-slate-200 mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">Capacidad de producción diaria</p>
        <div className="grid grid-cols-2 gap-3">
          {CAPACIDADES.map((c) => (
            <div key={c.horas} className="bg-white rounded-xl p-3 border border-slate-200 text-center">
              <p className="text-2xl font-black text-slate-700">{(c.kg / 1_000).toFixed(1)}k</p>
              <p className="text-xs font-bold text-slate-600">kg / día</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.etiqueta}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Break-even mensual ── */}
      <BarraBreakeven kgMes={mes.kilos_vendidos} />

      {/* ── Botón registrar carga ── */}
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary mb-5"
        style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
      >
        ❄️ Registrar carga a congeladora
      </button>

      {/* ── Historial de cargas ── */}
      <p className="section-title mb-2">Historial de cargas</p>

      {lotes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">🧊</p>
          <p className="text-sm font-medium">Sin cargas registradas</p>
          <p className="text-xs mt-1 px-6">
            Cuando termines una producción, toca el botón y anota los kilos que entraron a la congeladora.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lotes.map((lote) => (
            <div key={lote.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-2xl font-black text-blue-700">
                      {fmt(lote.kilos)} kg
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                      {lote.horas_produccion}h
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{fmtDate(lote.fecha)}</p>
                  {lote.notas && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">{lote.notas}</p>
                  )}
                  <p className="text-xs text-gray-400">por {lote.user?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-700">
                    ${fmt(lote.kilos * PRECIO_KG)}
                  </p>
                  <p className="text-xs text-gray-400">valor carga</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal registrar carga */}
      {showModal && (
        <ModalCarga
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
