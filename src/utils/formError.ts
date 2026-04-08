import axios from 'axios';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

type BackendErrorPayload = {
  error?: {
    message?: string;
    details?: Record<string, string>;
  };
  message?: string;
};

export function applyBackendFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  validFields: readonly string[]
) {
  if (!axios.isAxiosError<BackendErrorPayload>(error)) {
    setError('root.serverError' as FieldPath<T>, {
      type: 'server',
      message: 'Có lỗi xảy ra. Vui lòng thử lại.',
    });
    return;
  }

  const payload = error.response?.data;
  const details = payload?.error?.details;
  const message = payload?.error?.message || payload?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';

  if (!details || typeof details !== 'object') {
    setError('root.serverError' as FieldPath<T>, { type: 'server', message });
    return;
  }

  let mapped = false;
  for (const [field, fieldMessage] of Object.entries(details)) {
    if (validFields.includes(field)) {
      setError(field as FieldPath<T>, {
        type: 'server',
        message: fieldMessage,
      });
      mapped = true;
    }
  }

  if (!mapped) {
    setError('root.serverError' as FieldPath<T>, { type: 'server', message });
  }
}
