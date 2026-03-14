import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { businessAPI, visitAPI, orderAPI } from '../api/client';
import { VisitaBadge, PedidoBadge, PagoBadge, FacturaBadge } from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function whatsappLink(phone, name) {
  const clean = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hola! Te contacto de parte de Tere con respecto a tu pedido en ${name}. 🧃`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

// Modal para registrar visita
function VisitModal({ businessId, businessName, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('visita_sin_venta');
  const [comentario, setComentario] = useState('');
  const [kilos, setKilos] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const withSale = tipo === 'visita_con_venta';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await visitAPI.create(businessId, { tipo, comentario });
      if (withSale && kilos) {
        await orderAPI.create(businessId, { kilos: parseFloat(kilos), comentario });
      }
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
          <h3 className="text-lg font-bold">Registrar visita</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500">{businessName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo de visita</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`py-3 rounded-xl font-medium text-sm border-2 transition-colors ${
                  tipo === 'visita_sin_venta'
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 text-gray-500'
                }`}
                onClick={() => setTipo('visita_sin_venta')}
              >
                😐 Sin venta
              </button>
              <button
                type="button"
                className={`py-3 rounded-xl font-medium text-sm border-2 transition-colors ${
                  tipo === 'visita_con_venta'
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500'
                }`}
                onClick={() => setTipo('visita_con_venta')}
              >
                🎉 Con venta
              </button>
            </div>
          </div>

          {withSale && (
            <div>
              <label className="label">Kilos vendidos</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="input-field"
                placeholder="Ej: 50"
                value={kilos}
                onChange={(e) => setKilos(e.target.value)}
                required={withSale}
              />
            </div>
          )}

          <div>
            <label className="label">Comentario (opcional)</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Notas de la visita..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar visita'}
          </button>
        </form>
      </div>
    </div>
  );
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
        <p className="text-sm text-gray-500">{order.kilos} kg — {formatDate(order.fecha)}</p>

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

export default function BusinessDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await businessAPI.getOne(id);
      setBusiness(data);
    } catch {
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (!business) return (
    <div className="page-container text-center py-16">
      <p className="text-gray-500">Negocio no encontrado</p>
    </div>
  );

  const googleMapsUrl = business.lat && business.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.direccion)}`;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 active:bg-gray-50"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-800 truncate">{business.nombre}</h2>
          <VisitaBadge estado={business.estado_visita} />
        </div>
        <button
          onClick={() => navigate(`/businesses/${id}/edit`)}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 active:bg-gray-50"
        >
          ✏️
        </button>
      </div>

      {/* Info rápida */}
      <div className="card mb-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-0.5">📍</span>
            <p className="text-gray-700">{business.direccion}</p>
          </div>
          {business.persona_cargo && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">👤</span>
              <p className="text-gray-700">{business.persona_cargo}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📞</span>
            <a href={`tel:${business.telefono}`} className="text-blue-600 font-medium">
              {business.telefono}
            </a>
          </div>
          {business.proxima_visita && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">📅</span>
              <p className="text-gray-700">Próxima visita sugerida: <strong>{formatDate(business.proxima_visita)}</strong></p>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setShowVisitModal(true)}
          className="btn-primary"
        >
          📝 Registrar visita
        </button>
        <a
          href={whatsappLink(business.telefono, business.nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-success text-center py-3 px-4 rounded-xl font-semibold text-base block"
        >
          💬 WhatsApp
        </a>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-center py-3 px-4 rounded-xl font-semibold text-base block"
        >
          🗺️ Ir con Maps
        </a>
        <button
          onClick={() => navigate(`/businesses/${id}/edit`)}
          className="btn-secondary"
        >
          ✏️ Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'info', label: 'Visitas' },
          { key: 'orders', label: 'Pedidos' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Visitas */}
      {activeTab === 'info' && (
        <div className="space-y-3">
          <p className="section-title">Historial de visitas</p>
          {business.visit_logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Sin visitas registradas</p>
            </div>
          ) : (
            business.visit_logs.map((v) => (
              <div key={v.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`badge ${v.tipo === 'visita_con_venta' ? 'badge-green' : 'badge-yellow'}`}>
                      {v.tipo === 'visita_con_venta' ? '🎉 Con venta' : '😐 Sin venta'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(v.fecha)}</p>
                  </div>
                  <p className="text-xs text-gray-400">{v.user?.name}</p>
                </div>
                {v.comentario && (
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 px-3 py-2 rounded-lg">
                    {v.comentario}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Pedidos */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          <p className="section-title">Historial de pedidos</p>
          {business.orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Sin pedidos registrados</p>
            </div>
          ) : (
            business.orders.map((o) => (
              <div key={o.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{o.kilos} kg</p>
                    <p className="text-sm text-gray-500">{formatDate(o.fecha)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(o)}
                    className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg active:bg-blue-100"
                  >
                    Actualizar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <PedidoBadge estado={o.estado_pedido} />
                  <PagoBadge estado={o.estado_pago} />
                  <FacturaBadge estado={o.estado_factura} />
                </div>
                {o.comentario && (
                  <p className="text-sm text-gray-500 mt-2">{o.comentario}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showVisitModal && (
        <VisitModal
          businessId={id}
          businessName={business.nombre}
          onClose={() => setShowVisitModal(false)}
          onSuccess={() => {
            setShowVisitModal(false);
            load();
          }}
        />
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
