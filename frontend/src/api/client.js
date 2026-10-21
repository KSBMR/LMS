import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Access token lives only in memory (not localStorage) -> not readable by injected scripts after reload.
// The refresh token is an HttpOnly cookie managed by the server.
let accessToken = null;
let onAuthFailure = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;
export const refreshAccess = () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/auth/refresh/`, null, { withCredentials: true })
      .then((r) => { accessToken = r.data.access; return r.data; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        await refreshAccess();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        onAuthFailure();
      }
    }
    return Promise.reject(error);
  }
);

// Flatten DRF error payloads into one readable string.
export function errMsg(err) {
  const d = err?.response?.data;
  if (!err?.response) return "Cannot reach the server. Is the backend running?";
  if (!d) return `Request failed (${err.response.status}).`;
  if (typeof d === "string") return d;
  if (d.detail) return d.detail;
  return Object.entries(d)
    .map(([k, v]) => `${k === "non_field_errors" ? "" : k + ": "}${Array.isArray(v) ? v.join(" ") : typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" | ");
}

export default api;
