import api from '../api/axios';
import type { BookingCreateRequest, BookingCreateResponse } from '../types/booking.types';

function unwrapData(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const b = body as Record<string, unknown>;
  if ('data' in b && b.data != null) return b.data;
  return body;
}

export async function createBooking(payload: BookingCreateRequest): Promise<BookingCreateResponse> {
  const normalizedPayload: BookingCreateRequest = {
    ...payload,
    passengers: payload.passengers.map((passenger) => ({
      ...passenger,
      identifyType:
        (passenger.identifyType as string) === 'CCCD' ? 'ID_CARD' : passenger.identifyType,
    })),
  };
  const res = await api.post<BookingCreateResponse | { data?: BookingCreateResponse }>(
    '/api/bookings',
    normalizedPayload
  );
  const raw = unwrapData(res.data) as BookingCreateResponse;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Booking creation failed');
  }
  return raw;
}

export const bookingService = {
  createBooking,
};
