import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

export const TOKEN_KEY = "seeker_wars_jwt";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Navigation ref — set by AppNavigator so interceptor can redirect to Login
let navigateToLogin: (() => void) | null = null;

export function setNavigateToLogin(fn: () => void) {
  navigateToLogin = fn;
}

// On 401, clear token and redirect to Login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      navigateToLogin?.();
    }
    return Promise.reject(error);
  }
);
