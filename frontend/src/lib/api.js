import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 25000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(r => r, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) window.location.href = '/login';
  }
  return Promise.reject(error);
});
export const messageOf = e => e?.response?.data?.message || e?.message || 'Something went wrong';
export default api;
