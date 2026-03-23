import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "@/lib/config";

export const PLAYER_STATE_REFRESH_EVENT = "solus-city:player-state-refresh";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach JWT to every request (reads from localStorage in the browser)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => {
    if (typeof window !== "undefined") {
      const method = res.config.method?.toLowerCase();
      if (method && ["post", "put", "patch", "delete"].includes(method)) {
        window.dispatchEvent(new Event(PLAYER_STATE_REFRESH_EVENT));
      }
    }
    return res;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
