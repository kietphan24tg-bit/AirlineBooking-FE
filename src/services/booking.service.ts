import api from '../api/axios';
import {
  getMockCancellationConfirmResponse,
  getMockBookingTicketsResponse,
  getMockCancellationPreviewResponse,
  getMockCancellationSelectionPreviewResponse,
  getMockBookingLookupResponse,
  getMockFlightChangeQuoteResponse,
  getMockManageOptionsResponse,
  getMockServiceCatalogResponse,
  getMockSeatMapResponse,
  isManageBookingMockVariant,
  type ManageBookingMockVariant,
} from '../mocks/manageBooking';
import { getMockTripDetailResult, getMockTripHistoryResult } from '../mocks/tripHistory';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  BookingCancellationConfirmRequest,
  BookingCancellationConfirmResponse,
  BookingCancellationPreviewRequest,
  BookingCancellationPreviewResponse,
  BookingCancellationSelectionPreviewRequest,
  FlightChangeConfirmRequest,
  FlightChangeConfirmResponse,
  FlightChangeQuoteRequest,
  FlightChangeQuoteResponse,
  BookingLookupRequest,
  BookingLookupResponse,
  BookingLookupServiceSelection,
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
  ServiceChangeConfirmRequest,
  ServiceChangeConfirmResponse,
  ServiceChangePreviewRequest,
  ServiceChangePreviewResponse,
  SeatChangeConfirmRequest,
  SeatChangeConfirmResponse,
  SeatChangePreviewRequest,
  SeatChangePreviewResponse,
  SeatUnassignmentRequest,
  SeatUnassignmentResponse,
  TripDetailResult,
  TripHistoryQuery,
  TripHistoryResult,
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

export type ManageBookingRouteSeed = {
  bookingId: number;
  pnrCode: string;
  lastName: string;
  expiresAt: string | null;
  primaryFlightId: number | null;
};

const mockManageBookingSessions = new Map<ManageBookingMockVariant, ManageBookingMockSession>();
const mockManageBookingCommittedSessions = new Map<
  ManageBookingMockVariant,
  ManageBookingMockSession
>();
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

function getPersistedMockStoreSession(): Pick<
  ManageBookingMockSession,
  'lookup' | 'manageOptions'
> | null {
  const { bookingLookup, manageOptions } = useBookingStore.getState();
  const normalizedPnr = bookingLookup?.booking?.pnrCode?.trim().toUpperCase() ?? null;
  const looksLikeMockLookup = normalizedPnr === DEFAULT_IMPLICIT_MOCK_PNR;
  const looksLikeMockManageOptions =
    typeof manageOptions?.bookingId === 'number' &&
    manageOptions.bookingId === DEFAULT_IMPLICIT_MOCK_LOOKUP.booking.bookingId;

  if (!looksLikeMockLookup || !looksLikeMockManageOptions || !bookingLookup || !manageOptions) {
    return null;
  }

  return {
    lookup: cloneMock(bookingLookup),
    manageOptions: cloneMock(manageOptions),
  };
}

function ensureMockManageBookingSession(
  variant: ManageBookingMockVariant,
  currentFlightId?: number
): ManageBookingMockSession {
  const persisted = getPersistedMockStoreSession();
  const existing = mockManageBookingSessions.get(variant);

  if (!persisted) {
    if (existing) return existing;
    const created = cloneMock(getCommittedMockManageBookingSession(variant));
    mockManageBookingSessions.set(variant, created);
    return created;
  }

  if (!existing) {
    const hydrated = { variant, ...persisted };
    mockManageBookingSessions.set(variant, hydrated);
    return hydrated;
  }

  if (currentFlightId == null) {
    return existing;
  }

  const existingHasCurrentFlight =
    existing.lookup.itineraries.some((item) => item.flightId === currentFlightId) ||
    existing.manageOptions.itineraries.some((item) => item.flightId === currentFlightId);
  if (existingHasCurrentFlight) {
    return existing;
  }

  const persistedHasCurrentFlight =
    persisted.lookup.itineraries.some((item) => item.flightId === currentFlightId) ||
    persisted.manageOptions.itineraries.some((item) => item.flightId === currentFlightId);
  if (!persistedHasCurrentFlight) {
    return existing;
  }

  const hydrated = { variant, ...persisted };
  mockManageBookingSessions.set(variant, hydrated);
  return hydrated;
}

function getCommittedMockManageBookingSession(
  variant: ManageBookingMockVariant
): ManageBookingMockSession {
  const existing = mockManageBookingCommittedSessions.get(variant);
  if (existing) return existing;
  const created = createMockManageBookingSession(variant);
  mockManageBookingCommittedSessions.set(variant, created);
  return created;
}

function getMockManageBookingSession(variant: ManageBookingMockVariant): ManageBookingMockSession {
  return ensureMockManageBookingSession(variant);
}

function commitMockManageBookingSession(variant: ManageBookingMockVariant): void {
  const session = getMockManageBookingSession(variant);
  mockManageBookingCommittedSessions.set(variant, cloneMock(session));
}

function applyMockServiceChangeRequest(
  session: ManageBookingMockSession,
  body: ServiceChangeConfirmRequest | ServiceChangePreviewRequest
): void {
  const optionCatalogByFlightId = new Map<
    number,
    Map<
      number,
      {
        serviceId: number;
        serviceType: string;
        serviceName: string;
        name: string;
        price: number;
      }
    >
  >();
  for (const itinerary of session.manageOptions.itineraries) {
    const catalog = getMockServiceCatalogResponse(
      session.variant,
      itinerary.flightId,
      itinerary.fareId
    );
    optionCatalogByFlightId.set(
      itinerary.flightId,
      new Map(
        (catalog?.services ?? []).flatMap((service) =>
          service.options.map((option) => [
            option.optionId,
            {
              serviceId: option.serviceId,
              serviceType: option.serviceType,
              serviceName: option.serviceName,
              name: option.name,
              price: option.price,
            },
          ])
        )
      )
    );
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
      const flightId = selection.flightId;
      const optionDetails =
        flightId != null ? optionCatalogByFlightId.get(flightId)?.get(selection.optionId) : null;
      session.manageOptions.serviceSelections.push({
        passengerId: passenger.passengerId,
        flightId,
        serviceId: existing?.serviceId ?? optionDetails?.serviceId ?? null,
        serviceType: existing?.serviceType ?? optionDetails?.serviceType ?? 'SERVICE',
        serviceName: existing?.serviceName ?? optionDetails?.serviceName ?? 'Service',
        optionId: selection.optionId,
        optionName: existing?.optionName ?? optionDetails?.name ?? `Option ${selection.optionId}`,
        quantity: selection.quantity,
        price: existing?.price ?? (optionDetails?.price ?? 0) * selection.quantity,
      });
    }
  }
}

function applyMockFlightChangeRequest(
  session: ManageBookingMockSession,
  quoteToken: string
): FlightChangeQuoteResponse {
  const matches = /^mock_fcq_(\d+)_(\d+)_(\d+)$/i.exec(quoteToken.trim());
  if (!matches) {
    throw new Error('Invalid mock flight-change quote token.');
  }

  const currentFlightId = Number(matches[1]);
  const newFlightId = Number(matches[2]);
  const newFareId = Number(matches[3]);
  const alignedSession = ensureMockManageBookingSession(session.variant, currentFlightId);
  const quote = getMockFlightChangeQuoteResponse(
    session.variant,
    {
      ticketIds: getMockBookingTicketsResponse(session.variant).tickets.map((ticket) => ticket.id),
      currentFlightId,
      newFlightId,
      newFareId,
    },
    {
      lookup: alignedSession.lookup,
      manageOptions: alignedSession.manageOptions,
    }
  );
  const replacementFlight = quote.newFlight;

  alignedSession.lookup.itineraries = alignedSession.lookup.itineraries.map((itinerary) =>
    itinerary.flightId !== currentFlightId
      ? itinerary
      : {
          ...itinerary,
          flightId: replacementFlight.flightId,
          flightNumber: replacementFlight.flightNumber,
          departureTime: replacementFlight.departureTime,
          departureAirportCode: replacementFlight.from,
          arrivalAirportCode: replacementFlight.to,
        }
  );

  alignedSession.manageOptions.itineraries = alignedSession.manageOptions.itineraries.map(
    (itinerary) =>
      itinerary.flightId !== currentFlightId
        ? itinerary
        : {
            ...itinerary,
            flightId: replacementFlight.flightId,
            fareId: newFareId,
            flightNumber: replacementFlight.flightNumber,
            departureTime: replacementFlight.departureTime,
            departureAirportCode: replacementFlight.from,
            arrivalAirportCode: replacementFlight.to,
          }
  );

  alignedSession.lookup.passengers = alignedSession.lookup.passengers.map((passenger) => ({
    ...passenger,
    segments: (passenger.segments ?? []).map((segment) =>
      segment.flightId !== currentFlightId
        ? segment
        : {
            ...segment,
            flightId: replacementFlight.flightId,
            seatAssigned: false,
            seatNumber: null,
            warnings: [],
          }
    ),
    selections: {
      seats: (passenger.selections?.seats ?? []).filter(
        (seat) => seat.flightId !== currentFlightId
      ),
      services: (passenger.selections?.services ?? []).filter(
        (service) => service.flightId !== currentFlightId
      ),
    },
    seatAssignments: (passenger.seatAssignments ?? []).filter(
      (seat) => seat.flightId !== currentFlightId
    ),
    serviceSelections: (passenger.serviceSelections ?? []).filter(
      (service) => service.flightId !== currentFlightId
    ),
  }));

  alignedSession.manageOptions.passengers = alignedSession.manageOptions.passengers.map(
    (passenger) => ({
      ...passenger,
      segments: (passenger.segments ?? []).map((segment) =>
        segment.flightId !== currentFlightId
          ? segment
          : {
              ...segment,
              flightId: replacementFlight.flightId,
              seatAssigned: false,
              seatNumber: null,
              warnings: [],
            }
      ),
    })
  );

  alignedSession.manageOptions.seatAssignments =
    alignedSession.manageOptions.seatAssignments.filter(
      (seat) => seat.flightId !== currentFlightId
    );
  alignedSession.manageOptions.serviceSelections =
    alignedSession.manageOptions.serviceSelections.filter(
      (service) => service.flightId !== currentFlightId
    );

  syncMockLookupPassengerSelections(alignedSession);
  return quote;
}

export function getMockReservedSeatsForFlight(
  variant: ManageBookingMockVariant,
  flightId: number
): ReadonlyMap<number, { surchargeAmount: number | null }> {
  const session = getMockManageBookingSession(variant);
  const map = new Map<number, { surchargeAmount: number | null }>();
  for (const assignment of session.manageOptions.seatAssignments) {
    if (assignment.flightId !== flightId) continue;
    map.set(assignment.seatId, { surchargeAmount: assignment.surchargeAmount });
  }
  return map;
}

function isDevLocalhostManageBooking(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isDevLocalhostTripHistory(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    (hostname === 'localhost' || hostname === '127.0.0.1') &&
    window.location.pathname.startsWith('/trips')
  );
}

function normalizeLookupToken(value: string): string {
  return value.trim().toUpperCase();
}

function resolveConfiguredMockVariant(): ManageBookingMockVariant {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const rawVariant = params.get('mockManageVariant');
    if (isManageBookingMockVariant(rawVariant)) {
      return rawVariant;
    }
  }
  return implicitMockManageBookingVariant ?? DEFAULT_IMPLICIT_MOCK_VARIANT;
}

function isMockManageBookingExplicitlyEnabled(): boolean {
  if (import.meta.env.VITE_MOCK_MANAGE_BOOKING === 'true') {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const urlFlag = params.get('mockManageBooking');
  if (urlFlag === '1' || urlFlag === 'true') {
    return true;
  }

  return useBookingStore.getState().mockManageBookingMode;
}

function resolveImplicitMockManageBookingVariant(
  payload?: BookingLookupRequest,
  bookingId?: string | number
): ManageBookingMockVariant | null {
  const normalizedRequestedPnr =
    typeof payload?.pnrCode === 'string' ? normalizeLookupToken(payload.pnrCode) : null;
  const normalizedMockLastName = foldAsciiUpper(
    DEFAULT_IMPLICIT_MOCK_LOOKUP.passengers[0]?.lastName ?? ''
  );
  const normalizedRequestedLastName =
    typeof payload?.lastName === 'string' ? foldAsciiUpper(payload.lastName) : null;
  const normalizedBookingId =
    bookingId == null ? null : typeof bookingId === 'string' ? Number(bookingId) : bookingId;

  const matchesMockLookup =
    normalizedRequestedPnr === DEFAULT_IMPLICIT_MOCK_PNR &&
    normalizedRequestedLastName === normalizedMockLastName;
  const matchesMockBookingId =
    typeof normalizedBookingId === 'number' &&
    Number.isFinite(normalizedBookingId) &&
    normalizedBookingId === DEFAULT_IMPLICIT_MOCK_LOOKUP.booking.bookingId;

  if (!matchesMockLookup && !matchesMockBookingId) {
    return null;
  }

  return implicitMockManageBookingVariant ?? DEFAULT_IMPLICIT_MOCK_VARIANT;
}

export function resolveManageBookingRouteSeed(
  bookingId?: string | number | null,
  pnrCode?: string | null
): ManageBookingRouteSeed | null {
  const normalizedBookingId =
    bookingId == null ? null : typeof bookingId === 'string' ? Number(bookingId) : bookingId;
  const normalizedPnrCode = pnrCode ? normalizeLookupToken(pnrCode) : null;

  if (Number.isFinite(normalizedBookingId)) {
    const { bookingLookup } = useBookingStore.getState();
    if (bookingLookup?.booking?.bookingId === normalizedBookingId) {
      return {
        bookingId: bookingLookup.booking.bookingId,
        pnrCode: bookingLookup.booking.pnrCode,
        lastName: bookingLookup.passengers[0]?.lastName ?? '',
        expiresAt: bookingLookup.booking.expiresAt ?? null,
        primaryFlightId: bookingLookup.itineraries[0]?.flightId ?? null,
      };
    }
  }
  void normalizedPnrCode;
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
        flightId: selection.flightId,
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

function buildMockSeatAssignmentResponse(
  session: ManageBookingMockSession
): SeatAssignmentResponse {
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
      flightId: assignment.flightId,
      seatNumber: assignment.seatNumber,
      status: assignment.status,
      surchargeAmount: assignment.surchargeAmount,
      currency: assignment.currency,
    })),
  };
}

function resolveMockSeatChangeSeatDetails(
  session: ManageBookingMockSession,
  change: SeatChangePreviewRequest['changes'][number],
  kind: 'from' | 'to'
): { seatNumber: string | null; amount: number } {
  const seatId = kind === 'from' ? change.fromSeatId : change.toSeatId;
  if (seatId == null) return { seatNumber: null, amount: 0 };

  const activeAssignment = session.manageOptions.seatAssignments.find(
    (assignment) =>
      assignment.passengerId === change.passengerId &&
      assignment.flightId === change.flightId &&
      assignment.seatId === seatId
  );
  if (activeAssignment) {
    return {
      seatNumber: activeAssignment.seatNumber,
      amount: activeAssignment.surchargeAmount,
    };
  }

  const baselineSession = createMockManageBookingSession(session.variant);
  const baselineAssignment = baselineSession.manageOptions.seatAssignments.find(
    (assignment) =>
      assignment.passengerId === change.passengerId &&
      assignment.flightId === change.flightId &&
      assignment.seatId === seatId
  );
  if (baselineAssignment) {
    return {
      seatNumber: baselineAssignment.seatNumber,
      amount: baselineAssignment.surchargeAmount,
    };
  }

  const seatContext = resolveMockSeatAssignmentContext(session, seatId);
  return {
    seatNumber: seatContext?.seatNumber ?? null,
    amount: seatContext?.surchargeAmount ?? 0,
  };
}

function buildMockSeatChangePreviewResponse(
  session: ManageBookingMockSession,
  body: SeatChangePreviewRequest
): SeatChangePreviewResponse {
  const items = body.changes.map((change) => {
    const from = resolveMockSeatChangeSeatDetails(session, change, 'from');
    const to = resolveMockSeatChangeSeatDetails(session, change, 'to');
    const passenger = session.lookup.passengers.find(
      (item) => item.passengerId === change.passengerId
    );
    const itinerary = session.lookup.itineraries.find((item) => item.flightId === change.flightId);
    const delta = to.amount - from.amount;

    return {
      passengerId: change.passengerId,
      passengerName: passenger ? `${passenger.lastName} ${passenger.firstName}`.trim() : null,
      flightId: change.flightId,
      flightNumber: itinerary?.flightNumber ?? null,
      departureAirportCode: itinerary?.departureAirportCode ?? null,
      arrivalAirportCode: itinerary?.arrivalAirportCode ?? null,
      departureTime: itinerary?.departureTime ?? null,
      fromSeatId: change.fromSeatId,
      fromSeatNumber: from.seatNumber,
      toSeatId: change.toSeatId,
      toSeatNumber: to.seatNumber,
      oldAmount: from.amount,
      newAmount: to.amount,
      delta,
      status: 'VALID',
      message: null,
    };
  });

  const additionalAmount = items.reduce((sum, item) => sum + Math.max(0, item.delta), 0);
  const refundAmount = items.reduce((sum, item) => sum + Math.max(0, -item.delta), 0);
  const netAmount = additionalAmount - refundAmount;
  const settlementType: SeatChangePreviewResponse['settlementType'] =
    netAmount > 0 ? 'COLLECT_PAYMENT' : netAmount < 0 ? 'REFUND' : 'NONE';

  return {
    bookingId: session.lookup.booking.bookingId,
    currency: session.lookup.booking.currency,
    previewToken: `seatchg_prev_${Date.now()}`,
    settlementType,
    items,
    summary: {
      additionalAmount,
      refundAmount,
      netAmount,
    },
  };
}

function buildMockServiceChangePreviewResponse(
  session: ManageBookingMockSession,
  body: ServiceChangePreviewRequest
): ServiceChangePreviewResponse {
  const currentByPassenger = new Map<number, BookingLookupServiceSelection[]>();
  for (const passenger of session.lookup.passengers) {
    currentByPassenger.set(passenger.passengerId, [
      ...(passenger.selections?.services ?? passenger.serviceSelections ?? []),
    ]);
  }

  const itineraryByFlightId = new Map(
    session.lookup.itineraries.map((itinerary) => [itinerary.flightId, itinerary])
  );
  const optionCatalogByFlightId = new Map<
    number,
    Map<
      number,
      {
        serviceId: number;
        serviceType: string;
        serviceName: string;
        name: string;
        price: number;
      }
    >
  >();
  for (const itinerary of session.manageOptions.itineraries) {
    const catalog = getMockServiceCatalogResponse(
      session.variant,
      itinerary.flightId,
      itinerary.fareId
    );
    optionCatalogByFlightId.set(
      itinerary.flightId,
      new Map(
        (catalog?.services ?? []).flatMap((service) =>
          service.options.map((option) => [
            option.optionId,
            {
              serviceId: option.serviceId,
              serviceType: option.serviceType,
              serviceName: option.serviceName,
              name: option.name,
              price: option.price,
            },
          ])
        )
      )
    );
  }

  const selectionKey = (flightId: number | null, serviceId: number | null) =>
    `${flightId ?? 'booking'}:${serviceId ?? 'unknown'}`;

  const items = body.passengers.flatMap((passenger) => {
    const currentSelections = currentByPassenger.get(passenger.passengerId) ?? [];
    const passengerView = session.lookup.passengers.find(
      (entry) => entry.passengerId === passenger.passengerId
    );
    const passengerName = passengerView
      ? [passengerView.lastName, passengerView.firstName].filter(Boolean).join(' ')
      : `Passenger ${passenger.passengerId}`;

    const currentByGroup = new Map(
      currentSelections.map((selection) => [
        selectionKey(selection.flightId ?? null, selection.serviceId ?? null),
        selection,
      ])
    );
    const requestedByGroup = new Map<
      string,
      {
        flightId: number | null;
        optionId: number;
        quantity: number;
        serviceId: number | null;
        serviceType: string | null;
        serviceName: string | null;
        optionName: string | null;
        unitPrice: number;
      }
    >();

    for (const selection of passenger.selections) {
      const flightId = selection.flightId ?? null;
      const optionDetails =
        flightId != null ? optionCatalogByFlightId.get(flightId)?.get(selection.optionId) : null;
      const fallbackCurrent =
        flightId != null
          ? (currentSelections.find(
              (entry) => entry.flightId === flightId && entry.optionId === selection.optionId
            ) ?? null)
          : (currentSelections.find((entry) => entry.optionId === selection.optionId) ?? null);
      const serviceId = optionDetails?.serviceId ?? fallbackCurrent?.serviceId ?? null;
      const groupKey = selectionKey(flightId, serviceId);

      requestedByGroup.set(groupKey, {
        flightId,
        optionId: selection.optionId,
        quantity: selection.quantity,
        serviceId,
        serviceType: optionDetails?.serviceType ?? fallbackCurrent?.serviceType ?? null,
        serviceName: optionDetails?.serviceName ?? fallbackCurrent?.serviceName ?? null,
        optionName: optionDetails?.name ?? fallbackCurrent?.optionName ?? null,
        unitPrice:
          optionDetails?.price ??
          (fallbackCurrent
            ? fallbackCurrent.price / Math.max(1, fallbackCurrent.quantity)
            : 250000),
      });
    }

    const groupKeys = new Set([...currentByGroup.keys(), ...requestedByGroup.keys()]);
    return [...groupKeys]
      .map((groupKey) => {
        const current = currentByGroup.get(groupKey) ?? null;
        const requested = requestedByGroup.get(groupKey) ?? null;
        const flightId = requested?.flightId ?? current?.flightId ?? null;
        const quantity = requested?.quantity ?? 0;
        const oldAmount = current ? current.price : 0;
        const newAmount = requested ? requested.unitPrice * requested.quantity : 0;
        const delta = newAmount - oldAmount;

        if (delta === 0 && (current?.quantity ?? 0) === quantity) {
          return null;
        }

        return {
          flightId: flightId ?? undefined,
          passengerId: passenger.passengerId,
          passengerName,
          serviceId: requested?.serviceId ?? current?.serviceId ?? null,
          serviceType: requested?.serviceType ?? current?.serviceType ?? 'SERVICE',
          serviceName: requested?.serviceName ?? current?.serviceName ?? 'Service',
          optionId: requested?.optionId ?? current?.optionId ?? null,
          optionName: requested?.optionName ?? current?.optionName ?? null,
          quantity,
          oldAmount,
          newAmount,
          delta,
          status: 'VALID',
          message:
            flightId != null && !itineraryByFlightId.has(flightId)
              ? 'Selected flight is not available in this booking.'
              : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  });

  const additionalAmount = items.reduce((sum, item) => sum + Math.max(0, item.delta), 0);
  const refundAmount = items.reduce((sum, item) => sum + Math.max(0, -item.delta), 0);
  const netAmount = additionalAmount - refundAmount;
  const settlementType: ServiceChangePreviewResponse['settlementType'] =
    netAmount > 0 ? 'COLLECT_PAYMENT' : netAmount < 0 ? 'REFUND' : 'NONE';

  return {
    bookingId: session.lookup.booking.bookingId,
    currency: session.lookup.booking.currency,
    previewToken: `svcchg_prev_${Date.now()}`,
    settlementType,
    items,
    summary: {
      additionalAmount,
      refundAmount,
      netAmount,
    },
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
          flightId: selection.flightId,
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
      const managedPassenger = manageOptions.passengers.find(
        (item) => item.passengerId === passengerId
      );
      const ticket = ticketsByFlightAndPassenger.get(`${segment.flightId}:${passengerId}`);
      const segmentState = managedPassenger?.segments?.find(
        (item) => item.flightId === segment.flightId
      );
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

  const selectedPassengers = selectedSegments.reduce(
    (sum, segment) => sum + segment.passengers.length,
    0
  );
  const readyPassengers = selectedSegments.reduce(
    (sum, segment) =>
      sum +
      segment.passengers.filter((passenger) => passenger.eligible && passenger.seat.assigned)
        .length,
    0
  );
  const blockedPassengers = selectedSegments.reduce(
    (sum, segment) => sum + segment.passengers.filter((passenger) => !passenger.eligible).length,
    0
  );
  const passengersWithoutSeat = selectedSegments.reduce(
    (sum, segment) =>
      sum +
      segment.passengers.filter((passenger) => passenger.eligible && !passenger.seat.assigned)
        .length,
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
  if (!isMockManageBookingExplicitlyEnabled()) {
    return implicitMockManageBookingVariant;
  }
  const variant = resolveConfiguredMockVariant();
  implicitMockManageBookingVariant = variant;
  return variant;
}

export function resetMockManageBookingVariant(variant: ManageBookingMockVariant): void {
  implicitMockManageBookingVariant = variant;
  mockManageBookingSessions.set(variant, cloneMock(getCommittedMockManageBookingSession(variant)));
}

export function commitMockManageBookingVariant(variant: ManageBookingMockVariant): void {
  implicitMockManageBookingVariant = variant;
  commitMockManageBookingSession(variant);
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
    implicitMockManageBookingVariant = mockVariant;
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

export async function getMyTrips(query: TripHistoryQuery = {}): Promise<TripHistoryResult> {
  if (isDevLocalhostTripHistory()) {
    return Promise.resolve(getMockTripHistoryResult(query));
  }

  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.query?.trim()) params.set('query', query.query.trim());
  if (query.fromDate) params.set('fromDate', query.fromDate);
  if (query.toDate) params.set('toDate', query.toDate);
  if (query.cursor) params.set('cursor', query.cursor);
  if (typeof query.limit === 'number') params.set('limit', String(query.limit));

  const res = await api.get<TripHistoryResult | { data?: TripHistoryResult }>(
    '/api/bookings/my-trips',
    {
      params,
    }
  );
  const raw = unwrapData(res.data) as TripHistoryResult;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items) || !raw.pageInfo) {
    throw new Error('Trip history fetch failed');
  }
  return raw;
}

export async function getTripDetail(
  bookingId: string | number,
  flightId: string | number
): Promise<TripDetailResult> {
  if (isDevLocalhostTripHistory()) {
    return Promise.resolve(getMockTripDetailResult(bookingId, flightId));
  }

  const booking = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const flight = typeof flightId === 'string' ? flightId : String(flightId);
  const res = await api.get<TripDetailResult | { data?: TripDetailResult }>(
    `/api/bookings/${booking}/trips/${flight}`
  );
  const raw = unwrapData(res.data) as TripDetailResult;
  if (
    !raw ||
    typeof raw !== 'object' ||
    !raw.booking ||
    !raw.segment ||
    !Array.isArray(raw.passengers) ||
    !raw.payment ||
    !raw.actions
  ) {
    throw new Error('Trip detail fetch failed');
  }
  return raw;
}

export async function getManageOptions(
  bookingId: string | number
): Promise<BookingManageOptionsResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(
      cloneMock(getMockCancellationPreviewResponse(mockVariant, body.ticketIds))
    );
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(
      cloneMock(getMockCancellationSelectionPreviewResponse(mockVariant, body))
    );
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

export async function quoteFlightChange(
  bookingId: string | number,
  body: FlightChangeQuoteRequest
): Promise<FlightChangeQuoteResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = ensureMockManageBookingSession(mockVariant, body.currentFlightId);
    return Promise.resolve(
      cloneMock(
        getMockFlightChangeQuoteResponse(mockVariant, body, {
          lookup: session.lookup,
          manageOptions: session.manageOptions,
        })
      )
    );
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<FlightChangeQuoteResponse | { data?: FlightChangeQuoteResponse }>(
    `/api/bookings/${id}/flight-change/quote`,
    body
  );
  const raw = unwrapData(res.data) as FlightChangeQuoteResponse;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.bookingId !== 'number' ||
    !raw.summary ||
    !Array.isArray(raw.items)
  ) {
    throw new Error('Flight change quote failed');
  }
  return raw;
}

export async function confirmFlightChange(
  bookingId: string | number,
  body: FlightChangeConfirmRequest
): Promise<FlightChangeConfirmResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    const quote = applyMockFlightChangeRequest(session, body.quoteToken);
    const currency = session.lookup.booking.currency ?? 'VND';
    const settlementType = quote.settlementType ?? 'NO_CHANGE';
    const response: FlightChangeConfirmResponse = {
      settlementId: body.expectedNetAmount > 0 ? Date.now() : null,
      bookingId: session.lookup.booking.bookingId,
      currency,
      settlementType,
      status:
        body.expectedNetAmount > 0
          ? 'PAYMENT_REQUIRED'
          : body.expectedNetAmount < 0
            ? 'REFUND_PENDING'
            : 'COMPLETED',
      refundStatus: body.expectedNetAmount < 0 ? 'SUCCEEDED' : null,
      provider: body.expectedNetAmount < 0 ? 'STRIPE' : null,
      providerRefundId: body.expectedNetAmount < 0 ? `mock_refund_${Date.now()}` : null,
      errorCode: null,
      errorMessage: null,
      refundMethod:
        body.expectedNetAmount < 0
          ? {
              type: 'CARD',
              label: 'Visa',
              maskedAccount: '**** 4242',
              estimatedDays: '3-7 business days',
            }
          : null,
      paymentMethods:
        body.expectedNetAmount > 0
          ? [
              {
                code: 'PAYOS_QR',
                label: 'Mobile Banking (VietQR)',
                provider: 'PAYOS',
                icon: null,
                supported: true,
              },
              {
                code: 'STRIPE_CARD',
                label: 'International credit or debit card',
                provider: 'STRIPE',
                icon: null,
                supported: true,
              },
            ]
          : [],
      summary: {
        additionalAmount: body.expectedAdditionalAmount,
        refundAmount: body.expectedRefundAmount,
        netAmount: body.expectedNetAmount,
      },
    };
    if (response.settlementType !== 'COLLECT_PAYMENT') {
      commitMockManageBookingSession(mockVariant);
    }
    return Promise.resolve(response);
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<FlightChangeConfirmResponse | { data?: FlightChangeConfirmResponse }>(
    `/api/bookings/${id}/flight-changes/confirm`,
    body
  );
  const raw = unwrapData(res.data) as FlightChangeConfirmResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Flight change confirmation failed');
  }
  return raw;
}

export async function previewSeatChanges(
  bookingId: string | number,
  body: SeatChangePreviewRequest
): Promise<SeatChangePreviewResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(
      cloneMock(buildMockSeatChangePreviewResponse(getMockManageBookingSession(mockVariant), body))
    );
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<SeatChangePreviewResponse | { data?: SeatChangePreviewResponse }>(
    `/api/bookings/${id}/seat-changes/preview`,
    body
  );
  const raw = unwrapData(res.data) as SeatChangePreviewResponse;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.bookingId !== 'number' ||
    !Array.isArray(raw.items)
  ) {
    throw new Error('Seat change preview failed');
  }
  return raw;
}

export async function confirmSeatChanges(
  bookingId: string | number,
  body: SeatChangeConfirmRequest
): Promise<SeatChangeConfirmResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    const preview = buildMockSeatChangePreviewResponse(session, {
      changes: body.changes,
    });
    if (preview.settlementType !== 'COLLECT_PAYMENT') {
      commitMockManageBookingSession(mockVariant);
    }
    return Promise.resolve(
      cloneMock({
        bookingId: preview.bookingId,
        currency: preview.currency,
        settlementType: preview.settlementType,
        status:
          preview.settlementType === 'COLLECT_PAYMENT'
            ? 'PAYMENT_REQUIRED'
            : preview.settlementType === 'REFUND'
              ? 'REFUND_PENDING'
              : 'COMPLETED',
        refundStatus: preview.settlementType === 'REFUND' ? 'SUCCEEDED' : null,
        provider: preview.settlementType === 'REFUND' ? 'STRIPE' : null,
        providerRefundId: preview.settlementType === 'REFUND' ? `mock_refund_${Date.now()}` : null,
        errorCode: null,
        errorMessage: null,
        refundMethod:
          preview.settlementType === 'REFUND'
            ? {
                type: 'CARD',
                label: 'Visa',
                maskedAccount: '**** 4242',
                estimatedDays: '3-7 business days',
              }
            : null,
        summary: preview.summary,
      } satisfies SeatChangeConfirmResponse)
    );
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<SeatChangeConfirmResponse | { data?: SeatChangeConfirmResponse }>(
    `/api/bookings/${id}/seat-changes/confirm`,
    body
  );
  const raw = unwrapData(res.data) as SeatChangeConfirmResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Seat change confirmation failed');
  }
  return raw;
}

export async function previewServiceChanges(
  bookingId: string | number,
  body: ServiceChangePreviewRequest
): Promise<ServiceChangePreviewResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    return Promise.resolve(
      cloneMock(
        buildMockServiceChangePreviewResponse(getMockManageBookingSession(mockVariant), body)
      )
    );
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<
    ServiceChangePreviewResponse | { data?: ServiceChangePreviewResponse }
  >(`/api/bookings/${id}/service-changes/preview`, body);
  const raw = unwrapData(res.data) as ServiceChangePreviewResponse;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.bookingId !== 'number' ||
    !Array.isArray(raw.items)
  ) {
    throw new Error('Service change preview failed');
  }
  return raw;
}

export async function confirmServiceChanges(
  bookingId: string | number,
  body: ServiceChangeConfirmRequest
): Promise<ServiceChangeConfirmResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
  if (mockVariant) {
    const session = getMockManageBookingSession(mockVariant);
    applyMockServiceChangeRequest(session, body);
    const preview = buildMockServiceChangePreviewResponse(session, { passengers: body.passengers });
    const response = cloneMock({
      settlementId: preview.settlementType === 'COLLECT_PAYMENT' ? Date.now() : null,
      bookingId: preview.bookingId,
      currency: preview.currency,
      settlementType: preview.settlementType,
      status:
        preview.settlementType === 'COLLECT_PAYMENT'
          ? 'PAYMENT_REQUIRED'
          : preview.settlementType === 'REFUND'
            ? 'REFUND_PENDING'
            : 'COMPLETED',
      refundStatus: preview.settlementType === 'REFUND' ? 'SUCCEEDED' : null,
      provider: preview.settlementType === 'REFUND' ? 'STRIPE' : null,
      providerRefundId: preview.settlementType === 'REFUND' ? `mock_refund_${Date.now()}` : null,
      errorCode: null,
      errorMessage: null,
      refundMethod:
        preview.settlementType === 'REFUND'
          ? {
              type: 'CARD',
              label: 'Visa',
              maskedAccount: '**** 4242',
              estimatedDays: '3-7 business days',
            }
          : null,
      paymentMethods:
        preview.settlementType === 'COLLECT_PAYMENT'
          ? [
              {
                code: 'PAYOS_QR',
                label: 'Mobile Banking (VietQR)',
                provider: 'PAYOS',
                icon: null,
                supported: true,
              },
              {
                code: 'STRIPE_CARD',
                label: 'International credit or debit card',
                provider: 'STRIPE',
                icon: null,
                supported: true,
              },
            ]
          : [],
      summary: preview.summary,
    } satisfies ServiceChangeConfirmResponse);
    if (response.settlementType !== 'COLLECT_PAYMENT') {
      commitMockManageBookingSession(mockVariant);
    }
    return Promise.resolve(response);
  }
  const id = typeof bookingId === 'string' ? bookingId : String(bookingId);
  const res = await api.post<
    ServiceChangeConfirmResponse | { data?: ServiceChangeConfirmResponse }
  >(`/api/bookings/${id}/service-changes/confirm`, body);
  const raw = unwrapData(res.data) as ServiceChangeConfirmResponse;
  if (!raw || typeof raw !== 'object' || typeof raw.bookingId !== 'number') {
    throw new Error('Service change confirmation failed');
  }
  return raw;
}

export async function confirmCancellation(
  bookingId: string | number,
  body: BookingCancellationConfirmRequest
): Promise<BookingCancellationConfirmResponse> {
  const mockVariant =
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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
          !(item.passengerId === assignment.passengerId && item.flightId === seatContext.flightId)
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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
    resolveMockManageBookingVariant() ??
    resolveImplicitMockManageBookingVariant(undefined, bookingId);
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

export async function confirmCheckIn(body: CheckInConfirmRequest): Promise<CheckInConfirmResponse> {
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
  getMyTrips,
  getTripDetail,
  getManageOptions,
  getBookingTickets,
  previewCancellation,
  previewCancellationBySelection,
  quoteFlightChange,
  confirmFlightChange,
  previewSeatChanges,
  confirmSeatChanges,
  previewServiceChanges,
  confirmServiceChanges,
  confirmCancellation,
  putSeatAssignments,
  deleteSeatAssignments,
  patchSeatAssignment,
  putBookingServices,
  continueCheckIn,
  confirmCheckIn,
};
