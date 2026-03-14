import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isPast(dateStr) {
  return new Date(dateStr) < new Date();
}

function whatsappLink(phone, name) {
  const clean = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hola! Soy Tere, hoy paso a visitarte con productos frescos para ${name}. ¿Cuándo te queda bien? 🧃`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

export default function UpcomingPage() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    businessAPI.getUpcoming(days)
      .then(({ data }) => setUpcoming(data))
      .catch(() => setUpcoming([]))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Próximas visitas</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="input-field w-auto py-2 text-sm"
        >
          <option value={3}>3 días</option>
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : upcoming.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🎉</span>
          <p className="text-gray-500 mt-3 font-medium">¡Todo al día!</p>
          <p className="text-gray-400 text-sm mt-1">
            No hay negocios pendientes en los próximos {days} días
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{upcoming.length} negocio{upcoming.length !== 1 ? 's' : ''} para visitar</p>
          {upcoming.map((b) => {
            const hoy = isToday(b.proxima_visita);
            const vencido = isPast(b.proxima_visita) && !hoy;
            return (
              <div
                key={b.id}
                className={`card ${hoy ? 'border-2 border-blue-400' : vencido ? 'border-2 border-red-300' : ''}`}
              >
                {(hoy || vencido) && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${
                    hoy ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {hoy ? '📅 HOY' : '⚠️ Vencida'}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{b.nombre}</h3>
                    <p className="text-sm text-gray-500 truncate">{b.direccion}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/businesses/${b.id}`)}
                    className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg active:bg-blue-100 whitespace-nowrap"
                  >
                    Ver detalle
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Última compra</p>
                    <p className="font-medium text-gray-700">{formatDate(b.ultima_compra)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kilos</p>
                    <p className="font-medium text-gray-700">{b.ultimos_kilos} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Visita sugerida</p>
                    <p className={`font-medium ${hoy ? 'text-blue-600' : vencido ? 'text-red-500' : 'text-gray-700'}`}>
                      {formatDate(b.proxima_visita)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Teléfono</p>
                    <a href={`tel:${b.telefono}`} className="font-medium text-blue-600 block truncate">
                      {b.telefono}
                    </a>
                  </div>
                </div>

                {/* Botón WhatsApp */}
                <a
                  href={whatsappLink(b.telefono, b.nombre)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 bg-green-50 text-green-700 font-medium text-sm py-2.5 rounded-xl active:bg-green-100"
                >
                  💬 Contactar por WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
