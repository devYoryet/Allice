import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { businessAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeNumberedIcon = (num, color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;
      background:${color};
      border:2.5px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;color:white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });

// Algoritmo nearest-neighbor para ordenar paradas
function ordenarPorProximidad(paradas, inicio = null) {
  if (paradas.length <= 1) return paradas;
  const pendientes = [...paradas];
  const ordenadas = [];
  let actual = inicio || { lat: pendientes[0].lat, lng: pendientes[0].lng };

  while (pendientes.length > 0) {
    let minDist = Infinity;
    let idxMasCercano = -1;
    pendientes.forEach((p, idx) => {
      const dist = Math.hypot(p.lat - actual.lat, p.lng - actual.lng);
      if (dist < minDist) { minDist = dist; idxMasCercano = idx; }
    });
    const siguiente = pendientes.splice(idxMasCercano, 1)[0];
    ordenadas.push(siguiente);
    actual = siguiente;
  }
  return ordenadas;
}

function minsToHHMM(totalMins) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const ESTADO_LABEL = {
  no_visitado: { text: 'Sin visitar', color: 'bg-red-100 text-red-700' },
  visitado_sin_venta: { text: 'Sin venta', color: 'bg-yellow-100 text-yellow-700' },
  cliente_activo: { text: 'Activo', color: 'bg-green-100 text-green-700' },
};

export default function RoutePage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // 'pendientes' | 'todos'

  // Configuración
  const [horaInicio, setHoraInicio] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  });
  const [minVisita, setMinVisita] = useState(20);
  const [minTraslado, setMinTraslado] = useState(15);

  // Selección y ruta
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [ruta, setRuta] = useState(null); // array ordenado con tiempos

  useEffect(() => {
    businessAPI.getAll()
      .then(({ data }) => setBusinesses(data))
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, []);

  const negociosMostrados = businesses.filter((b) =>
    filtro === 'pendientes'
      ? b.estado_visita === 'no_visitado'
      : true
  );

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setRuta(null); // reset ruta al cambiar selección
  };

  const generarRuta = () => {
    const paradasBase = businesses.filter((b) => seleccionados.has(b.id) && b.lat && b.lng);
    const sinCoordenadas = businesses.filter((b) => seleccionados.has(b.id) && (!b.lat || !b.lng));

    const ordenadas = ordenarPorProximidad(paradasBase);

    const [h, m] = horaInicio.split(':').map(Number);
    let minActual = h * 60 + m;

    const planificada = ordenadas.map((b, i) => {
      const llegada = minActual;
      const salida = llegada + Number(minVisita);
      minActual = salida + (i < ordenadas.length - 1 ? Number(minTraslado) : 0);
      return { ...b, llegada: minsToHHMM(llegada), salida: minsToHHMM(salida) };
    });

    setRuta({ paradas: planificada, sinCoordenadas, totalMin: minActual - (h * 60 + m) });
  };

  const recalcular = () => generarRuta();

  const polylinePoints = ruta?.paradas.map((p) => [p.lat, p.lng]) || [];
  const mapCenter = ruta?.paradas[0]
    ? [ruta.paradas[0].lat, ruta.paradas[0].lng]
    : [-33.4569, -70.6483];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container pb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Planificador de ruta</h2>
      <p className="text-sm text-gray-500 mb-4">Selecciona los negocios a visitar hoy</p>

      {/* Config tiempos */}
      <div className="card bg-blue-50 border-blue-100 mb-4">
        <p className="text-sm font-semibold text-blue-800 mb-3">Configuración de tiempos</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label text-xs">Hora inicio</label>
            <input
              type="time"
              className="input-field text-sm py-1.5"
              value={horaInicio}
              onChange={(e) => { setHoraInicio(e.target.value); setRuta(null); }}
            />
          </div>
          <div>
            <label className="label text-xs">Min. por visita</label>
            <input
              type="number"
              min="5" max="120"
              className="input-field text-sm py-1.5"
              value={minVisita}
              onChange={(e) => { setMinVisita(e.target.value); setRuta(null); }}
            />
          </div>
          <div>
            <label className="label text-xs">Min. traslado</label>
            <input
              type="number"
              min="1" max="120"
              className="input-field text-sm py-1.5"
              value={minTraslado}
              onChange={(e) => { setMinTraslado(e.target.value); setRuta(null); }}
            />
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 mb-3">
        {[
          { value: 'pendientes', label: `Sin visitar (${businesses.filter(b => b.estado_visita === 'no_visitado').length})` },
          { value: 'todos',      label: `Todos (${businesses.length})` },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filtro === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Seleccionar todos / ninguno */}
      {negociosMostrados.length > 0 && (
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-500">
            {seleccionados.size} de {negociosMostrados.length} seleccionado{seleccionados.size !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const todos = new Set(negociosMostrados.filter(b => b.lat && b.lng).map(b => b.id));
                setSeleccionados(todos);
                setRuta(null);
              }}
              className="text-xs text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-lg active:bg-blue-100"
            >
              Todos con GPS
            </button>
            {seleccionados.size > 0 && (
              <button
                onClick={() => { setSeleccionados(new Set()); setRuta(null); }}
                className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-lg active:bg-gray-200"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de negocios */}
      <div className="space-y-2 mb-4">
        {negociosMostrados.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {filtro === 'pendientes' ? 'Todos los negocios ya fueron visitados 🎉' : 'No hay negocios registrados'}
          </div>
        ) : (
          negociosMostrados.map((b) => {
            const sel = seleccionados.has(b.id);
            const est = ESTADO_LABEL[b.estado_visita] || ESTADO_LABEL.no_visitado;
            return (
              <div
                key={b.id}
                onClick={() => toggleSeleccion(b.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  sel
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white active:bg-gray-50'
                }`}
              >
                {/* Checkbox visual */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {sel && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{b.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{b.direccion}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${est.color}`}>
                    {est.text}
                  </span>
                  {!b.lat && <span className="text-xs text-orange-500">Sin GPS</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Botón generar */}
      {seleccionados.size > 0 && (
        <div className="sticky bottom-20 z-10">
          <button
            onClick={generarRuta}
            className="btn-primary shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
          >
            🧭 Generar ruta con {seleccionados.size} parada{seleccionados.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Resultado de la ruta */}
      {ruta && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Ruta del día</h3>
            <button
              onClick={recalcular}
              className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-lg"
            >
              ↺ Recalcular
            </button>
          </div>

          {/* ── Navegar con app externa ── */}
          {ruta.paradas.length > 0 && (() => {
            // Google Maps multi-parada con waypoints (formato oficial ?api=1)
            const origin      = ruta.paradas[0];
            const destination = ruta.paradas[ruta.paradas.length - 1];
            const waypoints   = ruta.paradas.slice(1, -1).map((p) => `${p.lat},${p.lng}`).join('|');
            const gmapsUrl    = 'https://www.google.com/maps/dir/?api=1'
              + `&origin=${origin.lat},${origin.lng}`
              + `&destination=${destination.lat},${destination.lng}`
              + (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '')
              + '&travelmode=driving';

            return (
              <div className="space-y-2">
                {/* Google Maps — ruta completa con todas las paradas */}
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-700 w-full"
                >
                  🗺️ Abrir ruta completa en Google Maps ({ruta.paradas.length} paradas)
                </a>

                {/* Waze: Waze no soporta multi-parada por URL — se abren de a una en orden */}
                <div className="card bg-sky-50 border-sky-200">
                  <p className="text-xs font-semibold text-sky-700 mb-2">
                    🚗 Waze — navega parada por parada en orden
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ruta.paradas.map((p, i) => (
                      <a
                        key={p.id}
                        href={`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-xl active:bg-sky-600"
                      >
                        <span className="w-4 h-4 rounded-full bg-white text-sky-600 flex items-center justify-center text-xs font-black leading-none">
                          {i + 1}
                        </span>
                        {p.nombre.split(' ')[0]}
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-sky-600 mt-2">
                    Toca cada número en orden. Waze no permite abrir toda la ruta de una vez por URL.
                  </p>
                </div>
              </div>
            );
          })()}
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{ruta.paradas.length}</p>
              <p className="text-xs text-gray-500">paradas</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{Math.floor(ruta.totalMin / 60)}h {ruta.totalMin % 60}m</p>
              <p className="text-xs text-gray-500">duración</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">
                {ruta.paradas.length > 0 ? ruta.paradas[ruta.paradas.length - 1].salida : '--'}
              </p>
              <p className="text-xs text-gray-500">fin estimado</p>
            </div>
          </div>

          {/* Advertencia sin coordenadas */}
          {ruta.sinCoordenadas.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-sm font-medium text-orange-700 mb-1">Negocios sin GPS (no incluidos en orden):</p>
              {ruta.sinCoordenadas.map((b) => (
                <p key={b.id} className="text-xs text-orange-600">• {b.nombre} —
                  <button
                    onClick={() => navigate(`/businesses/${b.id}/edit`)}
                    className="underline ml-1"
                  >agregar ubicación</button>
                </p>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            {ruta.paradas.map((p, i) => (
              <div key={p.id} className="flex gap-3">
                {/* Línea de tiempo */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
                  >
                    {i + 1}
                  </div>
                  {i < ruta.paradas.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[20px]" />
                  )}
                </div>
                {/* Info */}
                <div
                  className="flex-1 bg-white rounded-xl border border-gray-200 p-3 mb-1 cursor-pointer active:bg-gray-50"
                  onClick={() => navigate(`/businesses/${p.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{p.direccion}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-blue-600">{p.llegada}</p>
                      <p className="text-xs text-gray-400">sale {p.salida}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    {i < ruta.paradas.length - 1 ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span>🚗</span> {minTraslado} min al siguiente
                      </p>
                    ) : <span />}
                    <div className="flex gap-1.5">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium"
                      >
                        Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium"
                      >
                        Waze
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini mapa de ruta */}
          {ruta.paradas.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <p className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600 border-b border-gray-200">
                Vista de ruta
              </p>
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '220px', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Polyline positions={polylinePoints} color="#0369a1" weight={3} dashArray="6,6" />
                {ruta.paradas.map((p, i) => (
                  <Marker
                    key={p.id}
                    position={[p.lat, p.lng]}
                    icon={makeNumberedIcon(i + 1, i === 0 ? '#16a34a' : i === ruta.paradas.length - 1 ? '#dc2626' : '#0369a1')}
                  >
                    <Popup>
                      <strong>{p.nombre}</strong><br />
                      {p.llegada} – {p.salida}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
