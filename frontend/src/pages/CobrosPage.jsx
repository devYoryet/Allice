import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/client';
import { PedidoBadge, FacturaBadge } from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { withQueue } from '../utils/offlineQueue';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function CobrosPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente'); // pendiente | pagado | all
  const [marking, setMarking] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (order) => {
    setMarking(order.id);
    // Actualización optimista inmediata — visible aunque no haya red
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, estado_pago: 'pagado' } : o))
    );
    try {
      await withQueue(
        () => orderAPI.update(order.id, { estado_pago: 'pagado' }),
        {
          method: 'PUT',
          url: `/orders/${order.id}`,
          data: { estado_pago: 'pagado' },
          description: `Cobro de ${order.business?.nombre || 'pedido #' + order.id}`,
        }
      );
    } catch {
      // Error de servidor: revertir optimismo
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, estado_pago: 'pendiente' } : o))
      );
    } finally {
      setMarking(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filter === 'pendiente') return o.estado_pago === 'pendiente';
    if (filter === 'pagado') return o.estado_pago === 'pagado';
    return true;
  });

  const totalPendiente = orders
    .filter((o) => o.estado_pago === 'pendiente')
    .reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);

  const totalPagado = orders
    .filter((o) => o.estado_pago === 'pagado')
    .reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Cobros</h2>

      {/* Tarjetas resumen — también son filtros */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className={`rounded-xl p-3 text-center border cursor-pointer transition-all active:scale-95 ${
            filter === 'pendiente'
              ? 'bg-amber-500 border-amber-500 shadow-md'
              : 'bg-amber-50 border-amber-200'
          }`}
          onClick={() => setFilter('pendiente')}
        >
          <p className={`text-xl font-black ${filter === 'pendiente' ? 'text-white' : 'text-amber-700'}`}>
            ${totalPendiente.toLocaleString('es-CL')}
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${filter === 'pendiente' ? 'text-amber-100' : 'text-amber-600'}`}>
            ⏳ Por cobrar
          </p>
        </div>
        <div
          className={`rounded-xl p-3 text-center border cursor-pointer transition-all active:scale-95 ${
            filter === 'pagado'
              ? 'bg-green-500 border-green-500 shadow-md'
              : 'bg-green-50 border-green-200'
          }`}
          onClick={() => setFilter('pagado')}
        >
          <p className={`text-xl font-black ${filter === 'pagado' ? 'text-white' : 'text-green-700'}`}>
            ${totalPagado.toLocaleString('es-CL')}
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${filter === 'pagado' ? 'text-green-100' : 'text-green-600'}`}>
            ✅ Cobrado
          </p>
        </div>
      </div>

      {/* Filtros secundarios */}
      <div className="flex gap-2 mb-4">
        {[
          { value: 'pendiente', label: '⏳ Por cobrar' },
          { value: 'pagado',    label: '✅ Cobrados' },
          { value: 'all',       label: 'Todos' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-5xl mb-3">{filter === 'pendiente' ? '🎉' : '📭'}</p>
          <p className="text-sm font-medium">
            {filter === 'pendiente' ? '¡Todo cobrado!' : 'Sin pedidos aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div
              key={o.id}
              className={`card ${o.estado_pago === 'pendiente' ? 'border-l-4 border-l-amber-400' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/businesses/${o.business_id}`)}
                    className="font-semibold text-blue-700 truncate block active:text-blue-900"
                  >
                    {o.business?.nombre}
                  </button>
                  <p className="text-sm text-gray-500">
                    {formatDate(o.fecha)} · {o.kilos} kg
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <PedidoBadge estado={o.estado_pedido} />
                    <FacturaBadge estado={o.estado_factura} />
                  </div>
                  {o.comentario && (
                    <p className="text-xs text-gray-400 mt-1 italic">{o.comentario}</p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-black text-gray-800">
                    ${(o.monto_total || o.kilos * 400).toLocaleString('es-CL')}
                  </p>
                  {o.estado_pago === 'pendiente' ? (
                    <button
                      disabled={marking === o.id}
                      onClick={() => markPaid(o)}
                      className="mt-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-xl active:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      {marking === o.id ? '...' : '✓ Cobrado'}
                    </button>
                  ) : (
                    <span className="mt-1.5 block text-xs font-semibold text-green-600">✓ Pagado</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
