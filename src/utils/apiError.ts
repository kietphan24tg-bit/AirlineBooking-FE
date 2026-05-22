import axios from 'axios';

type BackendErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string>;
  };
  message?: string;
};

export function pickBackendMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const error = obj.error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  return null;
}

export function pickBackendCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const error = (data as BackendErrorPayload).error;
  if (error?.code?.trim()) return error.code.trim();
  return null;
}

export function getAxiosErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<BackendErrorPayload>(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  return pickBackendMessage(error.response?.data) || fallback;
}

export function getAxiosErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError<BackendErrorPayload>(error)) return null;
  return pickBackendCode(error.response?.data);
}
