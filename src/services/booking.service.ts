import api from '../api/axios';
import type {
  BookingCreateRequest,
  BookingCreateResponse,
  PutBookingServicesRequest,
  PutBookingServicesResponse,
  SeatAssignmentRequest,
  SeatAssignmentResponse,
  SeatUnassignmentRequest,
  SeatUnassignmentResponse,
} from '../types/booking.types';

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

export async function putSeatAssignments(
  bookingId: string | number,
  body: SeatAssignmentRequest
): Promise<SeatAssignmentResponse> {
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.put<SeatAssignmentResponse | { data?: SeatAssignmentResponse }>(
    `/api/bookings/${id}/seat-assignments`,
    body
  );
  const raw = unwrapData(res.data) as SeatAssignmentResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.totalAmount !== 'number') {
    throw new Error('Seat assignment failed');
  }
  return raw;
}

export async function deleteSeatAssignments(
  bookingId: string | number,
  body: SeatUnassignmentRequest
): Promise<SeatUnassignmentResponse> {
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.delete<SeatUnassignmentResponse | { data?: SeatUnassignmentResponse }>(
    `/api/bookings/${id}/seat-assignments`,
    { data: body }
  );
  const raw = unwrapData(res.data) as SeatUnassignmentResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.totalAmount !== 'number') {
    throw new Error('Seat unassignment failed');
  }
  return raw;
}

export async function putBookingServices(
  bookingId: string | number,
  body: PutBookingServicesRequest
): Promise<PutBookingServicesResponse> {
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.put<PutBookingServicesResponse | { data?: PutBookingServicesResponse }>(
    `/api/bookings/${id}/services`,
    body
  );
  const raw = unwrapData(res.data) as PutBookingServicesResponse;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.totalAmount !== 'number' ||
    typeof raw.bookingId !== 'number'
  ) {
    throw new Error('Booking services update failed');
  }
  return raw;
}

export const bookingService = {
  createBooking,
  putSeatAssignments,
  deleteSeatAssignments,
  putBookingServices,
};
