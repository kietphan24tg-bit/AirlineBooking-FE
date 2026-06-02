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
  CreateFlightChangePaymentRequest,
  CreateServiceChangePaymentRequest,
  CreateSeatChangePaymentRequest,
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
          code: 'STRIPE_CARD',
          label: 'Credit or debit card',
          provider: 'STRIPE',
          icon: null,
          supported: true,
          meta: null,
        },
        {
          code: 'VIETQR',
          label: 'Direct VietQR transfer',
          provider: 'VIETQR',
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
  activePayLater: null,
};

export type PaymentCardPayload = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

type MockSeatChangePaymentState = {
  bookingId: number;
  method: string;
  variant: PaymentResultMockVariant;
  pollCount: number;
  completeAfterPolls: number;
};

const MOCK_SEAT_CHANGE_PAYMENT_STORAGE_KEY = 'mock-seat-change-payment-state';
const MOCK_SEAT_CHANGE_PAYMENT_ID_KEY = 'mock-seat-change-payment-next-id';
const PAYMENT_METHODS_TIMEOUT_MS = 3500;
const SEAT_CHANGE_PAYMENT_TIMEOUT_MS = 5000;

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

function resolveSeatChangeMockPaymentVariant(): PaymentResultMockVariant | null {
  const envFlag = import.meta.env?.VITE_MOCK_SEAT_CHANGE_PAYMENT === 'true';
  let urlFlag = false;
  let urlVariant: string | null = null;

  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    urlFlag = params.get('mockSeatChangePayment') === '1';
    urlVariant = params.get('mockSeatChangePaymentVariant');
  }

  if (!envFlag && !urlFlag) return null;
  if (urlVariant && isPaymentResultMockVariant(urlVariant)) {
    return urlVariant.toUpperCase() as PaymentResultMockVariant;
  }
  return resolveMockPaymentResultVariant() ?? 'SUCCESS';
}

function shouldUseMockSeatChangePayment(): boolean {
  return resolveSeatChangeMockPaymentVariant() != null;
}

function isLocalDevHost(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );
}

function shouldAutoFallbackToSeatChangeMock(): boolean {
  return isLocalDevHost();
}

function resolveSeatChangeMockPollCount(): number {
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get('mockSeatChangePaymentPolls'));
    if (Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  }
  return 2;
}

function readMockSeatChangePaymentStates(): Record<string, MockSeatChangePaymentState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(MOCK_SEAT_CHANGE_PAYMENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MockSeatChangePaymentState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getStoredMockSeatChangePaymentState(
  paymentId: string | number
): MockSeatChangePaymentState | null {
  const states = readMockSeatChangePaymentStates();
  return states[String(Number(paymentId))] ?? null;
}

function writeMockSeatChangePaymentStates(
  states: Record<string, MockSeatChangePaymentState>
): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(MOCK_SEAT_CHANGE_PAYMENT_STORAGE_KEY, JSON.stringify(states));
}

function nextMockSeatChangePaymentId(): number {
  if (typeof window === 'undefined') return 91001;
  const current = Number(window.sessionStorage.getItem(MOCK_SEAT_CHANGE_PAYMENT_ID_KEY) ?? '91000');
  const next = Number.isFinite(current) ? current + 1 : 91001;
  window.sessionStorage.setItem(MOCK_SEAT_CHANGE_PAYMENT_ID_KEY, String(next));
  return next;
}

function buildMockPaymentAction(method: string) {
  const normalizedMethod = method.trim().toUpperCase();
  const isCard =
    normalizedMethod.includes('STRIPE') ||
    normalizedMethod.includes('CARD') ||
    normalizedMethod.includes('CREDIT');
  const qrData =
    '00020101021138580010A00000072701280006970415011312345678901234580208QRIBFTTA5303704540725822005802VN62090805AB1236304A1B2';

  return {
    type: isCard ? 'CHECKOUT' : 'QR',
    qrData,
    qrImageUrl: null,
    paymentUrl: isCard
      ? 'https://mock.stripe.local/checkout/1001'
      : 'https://pay.payos.vn/web/1001',
  };
}

function buildMockPaymentResponse(
  paymentId: number,
  bookingId: number,
  method: string
): CreatePaymentResponse {
  const action = buildMockPaymentAction(method);
  const qrOnly = action.type === 'QR';
  return {
    payment: {
      id: paymentId,
      paymentId,
      bookingId,
      amount: 120000,
      currency: 'VND',
      method,
      status: 'PENDING',
      expireAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      transactionId: `TXN-MOCK-${paymentId}`,
      qrData: qrOnly ? action.qrData : null,
      qrImageUrl: qrOnly ? action.qrImageUrl : null,
      paymentUrl: action.paymentUrl,
    },
    action,
  };
}

function getMockCreatePaymentResponse(payload: CreatePaymentRequest): CreatePaymentResponse {
  return buildMockPaymentResponse(1001, Number(payload.bookingId), payload.method);
}

function initializeMockSeatChangePaymentState(
  paymentId: number,
  bookingId: number,
  method: string
): void {
  const variant = resolveSeatChangeMockPaymentVariant() ?? 'SUCCESS';
  const states = readMockSeatChangePaymentStates();
  states[String(paymentId)] = {
    bookingId,
    method,
    variant,
    pollCount: 0,
    completeAfterPolls:
      variant === 'PENDING' ? Number.MAX_SAFE_INTEGER : resolveSeatChangeMockPollCount(),
  };
  writeMockSeatChangePaymentStates(states);
}

function createMockSeatChangePaymentResponse(
  payload: CreateSeatChangePaymentRequest
): CreatePaymentResponse {
  const paymentId = nextMockSeatChangePaymentId();
  initializeMockSeatChangePaymentState(paymentId, Number(payload.bookingId), payload.method);
  return buildMockPaymentResponse(paymentId, Number(payload.bookingId), payload.method);
}

function getMockPaymentStatusResponse(paymentId: string | number): GetPaymentResponse {
  const variant = resolveMockPaymentResultVariant() ?? 'PENDING';
  const mock = getMockCreatePaymentResponse({ bookingId: 90210, method: 'PAYOS_QR' });
  const statusMap: Record<PaymentResultMockVariant, PaymentEntity['status']> = {
    SUCCESS: 'SUCCESS',
    PENDING: 'PENDING',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
  };

  return {
    payment: {
      ...mock.payment,
      id: Number(paymentId),
      paymentId: Number(paymentId),
      status: statusMap[variant],
    },
    action: mock.action,
  };
}

function getMockSeatChangePaymentStatusResponse(paymentId: string | number): GetPaymentResponse {
  const normalizedId = Number(paymentId);
  const states = readMockSeatChangePaymentStates();
  const state = states[String(normalizedId)];
  if (!state) {
    return getMockPaymentStatusResponse(normalizedId);
  }

  const nextPollCount = state.pollCount + 1;
  const hasCompleted = nextPollCount > state.completeAfterPolls;
  const statusMap: Record<PaymentResultMockVariant, PaymentEntity['status']> = {
    SUCCESS: 'SUCCESS',
    PENDING: 'PENDING',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
  };
  const status = hasCompleted ? statusMap[state.variant] : 'PENDING';

  states[String(normalizedId)] = {
    ...state,
    pollCount: nextPollCount,
  };
  writeMockSeatChangePaymentStates(states);

  const mock = buildMockPaymentResponse(normalizedId, state.bookingId, state.method);
  return {
    payment: {
      ...mock.payment,
      status,
    },
    action: mock.action,
  };
}

function getMockCancelPaymentResponse(paymentId: string | number): CancelPaymentResponse {
  const normalizedId = Number(paymentId);
  const states = readMockSeatChangePaymentStates();
  const seatChangeState = states[String(normalizedId)];
  if (seatChangeState) {
    states[String(normalizedId)] = {
      ...seatChangeState,
      variant: 'CANCELLED',
      pollCount: seatChangeState.completeAfterPolls + 1,
    };
    writeMockSeatChangePaymentStates(states);
  }
  const mock = seatChangeState
    ? buildMockPaymentResponse(normalizedId, seatChangeState.bookingId, seatChangeState.method)
    : getMockCreatePaymentResponse({ bookingId: 90210, method: 'PAYOS_QR' });
  return {
    id: normalizedId,
    paymentId: normalizedId,
    bookingId: mock.payment.bookingId,
    amount: mock.payment.amount,
    currency: mock.payment.currency,
    method: mock.payment.method,
    status: 'CANCELLED',
    paidAt: null,
    expireAt: mock.payment.expireAt,
    transactionId: mock.payment.transactionId,
    qrData: mock.payment.qrData,
    qrImageUrl: mock.payment.qrImageUrl ?? null,
    paymentUrl: mock.payment.paymentUrl ?? null,
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
  const onlySupported = options?.onlySupported ?? false;
  const res = await api.get<ApiEnvelope<PaymentMethodsResponse>>('/api/payment-methods', {
    params: { bookingId, onlySupported },
    timeout: PAYMENT_METHODS_TIMEOUT_MS,
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

export async function createSeatChangePaymentLink(
  payload: CreateSeatChangePaymentRequest
): Promise<CreatePaymentResponse> {
  const res = await api.post<ApiEnvelope<CreatePaymentResponse> | CreatePaymentResponse>(
    '/api/seat-change-payments',
    payload,
    { timeout: SEAT_CHANGE_PAYMENT_TIMEOUT_MS }
  );
  return unwrapApiEnvelope(res.data);
}

export async function createServiceChangePaymentLink(
  payload: CreateServiceChangePaymentRequest
): Promise<CreatePaymentResponse> {
  const res = await api.post<ApiEnvelope<CreatePaymentResponse> | CreatePaymentResponse>(
    '/api/service-change-payments',
    payload,
    { timeout: SEAT_CHANGE_PAYMENT_TIMEOUT_MS }
  );
  return unwrapApiEnvelope(res.data);
}

export async function createFlightChangePaymentLink(
  payload: CreateFlightChangePaymentRequest
): Promise<CreatePaymentResponse> {
  const res = await api.post<ApiEnvelope<CreatePaymentResponse> | CreatePaymentResponse>(
    '/api/flight-change-payments',
    payload,
    { timeout: SEAT_CHANGE_PAYMENT_TIMEOUT_MS }
  );
  return unwrapApiEnvelope(res.data);
}

/**
 * GET /api/payments/{paymentId} — check payment status.
 */
export async function getPaymentStatus(paymentId: string | number): Promise<GetPaymentResponse> {
  const res = await api.get<
    ApiEnvelope<GetPaymentResponse | PaymentEntity> | GetPaymentResponse | PaymentEntity
  >(`/api/payments/${paymentId}`, { timeout: SEAT_CHANGE_PAYMENT_TIMEOUT_MS });
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
    { reason },
    { timeout: SEAT_CHANGE_PAYMENT_TIMEOUT_MS }
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
