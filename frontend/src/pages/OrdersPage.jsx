import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/client';
import { PedidoBadge, PagoBadge, FacturaBadge } from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Modal para actualizar pedido
function OrderUpdateModal({ order, onClose, onSuccess }) {
  const [form, setForm] = useState({
    estado_pedido: order.estado_pedido,
    estado_pago: order.estado_pago,
    estado_factura: order.estado_factura,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await orderAPI.update(order.id, form);
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
          <h3 className="text-lg font-bold">Actualizar pedido</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500">
          {order.business?.nombre} — {order.kilos} kg
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Estado del pedido', field: 'estado_pedido', options: ['pendiente', 'entregado'] },
            { label: 'Estado del pago', field: 'estado_pago', options: ['pendiente', 'pagado'] },
            { label: 'Estado de factura', field: 'estado_factura', options: ['sin_factura', 'facturado'] },
          ].map(({ label, field, options }) => (
            <div key={field}>
              <label className="label">{label}</label>
              <select
                className="input-field"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              >
                {options.map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | delivered

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => {
    if (filter === 'pending') return o.estado_pedido === 'pendiente' || o.estado_pago === 'pendiente';
    if (filter === 'delivered') return o.estado_pedido === 'entregado';
    return true;
  });

  const totalKilos = filtered.reduce((sum, o) => sum + o.kilos, 0);

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Todos los pedidos</h2>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'pending', label: '⏳ Pendientes' },
          { value: 'delivered', label: '✅ Entregados' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
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
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-600">{filtered.length}</p>
              <p className="text-xs text-gray-500">Pedidos</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">
                {totalKilos.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg
              </p>
              <p className="text-xs text-gray-500">Total kilos</p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Sin pedidos para mostrar
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => (
                <div key={o.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/businesses/${o.business_id}`)}
                        className="font-semibold text-blue-700 truncate block active:text-blue-900"
                      >
                        {o.business?.nombre}
                      </button>
                      <p className="text-sm text-gray-500">{formatDate(o.fecha)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{o.kilos} kg</p>
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="text-xs text-blue-600 font-medium mt-1 active:text-blue-800"
                      >
                        Actualizar →
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <PedidoBadge estado={o.estado_pedido} />
                    <PagoBadge estado={o.estado_pago} />
                    <FacturaBadge estado={o.estado_factura} />
                  </div>

                  {o.comentario && (
                    <p className="text-sm text-gray-500 mt-2 bg-gray-50 px-3 py-2 rounded-lg">
                      {o.comentario}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedOrder && (
        <OrderUpdateModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => {
            setSelectedOrder(null);
            load();
          }}
        />
      )}
    </div>
  );
}
