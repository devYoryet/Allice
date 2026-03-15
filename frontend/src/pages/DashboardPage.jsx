import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { produccionAPI, orderAPI, businessAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stockDisponible: 0,
    ingresosHoy: 0,
    pedidosHoy: 0,
    porCobrar: 0,
    negociosSinVisitar: 0,
  });

  useEffect(() => {
    const hoy = new Date().toDateString();
    Promise.all([
      produccionAPI.getAll().catch(() => ({ data: null })),
      orderAPI.getAll().catch(() => ({ data: [] })),
      businessAPI.getAll().catch(() => ({ data: [] })),
    ]).then(([prod, orders, businesses]) => {
      const stock = prod.data?.stock || { disponible: 0 };

      const allOrders = Array.isArray(orders.data) ? orders.data : [];
      const todayOrders = allOrders.filter((o) => new Date(o.fecha).toDateString() === hoy);
      const ingresosHoy = todayOrders.reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);
      const porCobrar = allOrders
        .filter((o) => o.estado_pago === 'pendiente')
        .reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);

      const allBiz = Array.isArray(businesses.data) ? businesses.data : [];
      const sinVisitar = allBiz.filter((b) => {
        const lastVisit = b.visit_logs?.[0]?.fecha;
        if (!lastVisit) return true;
        return (new Date() - new Date(lastVisit)) / 86400000 >= 5;
      }).length;

      setData({
        stockDisponible: stock.disponible,
        ingresosHoy,
        pedidosHoy: todayOrders.length,
        porCobrar,
        negociosSinVisitar: sinVisitar,
      });
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      {/* Saludo */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">{greeting},</p>
        <h2 className="text-2xl font-black text-gray-800">{user?.name?.split(' ')[0]}</h2>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Stock disponible — ancho completo */}
        <div
          className="col-span-2 card cursor-pointer active:scale-95 transition-transform bg-green-50 border border-green-200"
          onClick={() => navigate('/produccion')}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧊</span>
            <div>
              <p className="text-xs text-green-600 font-medium">Stock disponible</p>
              <p className="text-3xl font-black text-green-700">
                {data.stockDisponible.toLocaleString('es-CL')} <span className="text-xl font-semibold">kg</span>
              </p>
              <p className="text-xs text-green-600">
                ${(data.stockDisponible * 400).toLocaleString('es-CL')} en stock · toca para ver fábrica
              </p>
            </div>
          </div>
        </div>

        {/* Ingresos hoy */}
        <div
          className="card cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate('/orders')}
        >
          <p className="text-xs text-gray-500 mb-1">Ingresos hoy</p>
          <p className="text-xl font-black text-blue-600">
            ${data.ingresosHoy.toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-gray-400">
            {data.pedidosHoy} pedido{data.pedidosHoy !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Por cobrar */}
        <div
          className={`card cursor-pointer active:scale-95 transition-transform ${
            data.porCobrar > 0 ? 'bg-amber-50 border border-amber-200' : ''
          }`}
          onClick={() => navigate('/cobros')}
        >
          <p className={`text-xs font-medium mb-1 ${data.porCobrar > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
            Por cobrar
          </p>
          <p className={`text-xl font-black ${data.porCobrar > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
            ${data.porCobrar.toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-gray-400">Toca para cobrar</p>
        </div>
      </div>

      {/* Alerta negocios sin visitar */}
      {data.negociosSinVisitar > 0 && (
        <div
          className="card cursor-pointer active:scale-95 transition-transform bg-red-50 border border-red-200 mb-3"
          onClick={() => navigate('/businesses')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-700">
                {data.negociosSinVisitar} negocio{data.negociosSinVisitar !== 1 ? 's' : ''} sin visitar
              </p>
              <p className="text-xs text-red-500">Hace 5 días o más sin visita — toca para ver</p>
            </div>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Accesos rápidos</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: '🏪', label: 'Negocios',  to: '/businesses' },
          { icon: '🧭', label: 'Ruta',      to: '/ruta' },
          { icon: '📅', label: 'Próximas',  to: '/upcoming' },
          { icon: '🗺️', label: 'Mapa',      to: '/map' },
          { icon: '📦', label: 'Pedidos',   to: '/orders' },
          { icon: '💰', label: 'Cobros',    to: '/cobros' },
        ].map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="card py-3 flex flex-col items-center gap-1 text-center active:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="text-xs text-gray-600 font-medium">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
