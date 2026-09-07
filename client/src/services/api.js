import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Resolve a server-relative file path (e.g. "/api/files/:id") into a fully
// qualified URL that works in both dev (proxy) and prod (separate API origin).
export function resolveFileUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const base = import.meta.env.VITE_API_URL || '/api';
  // If the API base is absolute, derive its origin and join the path.
  if (/^https?:\/\//i.test(base)) {
    try {
      const origin = new URL(base).origin;
      return `${origin}${pathOrUrl}`;
    } catch {
      return pathOrUrl;
    }
  }
  // Relative base (dev): the vite proxy handles /api and /uploads.
  return pathOrUrl;
}

export default api;
