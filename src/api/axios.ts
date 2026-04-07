import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/auth.service';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: number;
};

const baseURL = String(import.meta.env.BE_URL || import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);

if (import.meta.env.DEV && !baseURL) {
  console.warn(
    '[api] Thiếu BE_URL hoặc VITE_API_URL — axios sẽ gọi nhầm lên dev server, đăng nhập sẽ thất bại. Thêm BE_URL vào .env và khởi động lại Vite.'
  );
}

const api = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true,
});

// Add token to request header
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
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
