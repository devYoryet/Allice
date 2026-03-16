import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adjunta el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: redirige al login si el token expiró
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===================== AUTH =====================
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ===================== BUSINESSES =====================
export const businessAPI = {
  getAll: (q) => api.get('/businesses', { params: q ? { q } : {} }),
  getOne: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', data),
  update: (id, data) => api.put(`/businesses/${id}`, data),
  remove: (id) => api.delete(`/businesses/${id}`),
  getUpcoming: (days) => api.get('/businesses/upcoming', { params: { days } }),
  getOrphaned: () => api.get('/businesses/orphaned'),
};

// ===================== VISITS =====================
export const visitAPI = {
  getByBusiness: (businessId) => api.get(`/businesses/${businessId}/visits`),
  create: (businessId, data) => api.post(`/businesses/${businessId}/visits`, data),
};

// ===================== ORDERS =====================
export const orderAPI = {
  getByBusiness: (businessId) => api.get(`/businesses/${businessId}/orders`),
  getAll: () => api.get('/orders'),
  create: (businessId, data) => api.post(`/businesses/${businessId}/orders`, data),
  update: (id, data) => api.put(`/orders/${id}`, data),
};

// ===================== REPORTS =====================
export const reportAPI = {
  getSummary: (period) => api.get('/reports/summary', { params: { period } }),
  compareRanges: (desde1, hasta1, desde2, hasta2) =>
    api.get('/reports/compare', { params: { desde1, hasta1, desde2, hasta2 } }),
};

// ===================== PRODUCCIÓN =====================
export const produccionAPI = {
  getAll:  ()         => api.get('/produccion'),
  create:  (data)     => api.post('/produccion', data),
  update:  (id, data) => api.put(`/produccion/${id}`, data),
  remove:  (id)       => api.delete(`/produccion/${id}`),
};

export default api;
