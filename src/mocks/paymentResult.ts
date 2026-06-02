import type {
  PaymentResultStatusResponse,
  PaymentResultSummaryResponse,
} from '../types/payment-create.types';

export type PaymentResultMockVariant = 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export const PAYMENT_RESULT_MOCK_VARIANTS: readonly PaymentResultMockVariant[] = [
  'SUCCESS',
  'PENDING',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
];

export function isPaymentResultMockVariant(value: unknown): value is PaymentResultMockVariant {
  return (
    typeof value === 'string' &&
    (PAYMENT_RESULT_MOCK_VARIANTS as readonly string[]).includes(value.toUpperCase())
  );
}

function cloneMock<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const PAID_AT = '2026-05-01T12:36:00+07:00';
const CREATED_AT = '2026-05-01T12:10:00+07:00';
const EXPIRES_AT = '2026-05-01T12:50:00+07:00';
const OUTBOUND_DEPARTURE = '2026-06-16T05:00:00+07:00';
const OUTBOUND_ARRIVAL = '2026-06-16T07:10:00+07:00';

const successSummary: PaymentResultSummaryResponse = {
  paymentId: 1001,
  bookingId: 90210,
  paymentStatus: 'SUCCESS',
  bookingStatus: 'CONFIRMED',
  booking: {
    pnrCode: 'ABC123',
    createdAt: CREATED_AT,
    paidAt: PAID_AT,
    expiresAt: EXPIRES_AT,
    currency: 'VND',
    totalAmount: 2582200,
  },
  contact: {
    fullName: 'PHAN KIET',
    email: 'phan.kiet@gmail.com',
    phone: '+84961234567',
  },
  payment: {
    method: 'VIETQR',
    transactionId: 'TXN-VQR-20260501-1236',
    amount: 2582200,
    currency: 'VND',
  },
  summary: {
    passengerCount: 1,
    segmentCount: 1,
    totalAmount: 2582200,
    currency: 'VND',
  },
  segments: [
    {
      segmentKey: 'FLIGHT-600',
      flightId: 600,
      journeyType: 'Outbound',
      flightNumber: 'VN123',
      airlineName: 'The Sovereign Airways',
      departure: {
        airportCode: 'SGN',
        airportName: 'Tan Son Nhat International Airport',
        city: 'Ho Chi Minh City',
        terminal: 'T1',
        time: OUTBOUND_DEPARTURE,
      },
      arrival: {
        airportCode: 'HAN',
        airportName: 'Noi Bai International Airport',
        city: 'Ha Noi',
        terminal: 'T2',
        time: OUTBOUND_ARRIVAL,
      },
      durationMinutes: 130,
      stops: 0,
      fare: {
        fareClassCode: 'ECO',
        fareClassName: 'Economy Smart',
        cabinClass: 'ECO',
        checkedBaggageKg: 20,
        carryOnBaggageKg: 7,
      },
    },
  ],
  passengers: [
    {
      passengerId: 9001,
      title: 'Mr',
      firstName: 'PHAN',
      lastName: 'KIET',
      fullName: 'Mr PHAN KIET',
      passengerType: 'ADULT',
      segments: [
        {
          segmentKey: 'FLIGHT-600',
          seat: {
            assigned: true,
            seatId: 8001,
            seatNumber: '11A',
            source: 'BOOKED',
          },
          ticket: {
            ticketId: 7001,
            ticketNumber: '7381234567890',
            status: 'ISSUED',
            issuedAt: PAID_AT,
          },
        },
      ],
      services: [
        {
          serviceId: 5002,
          serviceType: 'BAGGAGE',
          serviceName: 'Checked baggage',
          optionId: 5201,
          optionName: '20kg package',
          quantity: 1,
          amount: 160000,
          currency: 'VND',
          segmentKey: 'FLIGHT-600',
        },
        {
          serviceId: 5003,
          serviceType: 'INSURANCE',
          serviceName: 'Travel insurance',
          optionId: 5301,
          optionName: 'Standard package',
          quantity: 1,
          amount: 100000,
          currency: 'VND',
          segmentKey: 'FLIGHT-600',
        },
      ],
    },
  ],
  tickets: [
    {
      ticketId: 7001,
      ticketNumber: '7381234567890',
      status: 'ISSUED',
      issuedAt: PAID_AT,
      passengerId: 9001,
      segmentKey: 'FLIGHT-600',
      flightId: 600,
      seat: {
        assigned: true,
        seatId: 8001,
        seatNumber: '11A',
        source: 'BOOKED',
      },
    },
  ],
  fareBreakdown: {
    currency: 'VND',
    totals: {
      baseFare: 1738800,
      discount: 0,
      tax: 583400,
      serviceFee: 260000,
      seatFee: 0,
      total: 2582200,
    },
    byPassenger: [
      {
        passengerId: 9001,
        passengerLabel: 'Adult: Mr PHAN KIET',
        bySegment: [
          {
            segmentKey: 'FLIGHT-600',
            routeLabel: 'SGN -> HAN',
            fare: {
              fareClassCode: 'ECO',
              baseFare: 1738800,
              vatOnFare: 0,
              fareTotal: 1738800,
            },
            taxesAndFees: [{ label: 'Taxes and airport fees', amount: 583400 }],
            services: [
              { label: 'Checked baggage 20kg', amount: 160000 },
              { label: 'Travel insurance', amount: 100000 },
            ],
            segmentTotal: 2582200,
          },
        ],
        passengerTotal: 2582200,
      },
    ],
  },
};

const pendingStatus: PaymentResultStatusResponse = {
  paymentId: 1001,
  bookingId: 90210,
  paymentStatus: 'PENDING',
  bookingStatus: 'PENDING_PAYMENT',
  resultPage: 'PENDING',
  expireAt: '2026-05-01T13:10:00+07:00',
  amount: 2582200,
  currency: 'VND',
  method: 'PAY_LATER',
  transactionId: 'TXN-VQR-20260501-1236',
  qrData:
    '00020101021138580010A00000072701280006970415011312345678901234580208QRIBFTTA5303704540725822005802VN62090805AB1236304A1B2',
  qrImageUrl: null,
  paymentUrl: 'https://pay.payos.vn/web/1001',
  pnrCode: 'ABC123',
  polling: {
    pending: true,
    nextPollAfterSeconds: 3,
  },
  failure: null,
};

const failureByVariant: Record<
  Exclude<PaymentResultMockVariant, 'SUCCESS' | 'PENDING'>,
  PaymentResultStatusResponse
> = {
  FAILED: {
    paymentId: 1001,
    bookingId: 90210,
    paymentStatus: 'FAILED',
    bookingStatus: 'PENDING_PAYMENT',
    resultPage: 'ERROR',
    expireAt: '2026-05-01T13:10:00+07:00',
    amount: 2582200,
    currency: 'VND',
    method: 'PAY_LATER',
    transactionId: 'TXN-VQR-20260501-1236',
    qrData: null,
    qrImageUrl: null,
    paymentUrl: null,
    pnrCode: 'ABC123',
    polling: { pending: false, nextPollAfterSeconds: null },
    failure: {
      code: 'PAYMENT_RESULT_ERROR',
      message: 'Payment failed. Please verify your payment details and try again.',
    },
  },
  CANCELLED: {
    paymentId: 1001,
    bookingId: 90210,
    paymentStatus: 'CANCELLED',
    bookingStatus: 'PENDING_PAYMENT',
    resultPage: 'ERROR',
    expireAt: '2026-05-01T13:10:00+07:00',
    amount: 2582200,
    currency: 'VND',
    method: 'PAY_LATER',
    transactionId: 'TXN-VQR-20260501-1236',
    qrData: null,
    qrImageUrl: null,
    paymentUrl: null,
    pnrCode: 'ABC123',
    polling: { pending: false, nextPollAfterSeconds: null },
    failure: {
      code: 'PAYMENT_RESULT_ERROR',
      message: 'Payment was cancelled before it could be completed.',
    },
  },
  EXPIRED: {
    paymentId: 1001,
    bookingId: 90210,
    paymentStatus: 'EXPIRED',
    bookingStatus: 'EXPIRED',
    resultPage: 'ERROR',
    expireAt: '2026-05-01T13:10:00+07:00',
    amount: 2582200,
    currency: 'VND',
    method: 'PAY_LATER',
    transactionId: 'TXN-VQR-20260501-1236',
    qrData: null,
    qrImageUrl: null,
    paymentUrl: null,
    pnrCode: 'ABC123',
    polling: { pending: false, nextPollAfterSeconds: null },
    failure: {
      code: 'PAYMENT_RESULT_ERROR',
      message: 'Payment session has expired. Please start a new payment.',
    },
  },
};

export function getMockPaymentResultStatus(
  variant: PaymentResultMockVariant
): PaymentResultStatusResponse {
  if (variant === 'SUCCESS') {
    return cloneMock({
      paymentId: successSummary.paymentId,
      bookingId: successSummary.bookingId,
      paymentStatus: 'SUCCESS',
      bookingStatus: 'CONFIRMED',
      resultPage: 'SUCCESS',
      expireAt: successSummary.booking.expiresAt,
      amount: successSummary.payment.amount,
      currency: successSummary.payment.currency,
      method: successSummary.payment.method,
      transactionId: successSummary.payment.transactionId,
      qrData: null,
      qrImageUrl: null,
      paymentUrl: null,
      pnrCode: successSummary.booking.pnrCode,
      polling: { pending: false, nextPollAfterSeconds: null },
      failure: null,
    });
  }
  if (variant === 'PENDING') return cloneMock(pendingStatus);
  return cloneMock(failureByVariant[variant]);
}

export function getMockPaymentResultSummary(): PaymentResultSummaryResponse {
  return cloneMock(successSummary);
}
