import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { businessAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

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

        <div>
          <label className="label">Dirección *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: Av. Principal 123"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            required
          />
        </div>

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

        {/* Geolocalización */}
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm font-medium text-blue-800 mb-3">📍 Ubicación GPS</p>
          <button
            type="button"
            onClick={getLocation}
            disabled={geoLoading}
            className="btn-primary bg-blue-500 active:bg-blue-600 mb-3"
          >
            {geoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Obteniendo ubicación...
              </span>
            ) : (
              '📍 Usar mi ubicación actual'
            )}
          </button>
          {form.lat && form.lng && (
            <p className="text-xs text-blue-600 text-center">
              ✅ Lat: {form.lat}, Lng: {form.lng}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="label text-xs">Latitud</label>
              <input
                type="number"
                step="any"
                className="input-field text-sm py-2"
                placeholder="-33.456"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Longitud</label>
              <input
                type="number"
                step="any"
                className="input-field text-sm py-2"
                placeholder="-70.648"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
              />
            </div>
          </div>
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
