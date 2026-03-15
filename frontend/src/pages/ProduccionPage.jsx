import React, { useState, useEffect, useCallback } from 'react';
import { produccionAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

const PRECIO_KG = 400;

const ESTADO_CONFIG = {
  produciendo: { label: 'Produciendo',    color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',   next: 'congelando',  nextLabel: 'Pasar a congeladora' },
  congelando:  { label: 'En congeladora', color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500', next: 'disponible', nextLabel: 'Marcar como disponible' },
  disponible:  { label: 'Disponible',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  next: 'agotado',    nextLabel: 'Marcar como agotado' },
  agotado:     { label: 'Agotado',        color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400',   next: null,         nextLabel: null },
};

function formatTime(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function timeRemaining(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return 'Listo';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// Modal para crear nuevo lote
function NuevoLoteModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    kg_programados: '',
    bolsas: '',
    horas_congelado: '12',
    notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.kg_programados || parseFloat(form.kg_programados) <= 0) {
      setError('Ingresa los kg a producir');
      return;
    }
    setLoading(true);
    try {
      await produccionAPI.create(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear lote');
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
          <h3 className="text-lg font-bold">Nuevo lote de producción</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kg a producir *</label>
              <input type="number" min="1" step="0.5" className="input-field"
                placeholder="500" value={form.kg_programados}
                onChange={(e) => setForm({ ...form, kg_programados: e.target.value })} required />
            </div>
            <div>
              <label className="label">Bolsas</label>
              <input type="number" min="1" className="input-field"
                placeholder="500" value={form.bolsas}
                onChange={(e) => setForm({ ...form, bolsas: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Horas en congeladora</label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="48" className="flex-1"
                value={form.horas_congelado}
                onChange={(e) => setForm({ ...form, horas_congelado: e.target.value })} />
              <span className="text-sm font-bold text-blue-600 w-12 text-center">
                {form.horas_congelado}h
              </span>
            </div>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input-field resize-none" rows={2}
              placeholder="Observaciones del lote..."
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}>
            {loading ? 'Creando...' : '🏭 Iniciar producción'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Modal para actualizar kg reales al pasar a "congelando"
function AvanzarModal({ lote, onClose, onSuccess }) {
  const cfg = ESTADO_CONFIG[lote.estado];
  const [kgReales, setKgReales] = useState(lote.kg_producidos ?? lote.kg_programados);
  const [horas, setHoras] = useState(lote.horas_congelado);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await produccionAPI.update(lote.id, {
        estado: cfg.next,
        kg_producidos: kgReales,
        horas_congelado: horas,
      });
      onSuccess();
    } catch {
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
          <h3 className="text-lg font-bold">{cfg.nextLabel}</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>
        <p className="text-sm text-gray-500">Lote iniciado: {formatTime(lote.fecha_inicio)}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lote.estado === 'produciendo' && (
            <>
              <div>
                <label className="label">Kg reales producidos</label>
                <input type="number" min="0" step="0.5" className="input-field"
                  value={kgReales}
                  onChange={(e) => setKgReales(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Programados: {lote.kg_programados} kg</p>
              </div>
              <div>
                <label className="label">Horas en congeladora</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="48" className="flex-1" value={horas}
                    onChange={(e) => setHoras(e.target.value)} />
                  <span className="text-sm font-bold text-blue-600 w-12 text-center">{horas}h</span>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ background: cfg.next === 'disponible' ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#7c3aed,#8b5cf6)' }}>
            {loading ? 'Guardando...' : cfg.nextLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProduccionPage() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showNuevo, setShowNuevo] = useState(false);
  const [avanzando, setAvanzando] = useState(null); // lote seleccionado para avanzar estado
  const [filtro, setFiltro]       = useState('activos'); // activos | todos

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
  const stock = data?.stock || { produciendo: 0, congelando: 0, disponible: 0 };

  const lotesMostrados = filtro === 'activos'
    ? lotes.filter(l => l.estado !== 'agotado')
    : lotes;

  const valorDisponible = (stock.disponible * PRECIO_KG).toLocaleString('es-CL');

  return (
    <div className="page-container pb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Producción</h2>
      <p className="text-sm text-gray-500 mb-4">Control de lotes de hielo All ice</p>

      {/* Stock en tiempo real */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Produciendo', value: stock.produciendo, unit: 'kg', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
          { label: 'Congelando',  value: stock.congelando,  unit: 'kg', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700' },
          { label: 'Disponible',  value: stock.disponible,  unit: 'kg', color: 'bg-green-50 border-green-200',  textColor: 'text-green-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className={`text-2xl font-black ${s.textColor}`}>{s.value.toLocaleString('es-CL')}</p>
            <p className={`text-xs font-medium ${s.textColor} opacity-80`}>{s.unit}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Valor disponible en $ */}
      {stock.disponible > 0 && (
        <div className="card bg-green-50 border-green-200 mb-4 flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-lg font-black text-green-700">${valorDisponible}</p>
            <p className="text-xs text-green-600">Valor disponible para venta ({stock.disponible} kg × $400)</p>
          </div>
        </div>
      )}

      {/* Botón nuevo lote */}
      <button
        onClick={() => setShowNuevo(true)}
        className="btn-primary mb-4"
        style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
      >
        + Iniciar nuevo lote
      </button>

      {/* Filtro */}
      <div className="flex gap-2 mb-3">
        {[
          { value: 'activos', label: 'Activos' },
          { value: 'todos',   label: `Todos (${lotes.length})` },
        ].map((f) => (
          <button key={f.value} onClick={() => setFiltro(f.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filtro === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de lotes */}
      {lotesMostrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🏭</p>
          <p className="text-sm">No hay lotes activos</p>
          <p className="text-xs mt-1">Inicia un nuevo lote para comenzar el seguimiento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lotesMostrados.map((lote) => {
            const cfg = ESTADO_CONFIG[lote.estado] || ESTADO_CONFIG.agotado;
            const kg = lote.kg_producidos ?? lote.kg_programados;
            const restante = lote.estado === 'congelando' ? timeRemaining(lote.fecha_disponible) : null;

            return (
              <div key={lote.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {restante && restante !== 'Listo' && (
                        <span className="text-xs text-purple-600 font-medium">⏱ {restante}</span>
                      )}
                      {restante === 'Listo' && (
                        <span className="text-xs text-green-600 font-semibold">✅ Listo</span>
                      )}
                    </div>

                    <p className="text-xl font-black text-gray-800">{kg.toLocaleString('es-CL')} kg</p>
                    <p className="text-xs text-gray-500">
                      Iniciado: {formatTime(lote.fecha_inicio)}
                      {lote.bolsas ? ` · ${lote.bolsas} bolsas` : ''}
                    </p>
                    {lote.fecha_disponible && lote.estado === 'congelando' && (
                      <p className="text-xs text-purple-600 mt-0.5">
                        Disponible: {formatTime(lote.fecha_disponible)}
                      </p>
                    )}
                    {lote.notas && (
                      <p className="text-xs text-gray-400 mt-1 italic">{lote.notas}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">por {lote.user?.name}</p>
                  </div>

                  {/* Valor del lote */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-700">
                      ${(kg * PRECIO_KG).toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs text-gray-400">valor lote</p>
                  </div>
                </div>

                {/* Botón avanzar estado */}
                {cfg.next && (
                  <button
                    onClick={() => setAvanzando(lote)}
                    className={`mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      cfg.next === 'congelando'  ? 'bg-purple-600 text-white active:bg-purple-700' :
                      cfg.next === 'disponible'  ? 'bg-green-600 text-white active:bg-green-700' :
                      'bg-gray-200 text-gray-700 active:bg-gray-300'
                    }`}
                  >
                    {cfg.nextLabel} →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {showNuevo && (
        <NuevoLoteModal onClose={() => setShowNuevo(false)} onSuccess={() => { setShowNuevo(false); load(); }} />
      )}
      {avanzando && (
        <AvanzarModal lote={avanzando} onClose={() => setAvanzando(null)} onSuccess={() => { setAvanzando(null); load(); }} />
      )}
    </div>
  );
}
