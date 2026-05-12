import api from '../api/axios';
import {
  getMockCancellationConfirmResponse,
  getMockBookingTicketsResponse,
  getMockCancellationPreviewResponse,
  getMockCancellationSelectionPreviewResponse,
  getMockBookingLookupResponse,
  getMockManageOptionsResponse,
  getMockSeatMapResponse,
  isManageBookingMockVariant,
  type ManageBookingMockVariant,
} from '../mocks/manageBooking';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  BookingCancellationConfirmRequest,
  BookingCancellationConfirmResponse,
  BookingCancellationPreviewRequest,
  BookingCancellationPreviewResponse,
  BookingCancellationSelectionPreviewRequest,
  BookingLookupRequest,
  BookingLookupResponse,
  BookingManageOptionsResponse,
  BookingTicketResponse,
  BookingCreateRequest,
  BookingCreateResponse,
  PutBookingServicesRequest,
  PutBookingServicesResponse,
  CheckInContinueRequest,
  CheckInContinueResponse,
  CheckInConfirmRequest,
  CheckInConfirmResponse,
  SeatChangeRequest,
  SeatChangeResponse,
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

type ManageBookingMockSession = {
  variant: ManageBookingMockVariant;
  lookup: BookingLookupResponse;
  manageOptions: BookingManageOptionsResponse;
};

const mockManageBookingSessions = new Map<ManageBookingMockVariant, ManageBookingMockSession>();
const DEFAULT_IMPLICIT_MOCK_VARIANT: ManageBookingMockVariant = 'CONFIRMED';
const DEFAULT_IMPLICIT_MOCK_LOOKUP = getMockBookingLookupResponse(DEFAULT_IMPLICIT_MOCK_VARIANT);
const DEFAULT_IMPLICIT_MOCK_PNR = DEFAULT_IMPLICIT_MOCK_LOOKUP.booking.pnrCode.trim().toUpperCase();

/** Matches mock last names with or without Vietnamese diacritics (e.g. Nguyen vs Nguyễn). */
function foldAsciiUpper(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase();
}

let implicitMockManageBookingVariant: ManageBookingMockVariant | null = null;

function cloneMock<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createMockManageBookingSession(
  variant: ManageBookingMockVariant
): ManageBookingMockSession {
  return {
    variant,
    lookup: cloneMock(getMockBookingLookupResponse(variant)),
    manageOptions: cloneMock(getMockManageOptionsResponse(variant)),
  };
}

function getMockManageBookingSession(
  variant: ManageBookingMockVariant
): ManageBookingMockSession {
  const existing = mockManageBookingSessions.get(variant);
  if (existing) return existing;
  const created = createMockManageBookingSession(variant);
  mockManageBookingSessions.set(variant, created);
  return created;
}

function isDevLocalhostManageBooking(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function normalizeLookupToken(value: string): string {
  return value.trim().toUpperCase();
}

function resolveImplicitMockManageBookingVariant(
  payload?: BookingLookupRequest,
  bookingId?: string | number
): ManageBookingMockVariant | null {
  if (!isDevLocalhostManageBooking()) return null;

  if (payload) {
    const pnrCode = normalizeLookupToken(payload.pnrCode);
    if (pnrCode === DEFAULT_IMPLICIT_MOCK_PNR && foldAsciiUpper(payload.lastName) === 'NGUYEN') {
      implicitMockManageBookingVariant = DEFAULT_IMPLICIT_MOCK_VARIANT;
      return DEFAULT_IMPLICIT_MOCK_VARIANT;
    }
  }

  if (!implicitMockManageBookingVariant || bookingId == null) return null;

  const normalizedBookingId = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
  if (normalizedBookingId === DEFAULT_IMPLICIT_MOCK_LOOKUP.booking.bookingId) {
    return implicitMockManageBookingVariant;
  }

  return null;
}

function recomputeMockLookupTotals(session: ManageBookingMockSession): void {
  const seatFee = session.manageOptions.seatAssignments.reduce(
    (sum, assignment) => sum + assignment.surchargeAmount,
    0
  );
  const serviceFee = session.manageOptions.serviceSelections.reduce(
    (sum, selection) => sum + selection.price * selection.quantity,
    0
  );
  const price = session.lookup.paymentDetails.price;
  const total = price.baseFare + price.tax + serviceFee + seatFee - price.discount;
  session.lookup.paymentDetails.price = {
    ...price,
    serviceFee,
    seatFee,
    total,
  };
  session.lookup.booking = {
    ...session.lookup.booking,
    totalAmount: total,
  };
}

function syncMockLookupPassengerSelections(session: ManageBookingMockSession): void {
  session.lookup.passengers = session.lookup.passengers.map((passenger) => {
    const seats = session.manageOptions.seatAssignments
      .filter((assignment) => assignment.passengerId === passenger.passengerId)
      .map((assignment) => ({
        flightId: assignment.flightId,
        seatId: assignment.seatId,
        seatNumber: assignment.seatNumber,
        status: assignment.status,
        surchargeAmount: assignment.surchargeAmount,
        currency: assignment.currency,
      }));
    const services = session.manageOptions.serviceSelections
      .filter((selection) => selection.passengerId === passenger.passengerId)
      .map((selection) => ({
        serviceId: selection.serviceId ?? 0,
        serviceType: selection.serviceType ?? 'SERVICE',
        serviceName: selection.serviceName ?? 'Service',
        optionId: selection.optionId ?? 0,
        optionName: selection.optionName ?? 'Option',
        quantity: selection.quantity,
        price: selection.price,
      }));
    return {
      ...passenger,
      selections: {
        seats,
        services,
      },
      seatAssignments: seats,
      serviceSelections: services,
    };
  });
  recomputeMockLookupTotals(session);
}

function syncMockManageOptionsPassengerSegments(session: ManageBookingMockSession): void {
  session.manageOptions.passengers = session.manageOptions.passengers.map((passenger) => ({
    ...passenger,
    segments: (passenger.segments ?? []).map((segment) => {
      const seatAssignment = session.manageOptions.seatAssignments.find(
        (item) => item.passengerId === passenger.passengerId && item.flightId === segment.flightId
      );
      return {
        ...segment,
        seatAssigned: Boolean(seatAssignment),
        seatNumber: seatAssignment?.seatNumber ?? null,
      };
    }),
  }));
}

function buildMockSeatAssignmentResponse(session: ManageBookingMockSession): SeatAssignmentResponse {
  const seatSurchargeTotal = session.manageOptions.seatAssignments.reduce(
    (sum, assignment) => sum + assignment.surchargeAmount,
    0
  );
  return {
    bookingId: session.manageOptions.bookingId,
    status: session.manageOptions.bookingStatus,
    seatSurchargeTotal,
    totalAmount: session.lookup.booking.totalAmount,
    assignments: session.manageOptions.seatAssignments.map((assignment) => ({
      passengerId: assignment.passengerId,
      seatId: assignment.seatId,
      status: assignment.status,
      surchargeAmount: assignment.surchargeAmount,
      currency: assignment.currency,
    })),
  };
}

function resolveMockSeatAssignmentContext(
  session: ManageBookingMockSession,
  seatId: number
): {
  flightId: number;
  fareId: number;
  seatNumber: string;
  surchargeAmount: number;
  currency: string;
} | null {
  for (const itinerary of session.manageOptions.itineraries) {
    const seatMap = getMockSeatMapResponse(session.variant, itinerary.flightId, itinerary.fareId);
    const seat = seatMap?.rows.flatMap((row) => row.cells).find((cell) => cell.seatId === seatId);
    if (!seat) continue;

    return {
      flightId: itinerary.flightId,
      fareId: itinerary.fareId,
      seatNumber: seat.seatNumber,
      surchargeAmount: seat.extraPrice ?? 0,
      currency: seat.currency ?? session.manageOptions.currency,
    };
  }

  return null;
}

function buildMockServicesResponse(session: ManageBookingMockSession): PutBookingServicesResponse {
  const ancillaryTotal = session.manageOptions.serviceSelections.reduce(
    (sum, selection) => sum + selection.price * selection.quantity,
    0
  );
  return {
    bookingId: session.manageOptions.bookingId,
    ancillaryTotal,
    totalAmount: session.lookup.booking.totalAmount,
    currency: session.manageOptions.currency,
    passengers: session.manageOptions.passengers.map((passenger) => ({
      passengerId: passenger.passengerId,
      selections: session.manageOptions.serviceSelections
        .filter((selection) => selection.passengerId === passenger.passengerId)
        .map((selection) => ({
          serviceId: selection.serviceId ?? 0,
          serviceType: selection.serviceType ?? 'SERVICE',
          serviceName: selection.serviceName ?? 'Service',
          optionId: selection.optionId ?? 0,
          optionName: selection.optionName ?? 'Option',
          quantity: selection.quantity,
          price: selection.price,
        })),
    })),
  };
}

function buildMockCheckInContinueResponse(
  session: ManageBookingMockSession,
  body: CheckInContinueRequest
): CheckInContinueResponse {
  const lookup = session.lookup;
  const manageOptions = session.manageOptions;
  const tickets = getMockBookingTicketsResponse(session.variant).tickets;
  const ticketsByFlightAndPassenger = new Map<string, (typeof tickets)[number]>();

  for (const ticket of tickets) {
    const flightIds =
      lookup.passengers
        .find((passenger) => passenger.passengerId === ticket.passenger.id)
        ?.selections?.seats?.map((seat) => seat.flightId) ??
      manageOptions.itineraries.map((itinerary) => itinerary.flightId);
    for (const flightId of flightIds) {
      ticketsByFlightAndPassenger.set(`${flightId}:${ticket.passenger.id}`, ticket);
    }
  }

  const selectedSegments = body.segments.map((segment) => {
    const itinerary = manageOptions.itineraries.find((item) => item.flightId === segment.flightId);
    if (!itinerary) {
      throw new Error('Selected flight does not belong to the booking.');
    }

    const passengers = segment.passengerIds.map((passengerId) => {
      const passenger = lookup.passengers.find((item) => item.passengerId === passengerId);
      const managedPassenger = manageOptions.passengers.find((item) => item.passengerId === passengerId);
      const ticket = ticketsByFlightAndPassenger.get(`${segment.flightId}:${passengerId}`);
      const segmentState = managedPassenger?.segments?.find((item) => item.flightId === segment.flightId);
      const seatAssignment = manageOptions.seatAssignments.find(
        (item) => item.flightId === segment.flightId && item.passengerId === passengerId
      );

      if (!passenger || !managedPassenger || !ticket || !segmentState) {
        throw new Error('Selected passenger does not have a ticket for the requested flight.');
      }

      return {
        passengerId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        fullName: `${passenger.lastName} ${passenger.firstName}`.trim(),
        dateOfBirth: passenger.dateOfBirth,
        passengerType: passenger.passengerType,
        eligible: segmentState.eligible,
        checkInStatus: segmentState.checkInStatus,
        seat: {
          assigned: Boolean(seatAssignment),
          seatId: seatAssignment?.seatId ?? null,
          seatNumber: seatAssignment?.seatNumber ?? null,
        },
        warnings: segmentState.warnings,
      };
    });

    const hasBlockedPassenger = passengers.some((passenger) => !passenger.eligible);
    const hasPassengerWithoutSeat = passengers.some((passenger) => !passenger.seat.assigned);
    const status = hasBlockedPassenger
      ? 'BLOCKED'
      : hasPassengerWithoutSeat
        ? 'SEAT_SELECTION_REQUIRED'
        : 'READY_FOR_CONFIRMATION';

    return {
      flightId: itinerary.flightId,
      flightNumber: itinerary.flightNumber,
      journeyType: itinerary.journeyType,
      status,
      checkInWindow: {
        status: itinerary.checkInWindow.status,
        opensAt: itinerary.checkInWindow.opensAt,
        closesAt: itinerary.checkInWindow.closesAt,
        message: itinerary.checkInWindow.message,
      },
      departure: {
        airportCode: itinerary.departureAirportCode,
        airportName: itinerary.departureAirportCode,
        city: itinerary.departureCity,
        terminal: itinerary.departureTerminal,
        gate: null,
        time: itinerary.departureTime,
      },
      arrival: {
        airportCode: itinerary.arrivalAirportCode,
        airportName: itinerary.arrivalAirportCode,
        city: itinerary.arrivalCity,
        terminal: itinerary.arrivalTerminal,
        gate: null,
        time: itinerary.arrivalTime,
      },
      fare: {
        fareClass: itinerary.fareName ?? 'STANDARD',
        cabinClass: itinerary.cabinClass ?? 'ECONOMY',
      },
      passengers,
    };
  });

  const selectedPassengers = selectedSegments.reduce((sum, segment) => sum + segment.passengers.length, 0);
  const readyPassengers = selectedSegments.reduce(
    (sum, segment) =>
      sum +
      segment.passengers.filter((passenger) => passenger.eligible && passenger.seat.assigned).length,
    0
  );
  const blockedPassengers = selectedSegments.reduce(
    (sum, segment) => sum + segment.passengers.filter((passenger) => !passenger.eligible).length,
    0
  );
  const passengersWithoutSeat = selectedSegments.reduce(
    (sum, segment) =>
      sum +
      segment.passengers.filter((passenger) => passenger.eligible && !passenger.seat.assigned).length,
    0
  );

  return {
    booking: {
      bookingId: lookup.booking.bookingId,
      pnrCode: lookup.booking.pnrCode,
      status: lookup.booking.status,
      contactEmail: lookup.primaryContact.email,
      contactPhone: lookup.primaryContact.phone,
      passengerCount: lookup.passengers.length,
      currency: lookup.booking.currency,
      lastName: lookup.passengers[0]?.lastName ?? body.lastName.trim().toUpperCase(),
    },
    segments: selectedSegments,
    summary: {
      selectedSegments: selectedSegments.length,
      selectedPassengers,
      readyPassengers,
      blockedPassengers,
      passengersWithoutSeat,
    },
    actions: {
      allowConfirmCheckIn: blockedPassengers === 0 && passengersWithoutSeat === 0,
      allowSeatSelection: blockedPassengers === 0 && passengersWithoutSeat > 0,
      nextStep:
        blockedPassengers === 0 && passengersWithoutSeat === 0
          ? 'CONFIRM_CHECK_IN'
          : blockedPassengers === 0 && passengersWithoutSeat > 0
            ? 'SELECT_SEAT'
            : 'REVIEW_SELECTION',
    },
  };
}

function buildMockCheckInConfirmResponse(
  session: ManageBookingMockSession,
  body: CheckInConfirmRequest
): CheckInConfirmResponse {
  const shouldUseRichVisualMock =
    isDevLocalhostManageBooking() &&
    session.variant === 'CONFIRMED' &&
    session.manageOptions.itineraries.length > 1;
  const effectiveBody = shouldUseRichVisualMock
    ? {
        pnrCode: body.pnrCode,
        lastName: body.lastName,
        segments: session.manageOptions.itineraries.map((itinerary) => ({
          flightId: itinerary.flightId,
          passengerIds: session.manageOptions.passengers.map((passenger) => passenger.passengerId),
        })),
      }
    : body;
  const preview = buildMockCheckInContinueResponse(session, effectiveBody);
  const shouldForceDemoSuccess = isDevLocalhostManageBooking();
  if (!preview.actions.allowConfirmCheckIn && !shouldForceDemoSuccess) {
    throw new Error('Check-in confirmation failed');
  }

  const boardingPasses = preview.segments.flatMap((segment, segmentIndex) =>
    segment.passengers.map((passenger, passengerIndex) => {
      const fallbackSeatLabel = `${12 + passengerIndex}${String.fromCharCode(65 + (passengerIndex % 3))}`;
      return {
        boardingPassId: segment.flightId * 1000 + passenger.passengerId,
        ticketId: passenger.ticketId,
        passengerId: passenger.passengerId,
        flightId: segment.flightId,
        qrCode: `BP|${preview.booking.pnrCode}|${segment.flightId}|${passenger.passengerId}|${passenger.ticketId}|${passenger.seat.seatNumber ?? fallbackSeatLabel}`,
        gate: segment.departure.gate ?? `${12 + segmentIndex}`,
        boardingTime: segment.departure.time,
        sequenceNumber: segmentIndex * 100 + passengerIndex + 1,
        seatLabel: passenger.seat.seatNumber ?? fallbackSeatLabel,
      };
    })
  );

  return {
    booking: {
      bookingId: preview.booking.bookingId,
      pnrCode: preview.booking.pnrCode,
      status: 'CHECKED_IN_COMPLETED',
    },
    segments: preview.segments.map((segment) => ({
      flightId: segment.flightId,
      flightNumber: segment.flightNumber,
      passengers: segment.passengers.map((passenger) => ({
        passengerId: passenger.passengerId,
        ticketId: passenger.ticketId,
        ticketNumber: passenger.ticketNumber,
        fullName: passenger.fullName,
        seatNumber: passenger.seat.seatNumber,
        boardingPassId: segment.flightId * 1000 + passenger.passengerId,
        checkInStatus: 'CHECKED_IN',
      })),
    })),
    boardingPasses,
    summary: {
      confirmedPassengers: boardingPasses.length,
      confirmedSegments: preview.segments.length,
    },
  };
}

/**
 * Returns the mock manage-booking variant when the flag is enabled, otherwise
 * `null`. The flag can be set either via env (`VITE_MOCK_MANAGE_BOOKING=true`)
 * or via the URL (`?mockManageBooking=1[&mockManageVariant=PENDING_PAYMENT]`).
 */
export function resolveMockManageBookingVariant(): ManageBookingMockVariant | null {
  const isDevLocal =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const envFlag = import.meta.env?.VITE_MOCK_MANAGE_BOOKING === 'true';
  let urlFlag = false;
  let urlVariant: string | null = null;
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    urlFlag = params.get('mockManageBooking') === '1';
    urlVariant = params.get('mockManageVariant');
  }
  const { bookingLookup, lookupCriteria, manageOptions, mockManageBookingMode } = useBookingStore.getState();
  const looksLikePersistedMock =
    isDevLocal &&
    (
      bookingLookup?.booking?.pnrCode?.trim().toUpperCase() === 'ABC123' ||
      lookupCriteria?.pnrCode?.trim().toUpperCase() === 'ABC123' ||
      manageOptions?.bookingId === 90210
    );

  if (!envFlag && !urlFlag && !mockManageBookingMode && !looksLikePersistedMock) return null;
  if (urlVariant && isManageBookingMockVariant(urlVariant)) return urlVariant;
  if ((manageOptions?.passengers?.length ?? 0) === 1 && (manageOptions?.itineraries?.length ?? 0) === 1) {
    return 'CHECKIN_SINGLE';
  }
  return 'CONFIRMED';
}

export function resetMockManageBookingVariant(variant: ManageBookingMockVariant): void {
  implicitMockManageBookingVariant = variant;
  mockManageBookingSessions.set(variant, createMockManageBookingSession(variant));
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

export async function lookupBooking(payload: BookingLookupRequest): Promise<BookingLookupResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(payload);
  if (mockVariant) {
    return Promise.resolve(cloneMock(getMockManageBookingSession(mockVariant).lookup));
  }
  const res = await api.post<BookingLookupResponse | { data?: BookingLookupResponse }>(
    '/api/bookings/lookup',
    payload
  );
  const raw = unwrapData(res.data) as BookingLookupResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.booking?.bookingId !== 'number') {
    throw new Error('Booking lookup failed');
  }
  return raw;
}

export async function getManageOptions(
  bookingId: string | number
): Promise<BookingManageOptionsResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(cloneMock(getMockManageBookingSession(mockVariant).manageOptions));
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.get<BookingManageOptionsResponse | { data?: BookingManageOptionsResponse }>(
    `/api/bookings/${id}/manage-options`
  );
  const raw = unwrapData(res.data) as BookingManageOptionsResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Manage booking options could not be loaded');
  }
  return raw;
}

export async function getBookingTickets(
  bookingId: string | number
): Promise<BookingTicketResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(cloneMock(getMockBookingTicketsResponse(mockVariant)));
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.get<BookingTicketResponse | { data?: BookingTicketResponse }>(
    `/api/bookings/${id}/tickets`
  );
  const raw = unwrapData(res.data) as BookingTicketResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Booking tickets could not be loaded');
  }
  return raw;
}

export async function previewCancellation(
  bookingId: string | number,
  body: BookingCancellationPreviewRequest
): Promise<BookingCancellationPreviewResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(cloneMock(getMockCancellationPreviewResponse(mockVariant, body.ticketIds)));
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<
    BookingCancellationPreviewResponse | { data?: BookingCancellationPreviewResponse }
  >(`/api/bookings/${id}/cancellations/preview`, body);
  const raw = unwrapData(res.data) as BookingCancellationPreviewResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Cancellation preview failed');
  }
  return raw;
}

export async function previewCancellationBySelection(
  bookingId: string | number,
  body: BookingCancellationSelectionPreviewRequest
): Promise<BookingCancellationPreviewResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(cloneMock(getMockCancellationSelectionPreviewResponse(mockVariant, body)));
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<
    BookingCancellationPreviewResponse | { data?: BookingCancellationPreviewResponse }
  >(`/api/bookings/${id}/cancellations/preview`, body);
  const raw = unwrapData(res.data) as BookingCancellationPreviewResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Cancellation preview failed');
  }
  return raw;
}

export async function confirmCancellation(
  bookingId: string | number,
  body: BookingCancellationConfirmRequest
): Promise<BookingCancellationConfirmResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(cloneMock(getMockCancellationConfirmResponse(mockVariant, body)));
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<
    BookingCancellationConfirmResponse | { data?: BookingCancellationConfirmResponse }
  >(`/api/bookings/${id}/cancellations`, body);
  const raw = unwrapData(res.data) as BookingCancellationConfirmResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Cancellation confirmation failed');
  }
  return raw;
}

export async function putSeatAssignments(
  bookingId: string | number,
  body: SeatAssignmentRequest
): Promise<SeatAssignmentResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    const id = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
    if (id !== session.manageOptions.bookingId) {
      throw new Error('Seat assignment failed');
    }
    for (const assignment of body.assignments) {
      const seatContext = resolveMockSeatAssignmentContext(session, assignment.seatId);
      if (!seatContext) {
        throw new Error('Seat assignment failed');
      }
      session.manageOptions.seatAssignments = session.manageOptions.seatAssignments.filter(
        (item) =>
          !(
            item.passengerId === assignment.passengerId &&
            item.flightId === seatContext.flightId
          )
      );
      session.manageOptions.seatAssignments.push({
        passengerId: assignment.passengerId,
        flightId: seatContext.flightId,
        seatId: assignment.seatId,
        seatNumber: seatContext.seatNumber,
        status: 'BOOKED',
        surchargeAmount: seatContext.surchargeAmount,
        currency: seatContext.currency,
      });
    }
    syncMockManageOptionsPassengerSegments(session);
    syncMockLookupPassengerSelections(session);
    return Promise.resolve(buildMockSeatAssignmentResponse(session));
  }
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
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    const id = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
    if (id !== session.manageOptions.bookingId) {
      throw new Error('Seat unassignment failed');
    }
    const seatIds = new Set(body.assignments.map((assignment) => assignment.seatId));
    const passengerIds = new Set(body.assignments.map((assignment) => assignment.passengerId));
    session.manageOptions.seatAssignments = session.manageOptions.seatAssignments.filter(
      (item) => !(passengerIds.has(item.passengerId) && seatIds.has(item.seatId))
    );
    syncMockManageOptionsPassengerSegments(session);
    syncMockLookupPassengerSelections(session);
    return Promise.resolve(buildMockSeatAssignmentResponse(session));
  }
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

export async function patchSeatAssignment(
  bookingId: string | number,
  body: SeatChangeRequest
): Promise<SeatChangeResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    const id = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
    if (id !== session.manageOptions.bookingId) {
      throw new Error('Seat change failed');
    }

    const existingAssignment = session.manageOptions.seatAssignments.find(
      (item) => item.passengerId === body.passengerId && item.seatId === body.fromSeatId
    );
    if (!existingAssignment) {
      throw new Error('Seat change failed');
    }

    session.manageOptions.seatAssignments = session.manageOptions.seatAssignments.filter(
      (item) => !(item.passengerId === body.passengerId && item.seatId === body.fromSeatId)
    );

    if (body.toSeatId != null) {
      const seatContext = resolveMockSeatAssignmentContext(session, body.toSeatId);
      if (!seatContext) {
        throw new Error('Seat change failed');
      }
      session.manageOptions.seatAssignments.push({
        passengerId: body.passengerId,
        flightId: seatContext.flightId,
        seatId: body.toSeatId,
        seatNumber: seatContext.seatNumber,
        status: 'BOOKED',
        surchargeAmount: seatContext.surchargeAmount,
        currency: seatContext.currency,
      });
    }

    syncMockManageOptionsPassengerSegments(session);
    syncMockLookupPassengerSelections(session);
    return Promise.resolve(buildMockSeatAssignmentResponse(session));
  }

  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.patch<SeatChangeResponse | { data?: SeatChangeResponse }>(
    `/api/bookings/${id}/seat-assignment`,
    body
  );
  const raw = unwrapData(res.data) as SeatChangeResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.totalAmount !== 'number') {
    throw new Error('Seat change failed');
  }
  return raw;
}

export async function putBookingServices(
  bookingId: string | number,
  body: PutBookingServicesRequest
): Promise<PutBookingServicesResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    const id = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
    if (id !== session.manageOptions.bookingId) {
      throw new Error('Booking services update failed');
    }
    const existingByOption = new Map(
      session.manageOptions.serviceSelections.map((selection) => [selection.optionId, selection])
    );
    for (const passenger of body.passengers) {
      session.manageOptions.serviceSelections = session.manageOptions.serviceSelections.filter(
        (selection) => selection.passengerId !== passenger.passengerId
      );
      for (const selection of passenger.selections) {
        const existing = existingByOption.get(selection.optionId);
        session.manageOptions.serviceSelections.push({
          passengerId: passenger.passengerId,
          serviceId: existing?.serviceId ?? null,
          serviceType: existing?.serviceType ?? 'SERVICE',
          serviceName: existing?.serviceName ?? 'Service',
          optionId: selection.optionId,
          optionName: existing?.optionName ?? `Option ${selection.optionId}`,
          quantity: selection.quantity,
          price: existing?.price ?? 0,
        });
      }
    }
    syncMockLookupPassengerSelections(session);
    return Promise.resolve(buildMockServicesResponse(session));
  }
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

export async function continueCheckIn(
  body: CheckInContinueRequest
): Promise<CheckInContinueResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(body);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    return Promise.resolve(buildMockCheckInContinueResponse(session, body));
  }
  const res = await api.post<CheckInContinueResponse | { data?: CheckInContinueResponse }>(
    '/api/check-in/continue',
    body
  );
  const raw = unwrapData(res.data) as CheckInContinueResponse;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.booking?.bookingId !== 'number' ||
    !Array.isArray(raw.segments)
  ) {
    throw new Error('Check-in continuation failed');
  }
  return raw;
}

export async function confirmCheckIn(
  body: CheckInConfirmRequest
): Promise<CheckInConfirmResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ?? resolveImplicitMockManageBookingVariant(body);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    return Promise.resolve(buildMockCheckInConfirmResponse(session, body));
  }
  const res = await api.post<CheckInConfirmResponse | { data?: CheckInConfirmResponse }>(
    '/api/check-in/confirm',
    body
  );
  const raw = unwrapData(res.data) as CheckInConfirmResponse;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.booking?.bookingId !== 'number' ||
    !Array.isArray(raw.boardingPasses)
  ) {
    throw new Error('Check-in confirmation failed');
  }
  return raw;
}

export const bookingService = {
  createBooking,
  lookupBooking,
  getManageOptions,
  getBookingTickets,
  previewCancellation,
  previewCancellationBySelection,
  confirmCancellation,
  putSeatAssignments,
  deleteSeatAssignments,
  patchSeatAssignment,
  putBookingServices,
  continueCheckIn,
  confirmCheckIn,
};
