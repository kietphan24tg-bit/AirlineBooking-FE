import axios from 'axios';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';

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
    toast.error('Something went wrong. Please try again.');
    return;
  }

  const payload = error.response?.data;
  const details = payload?.error?.details;
  const message =
    payload?.error?.message || payload?.message || 'Something went wrong. Please try again.';

  if (!details || typeof details !== 'object') {
    toast.error(message);
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
    toast.error(message);
  }
}
