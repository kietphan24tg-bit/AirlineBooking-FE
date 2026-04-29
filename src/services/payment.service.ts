import api from '../api/axios';
import type { PaymentMethodsResponse } from '../types/payment.types';
import type {
  CancelPaymentResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentResponse,
  PaymentEntity,
} from '../types/payment-create.types';

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type PaymentCardPayload = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

function unwrapApiEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function normalizePaymentStatus(payload: GetPaymentResponse | PaymentEntity): GetPaymentResponse {
  if (payload && typeof payload === 'object' && 'payment' in payload) {
    return payload as GetPaymentResponse;
  }
  return { payment: payload as PaymentEntity };
}

/**
 * GET /api/payment-methods — methods available for the booking.
 */
export async function getPaymentMethods(
  bookingId: string | number,
  options?: { onlySupported?: boolean }
): Promise<PaymentMethodsResponse> {
  const onlySupported = options?.onlySupported ?? false;
  const res = await api.get<ApiEnvelope<PaymentMethodsResponse>>('/api/payment-methods', {
    params: { bookingId, onlySupported },
  });
  return res.data.data;
}

/**
 * POST /api/payments — create payment link / QR for booking.
 */
export async function createPaymentLink(
  payload: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  const res = await api.post<ApiEnvelope<CreatePaymentResponse> | CreatePaymentResponse>(
    '/api/payments',
    payload
  );
  return unwrapApiEnvelope(res.data);
}

/**
 * GET /api/payments/{paymentId} — check payment status.
 */
export async function getPaymentStatus(paymentId: string | number): Promise<GetPaymentResponse> {
  const res = await api.get<
    ApiEnvelope<GetPaymentResponse | PaymentEntity> | GetPaymentResponse | PaymentEntity
  >(`/api/payments/${paymentId}`);
  return normalizePaymentStatus(unwrapApiEnvelope(res.data));
}

/**
 * POST /api/payments/{paymentId}/cancel — cancel a pending payment link.
 */
export async function cancelPayment(
  paymentId: string | number,
  reason = 'User cancelled payment'
): Promise<CancelPaymentResponse> {
  const res = await api.post<ApiEnvelope<CancelPaymentResponse> | CancelPaymentResponse>(
    `/api/payments/${paymentId}/cancel`,
    { reason }
  );
  return unwrapApiEnvelope(res.data);
}
