

import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
});

export function getStoredToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function storeToken(token, rememberMe = false) {
  clearStoredToken();
  (rememberMe ? localStorage : sessionStorage).setItem("token", token);
}

export function clearStoredToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
