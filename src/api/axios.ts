import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/auth.service';
import { getClientTimezone } from '../utils/clientTimezone';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: number;
};

const rawBase = String(import.meta.env.BE_URL || import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);

/** Dev: relative `/api` so Vite proxies to `rawBase` (avoids CORS). Prod: absolute `rawBase`. */
const baseURL = import.meta.env.DEV && rawBase ? '' : rawBase || undefined;

if (import.meta.env.DEV && !rawBase) {
  console.warn(
    '[api] Missing BE_URL or VITE_API_URL — no /api proxy. Add BE_URL to .env and restart Vite.'
  );
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

function isPublicRequest(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/api/services') || url.includes('/api/services?');
}

// Auth + client timezone (backend uses X-Timezone for market/locale logic)
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken && !isPublicRequest(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else if (isPublicRequest(config.url)) {
    delete config.headers.Authorization;
  }
  config.headers['X-Timezone'] = getClientTimezone();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';

    // Do not retry auth endpoints.
    if (
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/register') ||
      requestUrl.includes('/api/auth/logout') ||
      requestUrl.includes('/api/auth/refresh') ||
      requestUrl.includes('/api/auth/password-reset')
    ) {
      return Promise.reject(error);
    }

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    originalRequest._retry = originalRequest._retry ?? 0;
    if (error.response.status === 403 && originalRequest._retry < 4) {
      originalRequest._retry += 1;
      try {
        const res = await authService.refresh();
        const accessToken = res.accessToken;
        useAuthStore.getState().setAccessToken(accessToken ?? null);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearStore();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
