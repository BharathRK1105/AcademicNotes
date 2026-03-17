import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from './tokenStorage';

const resolveBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const rawUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    if (/\/api\/?$/.test(rawUrl)) {
      return rawUrl;
    }
    return `${rawUrl.replace(/\/+$/, '')}/api`;
  }

  const hostUri = Constants?.expoConfig?.hostUri || Constants?.expoGoConfig?.hostUri || '';
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:5000/api`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const webHost = window.location.hostname || 'localhost';
    return `http://${webHost}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

const BASE_URL = resolveBaseUrl();

let unauthorizedHandler = null;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler) {
      await unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Make sure the backend is running and the API URL is reachable.';
  }
  if (error?.message === 'Network Error' || !error?.response) {
    return 'Network error. The server may be waking up or unreachable. Please try again in a moment.';
  }
  return error?.response?.data?.message || error?.message || fallback;
}

export const API_BASE_URL = BASE_URL;

export function getUploadsBaseUrl() {
  return BASE_URL.replace(/\/api\/?$/, '');
}
