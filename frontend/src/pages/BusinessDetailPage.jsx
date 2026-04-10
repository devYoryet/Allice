import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { businessAPI, visitAPI, orderAPI, whatsappAPI } from '../api/client';
import { VisitaBadge, PedidoBadge, PagoBadge, FacturaBadge } from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { withQueue } from '../utils/offlineQueue';
import { useAuth } from '../context/AuthContext';

const SUPERMASTER_EMAIL = 'yoryet.danoun@gmail.com';

// ── Modal de eliminación (solo supermaster) ───────────────────────────────
function ModalEliminar({ business, onClose, onSuccess }) {
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalKg   = business.orders?.reduce((s, o) => s + o.kilos, 0) || 0;
  const nPedidos  = business.orders?.length || 0;
  const confirmed = confirmInput.trim() === business.nombre.trim();

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    try {
      const { data } = await businessAPI.remove(business.id);
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">🗑️</div>
          <div>
            <h3 className="font-bold text-gray-900">Eliminar negocio</h3>
            <p className="text-sm text-red-600 font-semibold">{business.nombre}</p>
          </div>
        </div>

        {/* Advertencia kg */}
        {totalKg > 0 && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-1">
            <p className="text-sm font-bold text-orange-800">
              ⚠️ {nPedidos} pedido{nPedidos !== 1 ? 's' : ''} · {totalKg.toLocaleString('es-CL')} kg registrados
            </p>
            <p className="text-xs text-orange-700">
              Estos kilos quedarán <strong>sin asignar</strong>. Podrás reasignarlos a otro negocio desde la lista de negocios.
            </p>
          </div>
        )}

        {/* Info de registro */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-600">
            Se registrará la <strong>fecha y hora exacta</strong> de eliminación junto con tu usuario. Esta acción no se puede deshacer automáticamente.
          </p>
        </div>

        {/* Confirmación */}
        <div>
          <label className="label" style={{ color: '#dc2626' }}>
            Escribe <strong>{business.nombre}</strong> para confirmar
          </label>
          <input
            type="text"
            className="input-field"
            style={{ borderColor: confirmed ? '#16a34a' : '#fca5a5' }}
            placeholder={business.nombre}
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || loading}
            className={`py-3 rounded-xl font-semibold text-sm transition-colors ${
              confirmed && !loading
                ? 'bg-red-600 text-white active:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function buildWhatsappLink(phone, lastOrderDate) {
  const clean = phone.replace(/\D/g, '');
  const fechaStr = lastOrderDate
    ? new Date(lastOrderDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : null;
  const msg = fechaStr
    ? `Hola! Te contacto de AllIce, hielo 🧊 Queríamos saber si necesitas que te llevemos más hielo. La última entrega fue el ${fechaStr}. Si gustas podemos pasar mañana durante el día a reponer lo que nos indiques 😊`
    : `Hola! Te contacto de AllIce, hielo 🧊 Queríamos saber si necesitas que te llevemos hielo. Si gustas podemos pasar mañana durante el día a dejarte lo que nos indiques 😊`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

function buildWazeLink(lat, lng, address) {
  if (lat && lng) return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

// Modal para registrar contacto WhatsApp
function WaContactModal({ businessId, businessName, onClose, onSuccess }) {
  const [generoVenta, setGeneroVenta] = useState(false);
  const [kilos,       setKilos]       = useState('');
  const [precioKg,    setPrecioKg]    = useState('400');
  const [notas,       setNotas]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const montoTotal = generoVenta && kilos
    ? Math.round(parseFloat(kilos) * parseFloat(precioKg || 400))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await whatsappAPI.create(businessId, {
        genero_venta: generoVenta,
        pedido_kilos: generoVenta && kilos ? parseFloat(kilos) : null,
        precio_kg:    generoVenta && kilos ? parseFloat(precioKg || 400) : null,
        notas:        notas || null,
      });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-green-500 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base">💬 ¿El cliente confirmó?</h3>
            <p className="text-green-100 text-xs mt-0.5">{businessName}</p>
          </div>
          <button onClick={onClose} className="text-white/70 text-2xl leading-none hover:text-white">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ¿Generó venta? — opción principal */}
          <div
            onClick={() => setGeneroVenta(!generoVenta)}
            className={`rounded-xl p-4 border-2 cursor-pointer transition-all ${
              generoVenta
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold text-sm ${generoVenta ? 'text-green-700' : 'text-gray-700'}`}>
                  {generoVenta ? '🎉 Sí, acordó compra' : '📞 Solo contacto, sin venta'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {generoVenta
                    ? 'Se creará un pedido pendiente para Teresa'
                    : 'Se registra el contacto sin pedido'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                generoVenta ? 'border-green-500 bg-green-500' : 'border-gray-300'
              }`}>
                {generoVenta && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
          </div>

          {/* Kilos acordados — solo si generó venta */}
          {generoVenta && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kilos acordados</label>
                  <input
                    type="number" min="0.1" step="0.1"
                    className="input-field"
                    placeholder="50"
                    value={kilos}
                    onChange={(e) => setKilos(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Precio/kg ($)</label>
                  <input
                    type="number" min="1"
                    className="input-field"
                    value={precioKg}
                    onChange={(e) => setPrecioKg(e.target.value)}
                  />
                </div>
              </div>
              {kilos && (
                <div className="bg-green-50 rounded-xl px-4 py-2.5 flex justify-between items-center">
                  <span className="text-sm text-green-700">Total estimado</span>
                  <span className="font-black text-green-700">${montoTotal.toLocaleString('es-CL')}</span>
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="label">Notas (opcional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: quiere entrega en la mañana"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (generoVenta && !kilos)}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm active:bg-green-600 disabled:opacity-40"
            >
              {loading ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para registrar visita
function VisitModal({ businessId, businessName, onClose, onSuccess }) {
  const [tipo, setTipo]         = useState('visita_sin_venta');
  const [comentario, setComentario] = useState('');
  const [kilos, setKilos]       = useState('');
  const [precioKg, setPrecioKg] = useState('400');
  const [conIva, setConIva]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const withSale = tipo === 'visita_con_venta';

  const montoNeto  = withSale && kilos ? Math.round(parseFloat(kilos) * parseFloat(precioKg || 400)) : 0;
  const montoTotal = conIva ? Math.round(montoNeto * 1.19) : montoNeto;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const visitData = { tipo, comentario };
      const { queued: visitQueued } = await withQueue(
        () => visitAPI.create(businessId, visitData),
        { method: 'POST', url: `/businesses/${businessId}/visits`, data: visitData, description: `Visita a ${businessName}` }
      );

      if (withSale && kilos) {
        const orderData = {
          kilos: parseFloat(kilos),
          precio_kg: parseFloat(precioKg || 400),
          con_iva: conIva,
          comentario,
        };
        await withQueue(
          () => orderAPI.create(businessId, orderData),
          { method: 'POST', url: `/businesses/${businessId}/orders`, data: orderData, description: `Pedido en ${businessName}` }
        );
      }

      if (visitQueued) {
        setError('Sin conexión: visita guardada, se enviará al reconectarte.');
        setTimeout(onSuccess, 1500);
      } else {
        onSuccess();
      }
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
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kilos vendidos</label>
                  <input type="number" min="0" step="0.1" className="input-field"
                    placeholder="50" value={kilos}
                    onChange={(e) => setKilos(e.target.value)} required={withSale} />
                </div>
                <div>
                  <label className="label">Precio por kg ($)</label>
                  <input type="number" min="1" className="input-field"
                    value={precioKg}
                    onChange={(e) => setPrecioKg(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Con factura (IVA 19%)</p>
                  <p className="text-xs text-gray-400">Sin factura = precio directo</p>
                </div>
                <button type="button" onClick={() => setConIva(!conIva)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${conIva ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${conIva ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {kilos && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Monto neto:</span>
                    <span className="font-medium">${montoNeto.toLocaleString('es-CL')}</span>
                  </div>
                  {conIva && (
                    <div className="flex justify-between text-gray-600">
                      <span>IVA (19%):</span>
                      <span className="font-medium">${(montoTotal - montoNeto).toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-800 border-t border-blue-100 pt-1 mt-1">
                    <span>Total a cobrar:</span>
                    <span className="text-blue-700">${montoTotal.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              )}
            </>
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
      const { queued } = await withQueue(
        () => orderAPI.update(order.id, form),
        { method: 'PUT', url: `/orders/${order.id}`, data: form, description: `Actualizar pedido #${order.id}` }
      );
      if (queued) setTimeout(onSuccess, 800);
      else onSuccess();
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
  const location = useLocation();
  const { user } = useAuth();
  const isSupermaster = user?.email === SUPERMASTER_EMAIL;
  const canDelete     = isSupermaster || user?.role === 'admin';

  const openVisitOnLoad = new URLSearchParams(location.search).get('openVisit') === '1';

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVisitModal, setShowVisitModal] = useState(openVisitOnLoad);
  const [showWaModal,   setShowWaModal]    = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab]         = useState('info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteResult, setDeleteResult]   = useState(null);

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

  // Pantalla post-eliminación
  if (deleteResult) {
    const dt = new Date(deleteResult.deleted_at);
    return (
      <div className="page-container text-center py-16">
        <p className="text-5xl mb-4">🗑️</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Negocio eliminado</p>
        <p className="text-sm text-gray-500 mb-1">
          {dt.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} a las {dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {deleteResult.kilos_al_eliminar > 0 && (
          <p className="text-sm text-orange-600 font-medium mt-2 mb-4">
            {deleteResult.kilos_al_eliminar.toLocaleString('es-CL')} kg sin asignar · reasígnalos desde la lista de negocios
          </p>
        )}
        <button onClick={() => navigate('/businesses')} className="btn-primary mt-4">
          Ir a la lista de negocios
        </button>
      </div>
    );
  }

  const lastOrderDate = business.orders?.[0]?.fecha || null;
  const wazeUrl       = buildWazeLink(business.lat, business.lng, business.direccion);
  const waLink        = buildWhatsappLink(business.telefono, lastOrderDate);

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
        {canDelete && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-xl shadow-sm text-red-600 active:bg-red-100"
            title="Eliminar negocio"
          >
            🗑️
          </button>
        )}
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
        <button onClick={() => setShowVisitModal(true)} className="btn-primary">
          📝 Registrar visita
        </button>

        {/* WhatsApp: abre WA con mensaje + muestra modal de registro */}
        <button
          onClick={() => { window.open(waLink, '_blank'); setShowWaModal(true); }}
          className="btn-success text-center py-3 px-4 rounded-xl font-semibold text-base"
        >
          💬 WhatsApp
        </button>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-center py-3 px-4 rounded-xl font-semibold text-base block"
        >
          🚗 Ir con Waze
        </a>
        <button onClick={() => navigate(`/businesses/${id}/edit`)} className="btn-secondary">
          ✏️ Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'info',      label: 'Visitas' },
          { key: 'orders',    label: 'Pedidos' },
          { key: 'whatsapp',  label: '💬 WA' },
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

      {/* Tab: WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="section-title">Contactos por WhatsApp</p>
            <button
              onClick={() => setShowWaModal(true)}
              className="text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-xl active:bg-green-100"
            >
              + Registrar
            </button>
          </div>
          {(business.whatsapp_contacts || []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Sin contactos WA registrados</p>
            </div>
          ) : (
            (business.whatsapp_contacts || []).map((w) => (
              <div key={w.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${w.genero_venta ? 'badge-green' : 'badge-yellow'}`}>
                        {w.genero_venta ? '🎉 Con venta' : '📞 Sin venta'}
                      </span>
                      <p className="text-xs text-gray-400">{w.user?.name}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(w.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {w.numero_usado && (
                      <p className="text-xs text-gray-400 mt-0.5">WA: {w.numero_usado}</p>
                    )}
                    {w.genero_venta && w.pedido_kilos && (
                      <p className="text-sm font-semibold text-green-700 mt-1">
                        {w.pedido_kilos} kg — ${Math.round(w.pedido_kilos * (w.precio_kg || 400)).toLocaleString('es-CL')}
                      </p>
                    )}
                    {w.notas && (
                      <p className="text-xs text-gray-500 mt-1 italic">{w.notas}</p>
                    )}
                  </div>
                </div>
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

      {showWaModal && (
        <WaContactModal
          businessId={id}
          businessName={business.nombre}
          onClose={() => setShowWaModal(false)}
          onSuccess={() => { setShowWaModal(false); setActiveTab('whatsapp'); load(); }}
        />
      )}

      {showDeleteModal && canDelete && (
        <ModalEliminar
          business={business}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={(result) => {
            setShowDeleteModal(false);
            setDeleteResult(result);
          }}
        />
      )}
    </div>
  );
}
