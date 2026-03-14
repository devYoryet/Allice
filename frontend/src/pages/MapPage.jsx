import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { businessAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// Fix para iconos de Leaflet con Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Iconos de colores según estado
const makeIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

const ICONS = {
  no_visitado: makeIcon('#ef4444'),
  visitado_sin_venta: makeIcon('#f59e0b'),
  cliente_activo: makeIcon('#22c55e'),
};

function LocateButton({ onLocate }) {
  const map = useMap();
  const locate = () => {
    map.locate({ setView: true, maxZoom: 16 });
    map.on('locationfound', (e) => {
      onLocate(e.latlng);
    });
    map.on('locationerror', () => {
      alert('No se pudo obtener tu ubicación');
    });
  };
  return (
    <button
      onClick={locate}
      className="absolute bottom-24 right-4 z-[1000] bg-white shadow-lg rounded-xl w-12 h-12 flex items-center justify-center text-xl active:bg-gray-50"
      style={{ position: 'absolute' }}
    >
      📍
    </button>
  );
}

export default function MapPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const defaultCenter = [-33.4569, -70.6483]; // Santiago por defecto

  useEffect(() => {
    businessAPI.getAll()
      .then(({ data }) => setBusinesses(data))
      .catch(() => setBusinesses([])  )
      .finally(() => setLoading(false));
  }, []);

  const withLocation = businesses.filter((b) => b.lat && b.lng);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-screen">
      {/* Encabezado */}
      <div className="page-container pt-0 pb-0">
        <div className="py-3">
          <h2 className="text-xl font-bold text-gray-800">Mapa de negocios</h2>
          <p className="text-sm text-gray-500">{withLocation.length} con ubicación registrada</p>
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 pb-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            Sin visitar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
            Sin venta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            Cliente activo
          </span>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative" style={{ minHeight: '60vh' }}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {withLocation.map((b) => (
            <Marker
              key={b.id}
              position={[b.lat, b.lng]}
              icon={ICONS[b.estado_visita] || ICONS.no_visitado}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-gray-800 mb-1">{b.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-0.5">📍 {b.direccion}</p>
                  {b.telefono && (
                    <p className="text-sm text-gray-600 mb-3">📞 {b.telefono}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate(`/businesses/${b.id}`)}
                      className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-lg active:bg-blue-700"
                    >
                      Ver detalle
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg text-center block active:bg-gray-200"
                    >
                      🗺️ Cómo llegar
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          <LocateButton onLocate={() => {}} />
        </MapContainer>

        {/* Botón de localización fuera del mapa */}
      </div>

      {/* Sin ubicaciones */}
      {withLocation.length === 0 && !loading && (
        <div className="page-container py-4">
          <div className="card text-center py-4">
            <p className="text-gray-500 text-sm">
              Ningún negocio tiene ubicación GPS registrada.
              Edita un negocio para agregar su ubicación.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
