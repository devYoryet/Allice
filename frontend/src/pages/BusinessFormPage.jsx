import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { businessAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// Fix iconos Leaflet con Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente auxiliar para mover el mapa cuando cambian las coords
function MapUpdater({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
}

export default function BusinessFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    persona_cargo: '',
    telefono: '',
    lat: '',
    lng: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      businessAPI.getOne(id)
        .then(({ data }) => {
          setForm({
            nombre: data.nombre || '',
            direccion: data.direccion || '',
            persona_cargo: data.persona_cargo || '',
            telefono: data.telefono || '',
            lat: data.lat || '',
            lng: data.lng || '',
          });
        })
        .catch(() => setError('No se pudo cargar el negocio'))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit]);

  // Cierra dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDireccionChange = (value) => {
    setForm((f) => ({ ...f, direccion: value }));
    setShowSuggestions(false);
    setSuggestions([]);

    clearTimeout(debounceRef.current);
    if (value.trim().length < 4) return;

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = encodeURIComponent(`${value}, Santiago, Chile`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&addressdetails=1&countrycodes=cl`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // silencioso
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const selectSuggestion = (item) => {
    // Construir dirección legible: calle + número + comuna
    const a = item.address || {};
    const parts = [
      a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
      a.suburb || a.city_district || a.town,
    ].filter(Boolean);
    const label = parts.join(', ') || item.display_name.split(',').slice(0, 2).join(',').trim();

    setForm((f) => ({
      ...f,
      direccion: label,
      lat: parseFloat(item.lat).toFixed(6),
      lng: parseFloat(item.lon).toFixed(6),
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      () => {
        setError('No se pudo obtener la ubicación. Verifica los permisos.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.direccion.trim() || !form.telefono.trim()) {
      setError('Nombre, dirección y teléfono son obligatorios');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await businessAPI.update(id, form);
      } else {
        await businessAPI.create(form);
      }
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const hasCoords = form.lat && form.lng;

  if (loadingData) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 active:bg-gray-50"
        >
          ←
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Editar negocio' : 'Nuevo negocio'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nombre del negocio *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: Almacén El Sol"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        </div>

        {/* Dirección con autocomplete */}
        <div ref={wrapperRef} className="relative">
          <label className="label">Dirección *</label>
          <div className="relative">
            <input
              type="text"
              className="input-field pr-8"
              placeholder="Ej: Nataniel Cox 33"
              value={form.direccion}
              onChange={(e) => handleDireccionChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              autoComplete="off"
              required
            />
            {searchLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Escribe la dirección y selecciona de la lista</p>

          {/* Dropdown de sugerencias */}
          {showSuggestions && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((item) => {
                const a = item.address || {};
                const line1 = [a.road, a.house_number].filter(Boolean).join(' ') || item.display_name.split(',')[0];
                const line2 = [a.suburb || a.city_district, a.city || a.town].filter(Boolean).join(', ');
                return (
                  <li
                    key={item.place_id}
                    onMouseDown={() => selectSuggestion(item)}
                    className="px-4 py-3 cursor-pointer hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-800">{line1}</p>
                    {line2 && <p className="text-xs text-gray-500">{line2}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Mapa preview */}
        {hasCoords && (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <span className="text-xs text-gray-500">📍</span>
              <span className="text-xs text-gray-600 truncate">{form.direccion}</span>
              <span className="ml-auto text-xs text-gray-400">{form.lat}, {form.lng}</span>
            </div>
            <MapContainer
              center={[parseFloat(form.lat), parseFloat(form.lng)]}
              zoom={16}
              style={{ height: '180px', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[parseFloat(form.lat), parseFloat(form.lng)]} />
              <MapUpdater lat={parseFloat(form.lat)} lng={parseFloat(form.lng)} />
            </MapContainer>
          </div>
        )}

        <div>
          <label className="label">Persona a cargo</label>
          <input
            type="text"
            className="input-field"
            placeholder="Nombre del encargado"
            value={form.persona_cargo}
            onChange={(e) => setForm({ ...form, persona_cargo: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Teléfono *</label>
          <input
            type="tel"
            className="input-field"
            placeholder="+56912345678"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            required
          />
        </div>

        {/* GPS como respaldo */}
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm font-medium text-blue-800 mb-3">📍 Usar mi ubicación actual (respaldo)</p>
          <button
            type="button"
            onClick={getLocation}
            disabled={geoLoading}
            className="btn-primary bg-blue-500 active:bg-blue-600"
          >
            {geoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Obteniendo ubicación...
              </span>
            ) : (
              '📍 Capturar GPS'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear negocio'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
