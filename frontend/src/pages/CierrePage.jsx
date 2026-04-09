import React, { useState, useEffect, useCallback } from 'react';
import { cierreAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatMoney(n) {
  return `$${Math.round(n || 0).toLocaleString('es-CL')}`;
}

// Modal de confirmación del cierre
function ConfirmModal({ resumen, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <h3 className="text-lg font-black text-gray-900 mb-1">Confirmar cierre de mes</h3>
        <p className="text-sm text-gray-500 mb-4">
          Esta acción marcará todos los cobros pendientes como pagados y comenzará un nuevo período desde cero.
        </p>

        <div className="bg-blue-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Período</span>
            <span className="font-bold text-gray-800">{resumen?.periodo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total kilos</span>
            <span className="font-bold text-gray-800">{(resumen?.total_kilos || 0).toFixed(1)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total ventas</span>
            <span className="font-bold text-gray-800">{formatMoney(resumen?.total_ventas)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Por cobrar</span>
            <span className="font-bold text-amber-600">{formatMoney(resumen?.total_pendiente)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pedidos</span>
            <span className="font-bold text-gray-800">{resumen?.ordenes_abiertas}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4 text-center">
          Los cobros pendientes pasarán a pagado automaticamente
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Cerrando...' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tarjeta de un cierre histórico
function CierreCard({ cierre, onPress }) {
  return (
    <div
      onClick={() => onPress(cierre)}
      className="card cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800">{cierre.periodo}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(cierre.fecha_cierre)}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-green-700">{formatMoney(cierre.total_ventas)}</p>
          <p className="text-xs text-gray-500">{(cierre.total_kilos || 0).toFixed(1)} kg · {cierre.ordenes_cerradas} pedidos</p>
        </div>
      </div>
    </div>
  );
}

// Modal de detalle de un cierre histórico
function CierreDetailModal({ cierre, onClose }) {
  if (!cierre) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-900">{cierre.periodo}</h3>
            <p className="text-xs text-gray-400">{formatDate(cierre.fecha_cierre)} · por {cierre.usuario?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200"
          >
            ×
          </button>
        </div>

        {/* Resumen */}
        <div className="px-4 py-3 grid grid-cols-2 gap-2">
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-green-700">{formatMoney(cierre.total_ventas)}</p>
            <p className="text-xs text-green-600">Total ventas</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-blue-700">{(cierre.total_kilos || 0).toFixed(1)} kg</p>
            <p className="text-xs text-blue-600">Total kilos</p>
          </div>
        </div>

        {/* Detalle por negocio */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Desglose por local ({cierre.detalles?.length || 0})
          </p>
          <div className="space-y-2">
            {(cierre.detalles || []).map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{d.nombre_negocio}</p>
                  <p className="text-xs text-gray-400">{d.total_pedidos} pedido{d.total_pedidos !== 1 ? 's' : ''} · {(d.total_kilos || 0).toFixed(1)} kg</p>
                </div>
                <p className="font-bold text-gray-800 text-sm">{formatMoney(d.total_ventas)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CierrePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [resumen, setResumen]       = useState(null);
  const [cierres, setCierres]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting]   = useState(false);
  const [detalle, setDetalle]       = useState(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resData, cierresData] = await Promise.all([
        cierreAPI.getResumenActual(),
        cierreAPI.getAll(),
      ]);
      setResumen(resData.data);
      setCierres(Array.isArray(cierresData.data) ? cierresData.data : []);
    } catch {
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCierre = async () => {
    setExecuting(true);
    setError('');
    try {
      await cierreAPI.create();
      setShowConfirm(false);
      setSuccess(`¡Cierre de ${resumen?.periodo} realizado exitosamente!`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al ejecutar el cierre');
    } finally {
      setExecuting(false);
    }
  };

  const openDetalle = async (cierre) => {
    try {
      const { data } = await cierreAPI.getById(cierre.id);
      setDetalle(data);
    } catch {
      setDetalle(cierre);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <h2 className="text-xl font-black text-gray-800 mb-1">Cierre de mes</h2>
      <p className="text-xs text-gray-400 mb-4">Se realiza el día 9 de cada mes</p>

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200">
          <p className="text-sm font-semibold text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Resumen del período actual */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 font-medium">Período actual</p>
            <p className="text-base font-black text-gray-800">{resumen?.periodo || '—'}</p>
          </div>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {resumen?.ordenes_abiertas || 0} pedidos
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-gray-800">
              {(resumen?.total_kilos || 0).toFixed(1)} kg
            </p>
            <p className="text-xs text-gray-500">Total kilos</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-gray-800">
              {formatMoney(resumen?.total_ventas)}
            </p>
            <p className="text-xs text-gray-500">Total ventas</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-green-700">
              {formatMoney(resumen?.total_pagado)}
            </p>
            <p className="text-xs text-green-600">Cobrado</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-amber-600">
              {formatMoney(resumen?.total_pendiente)}
            </p>
            <p className="text-xs text-amber-500">Por cobrar</p>
          </div>
        </div>

        {/* Desglose por negocio en el período actual */}
        {resumen?.por_negocio?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Por local</p>
            <div className="space-y-1.5">
              {resumen.por_negocio.map((n) => (
                <div key={n.business_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{n.nombre}</p>
                    <p className="text-xs text-gray-400">{n.pedidos} pedido{n.pedidos !== 1 ? 's' : ''} · {(n.kilos || 0).toFixed(1)} kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{formatMoney(n.ventas)}</p>
                    {n.pendiente > 0 && (
                      <p className="text-xs text-amber-500">{formatMoney(n.pendiente)} pendiente</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resumen?.ordenes_abiertas === 0 && (
          <p className="text-center text-sm text-gray-400 py-2">Sin pedidos en el período actual</p>
        )}
      </div>

      {/* Botón ejecutar cierre (solo admin) */}
      {isAdmin && (
        <button
          onClick={() => { setError(''); setSuccess(''); setShowConfirm(true); }}
          disabled={!resumen?.ordenes_abiertas}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-base active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-6"
        >
          Ejecutar cierre de mes
        </button>
      )}

      {!isAdmin && (
        <div className="mb-6 p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
          <p className="text-xs text-gray-500">Solo el administrador puede ejecutar el cierre</p>
        </div>
      )}

      {/* Historial de cierres */}
      {cierres.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Historial de cierres
          </p>
          <div className="space-y-2">
            {cierres.map((c) => (
              <CierreCard key={c.id} cierre={c} onPress={openDetalle} />
            ))}
          </div>
        </div>
      )}

      {cierres.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <p className="text-4xl mb-2">📂</p>
          <p className="text-sm">Aún no hay cierres registrados</p>
        </div>
      )}

      {/* Modal confirmación */}
      {showConfirm && (
        <ConfirmModal
          resumen={resumen}
          onConfirm={handleCierre}
          onCancel={() => setShowConfirm(false)}
          loading={executing}
        />
      )}

      {/* Modal detalle cierre histórico */}
      {detalle && (
        <CierreDetailModal cierre={detalle} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}
