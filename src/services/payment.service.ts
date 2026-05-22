import api from '../api/axios';
import {
  getMockPaymentResultStatus,
  getMockPaymentResultSummary,
  isPaymentResultMockVariant,
  type PaymentResultMockVariant,
} from '../mocks/paymentResult';
import type { PaymentMethodsResponse } from '../types/payment.types';
import type {
  CancelPaymentResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentResponse,
  PaymentEntity,
  PaymentResultStatusResponse,
  PaymentResultSummaryResponse,
} from '../types/payment-create.types';

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const MOCK_PAYMENT_METHODS: PaymentMethodsResponse = {
  groups: [
    {
      type: 'CARD',
      label: 'Cards & banking',
      methods: [
        {
          code: 'PAYOS_QR',
          label: 'Mobile Banking (VietQR)',
          provider: 'PAYOS',
          icon: null,
          supported: true,
          meta: null,
        },
      ],
    },
    {
      type: 'PAY_LATER',
      label: 'Pay later',
      methods: [
        {
          code: 'PAY_LATER',
          label: 'Hold booking, pay later',
          provider: 'PAYOS',
          icon: null,
          supported: true,
          meta: { holdDurationMinutes: 60, fee: 0 },
        },
      ],
    },
  ],
};

export type PaymentCardPayload = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

function resolveMockPaymentResultVariant(): PaymentResultMockVariant | null {
  const isDevLocal =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const envFlag = import.meta.env?.VITE_MOCK_PAYMENT_RESULT === 'true';
  let urlFlag = false;
  let urlVariant: string | null = null;
  let legacyStatus: string | null = null;

  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    urlFlag = params.get('mockPaymentResult') === '1';
    urlVariant = params.get('mockPaymentVariant');
    legacyStatus = params.get('status');
  }

  if (!envFlag && !urlFlag && !(isDevLocal && legacyStatus === 'success')) return null;
  if (urlVariant && isPaymentResultMockVariant(urlVariant)) {
    return urlVariant.toUpperCase() as PaymentResultMockVariant;
  }
  if (isDevLocal && legacyStatus === 'success') return 'SUCCESS';
  return 'SUCCESS';
}

function shouldUseMockPaymentResult(): boolean {
  return resolveMockPaymentResultVariant() != null;
}

function getMockCreatePaymentResponse(payload: CreatePaymentRequest): CreatePaymentResponse {
  return {
    payment: {
      id: 1001,
      bookingId: Number(payload.bookingId),
      amount: 2582200,
      currency: 'VND',
      method: payload.method,
      status: 'PENDING',
      expireAt: '2026-05-01T13:10:00+07:00',
      transactionId: 'TXN-VQR-20260501-1236',
      qrData:
        '00020101021138580010A00000072701280006970415011312345678901234580208QRIBFTTA5303704540725822005802VN62090805AB1236304A1B2',
      qrImageUrl: null,
      paymentUrl: 'https://pay.payos.vn/web/1001',
    },
    action: {
      type: 'QR',
      qrData:
        '00020101021138580010A00000072701280006970415011312345678901234580208QRIBFTTA5303704540725822005802VN62090805AB1236304A1B2',
      qrImageUrl: null,
      paymentUrl: 'https://pay.payos.vn/web/1001',
    },
  };
}

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
  if (shouldUseMockPaymentResult()) {
    return Promise.resolve(MOCK_PAYMENT_METHODS);
  }
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
  if (shouldUseMockPaymentResult()) {
    return Promise.resolve(getMockCreatePaymentResponse(payload));
  }
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

/**
 * GET /api/payments/{paymentId}/result-status — backend-confirmed result page state.
 */
export async function getPaymentResultStatus(
  paymentId: string | number
): Promise<PaymentResultStatusResponse> {
  const mockVariant = resolveMockPaymentResultVariant();
  if (mockVariant) {
    return Promise.resolve(getMockPaymentResultStatus(mockVariant));
  }
  const res = await api.get<ApiEnvelope<PaymentResultStatusResponse> | PaymentResultStatusResponse>(
    `/api/payments/${paymentId}/result-status`
  );
  return unwrapApiEnvelope(res.data);
}

/**
 * GET /api/payments/{paymentId}/result-summary — success page summary after payment completion.
 */
export async function getPaymentResultSummary(
  paymentId: string | number
): Promise<PaymentResultSummaryResponse> {
  const mockVariant = resolveMockPaymentResultVariant();
  if (mockVariant === 'SUCCESS') {
    return Promise.resolve(getMockPaymentResultSummary());
  }
  const res = await api.get<
    ApiEnvelope<PaymentResultSummaryResponse> | PaymentResultSummaryResponse
  >(`/api/payments/${paymentId}/result-summary`);
  return unwrapApiEnvelope(res.data);
}
