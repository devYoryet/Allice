import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { businessAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color, ring) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;
      background:${color};
      border:3px solid ${ring};
      border-radius:50% 50% 50% 2px;
      transform:rotate(-45deg);
      box-shadow:0 3px 10px rgba(0,0,0,0.25);
    "></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });

const ICONS = {
  no_visitado:       makeIcon('#ef4444', '#fff'),
  visitado_sin_venta: makeIcon('#f59e0b', '#fff'),
  cliente_activo:    makeIcon('#22c55e', '#fff'),
};

const FILTROS = [
  { key: 'todos',             label: 'Todos' },
  { key: 'no_visitado',       label: 'Sin visitar' },
  { key: 'visitado_sin_venta',label: 'Sin venta' },
  { key: 'cliente_activo',    label: 'Activos' },
];

function LocateControl() {
  const map = useMap();
  return (
    <button
      onClick={() => {
        map.locate({ setView: true, maxZoom: 16 });
        map.once('locationerror', () => alert('No se pudo obtener tu ubicación'));
      }}
      title="Mi ubicación"
      style={{
        position: 'absolute', bottom: 90, right: 12, zIndex: 1000,
        width: 44, height: 44, borderRadius: 12,
        background: 'white', border: 'none',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        fontSize: 20, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      📍
    </button>
  );
}

export default function MapPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const defaultCenter = [-33.4569, -70.6483];

  useEffect(() => {
    businessAPI.getAll()
      .then(({ data }) => setBusinesses(data))
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, []);

  const conUbicacion = businesses.filter((b) => b.lat && b.lng);
  const mostrados = filtro === 'todos'
    ? conUbicacion
    : conUbicacion.filter((b) => b.estado_visita === filtro);

  const counts = {
    no_visitado: conUbicacion.filter(b => b.estado_visita === 'no_visitado').length,
    visitado_sin_venta: conUbicacion.filter(b => b.estado_visita === 'visitado_sin_venta').length,
    cliente_activo: conUbicacion.filter(b => b.estado_visita === 'cliente_activo').length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 112px)' }}>

      {/* Panel superior */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-2 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-800">Mapa de negocios</h2>
          <span className="text-xs text-gray-500">{conUbicacion.length} con GPS</span>
        </div>

        {/* Leyenda / filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map((f) => {
            const count = f.key === 'todos' ? conUbicacion.length : counts[f.key] || 0;
            const dotColor = { no_visitado: 'bg-red-500', visitado_sin_venta: 'bg-amber-400', cliente_activo: 'bg-green-500' }[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filtro === f.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {dotColor && filtro !== f.key && (
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                )}
                {f.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {conUbicacion.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center px-6">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-gray-500 text-sm">
                Ningún negocio tiene ubicación GPS registrada.
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 text-blue-600 text-sm font-medium underline"
              >
                Ir a negocios
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {mostrados.map((b) => (
              <Marker
                key={b.id}
                position={[b.lat, b.lng]}
                icon={ICONS[b.estado_visita] || ICONS.no_visitado}
              >
                <Popup minWidth={200}>
                  <div style={{ fontFamily: 'system-ui, sans-serif' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 2 }}>{b.nombre}</p>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>📍 {b.direccion}</p>
                    {b.telefono && (
                      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>📞 {b.telefono}</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        onClick={() => navigate(`/businesses/${b.id}`)}
                        style={{
                          background: '#0369a1', color: 'white', border: 'none',
                          borderRadius: 8, padding: '7px 12px', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', width: '100%',
                        }}
                      >
                        Ver detalle
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#f1f5f9', color: '#334155', borderRadius: 8,
                          padding: '7px 12px', fontSize: 12, fontWeight: 600,
                          textDecoration: 'none', display: 'block', textAlign: 'center',
                        }}
                      >
                        🗺️ Cómo llegar
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <LocateControl />
          </MapContainer>
        )}
      </div>
    </div>
  );
}
