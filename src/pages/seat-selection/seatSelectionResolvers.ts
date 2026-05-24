import type {
  BookingLookupResponse,
  BookingManageOptionsResponse,
  BookingPassengerWithId,
  BookingServiceSelectionItem,
} from '../../types/booking.types';
import type { SelectedServiceOption } from '../../types/flight.types';
import type { BookingPersistedDraft, BookingSession } from '../../stores/useBookingStore';

export type SeatContext = {
  flightId: number | null;
  fareId: number | null;
  fareCode: string | null;
  segments: Array<{
    direction: 'OUTBOUND' | 'INBOUND';
    flightId: number;
    fareId: number;
    fareCode: string | null;
  }>;
};

export type PassengerLike =
  | BookingPassengerWithId
  | BookingManageOptionsResponse['passengers'][number]
  | BookingLookupResponse['passengers'][number];

export type PassengerProfileView = {
  id: string;
  fullName: string;
  seat?: string;
};

export type ResolvedSeatAssignment = {
  passengerId: number;
  seatId: number;
  flightId?: number;
  status: string;
  surchargeAmount: number;
  currency: string;
  seatNumber?: string;
};

export function pickNumericId(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function pickText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function resolveSeatContext(source: unknown): SeatContext {
  if (!source || typeof source !== 'object') {
    return {
      flightId: null,
      fareId: null,
      fareCode: null,
      segments: [],
    };
  }

  const raw = source as Record<string, unknown>;
  const selectedFareContext =
    raw.selectedFareContext && typeof raw.selectedFareContext === 'object'
      ? (raw.selectedFareContext as Record<string, unknown>)
      : null;
  const rawResponse =
    raw.raw && typeof raw.raw === 'object' ? (raw.raw as Record<string, unknown>) : null;
  const flight =
    raw.flight && typeof raw.flight === 'object'
      ? (raw.flight as Record<string, unknown>)
      : rawResponse?.flight && typeof rawResponse.flight === 'object'
        ? (rawResponse.flight as Record<string, unknown>)
        : null;
  const fare =
    raw.fare && typeof raw.fare === 'object'
      ? (raw.fare as Record<string, unknown>)
      : rawResponse?.fare && typeof rawResponse.fare === 'object'
        ? (rawResponse.fare as Record<string, unknown>)
        : null;

  const rawSegments = Array.isArray(raw.segments)
    ? raw.segments
    : Array.isArray(selectedFareContext?.segments)
      ? selectedFareContext.segments
      : [];
  const segments = rawSegments
    .map((segment) => {
      if (!segment || typeof segment !== 'object') return null;
      const record = segment as Record<string, unknown>;
      const directionRaw = String(record.direction ?? '')
        .trim()
        .toUpperCase();
      if (directionRaw !== 'OUTBOUND' && directionRaw !== 'INBOUND') return null;
      const flightId = pickNumericId(record.flightId);
      const fareId = pickNumericId(record.fareId);
      if (!flightId || !fareId) return null;
      return {
        direction: directionRaw,
        flightId,
        fareId,
        fareCode: pickText(record.fareCode),
      } as SeatContext['segments'][number];
    })
    .filter((segment): segment is SeatContext['segments'][number] => segment != null);

  const fallbackFlightId = pickNumericId(
    raw.flightId ?? selectedFareContext?.flightId ?? flight?.flightId
  );
  const fallbackFareId = pickNumericId(raw.fareId ?? selectedFareContext?.fareId ?? fare?.fareId);
  const fallbackFareCode = pickText(
    raw.fareCode ?? selectedFareContext?.fareCode ?? fare?.code ?? fare?.fareCode
  );
  const primarySegment = segments[0];
  return {
    flightId: primarySegment?.flightId ?? fallbackFlightId,
    fareId: primarySegment?.fareId ?? fallbackFareId,
    fareCode: primarySegment?.fareCode ?? fallbackFareCode,
    segments:
      segments.length > 0
        ? segments
        : fallbackFlightId && fallbackFareId
          ? [
              {
                direction: 'OUTBOUND',
                flightId: fallbackFlightId,
                fareId: fallbackFareId,
                fareCode: fallbackFareCode,
              },
            ]
          : [],
  };
}

export function resolveSeatContextFromSources(params: {
  manageOptions: BookingManageOptionsResponse | null;
  bookingResponse: BookingSession | null;
  bookingDraft: BookingPersistedDraft;
}): SeatContext {
  const { manageOptions, bookingResponse, bookingDraft } = params;
  if (manageOptions?.itineraries?.length) {
    const itinerarySegments = manageOptions.itineraries
      .map((itinerary, index) => {
        const directionRaw = String(itinerary.journeyType ?? '')
          .trim()
          .toUpperCase();
        const direction =
          directionRaw === 'INBOUND'
            ? 'INBOUND'
            : directionRaw === 'OUTBOUND'
              ? 'OUTBOUND'
              : index === 0
                ? 'OUTBOUND'
                : 'INBOUND';
        return {
          direction,
          flightId: itinerary.flightId,
          fareId: itinerary.fareId,
          fareCode: itinerary.fareName ?? null,
        } as SeatContext['segments'][number];
      })
      .filter((segment) => segment.flightId && segment.fareId);
    const primarySegment = itinerarySegments[0];
    return {
      flightId: primarySegment?.flightId ?? null,
      fareId: primarySegment?.fareId ?? null,
      fareCode: primarySegment?.fareCode ?? null,
      segments: itinerarySegments,
    };
  }
  const responseContext = resolveSeatContext(bookingResponse);
  const draftContext = resolveSeatContext(bookingDraft);
  const responseHasSegments = responseContext.segments.length > 1;
  const draftHasSegments = draftContext.segments.length > 1;

  if (responseHasSegments) return responseContext;

  if (draftHasSegments) {
    const selectedResponseSegment =
      draftContext.segments.find((segment) => segment.flightId === responseContext.flightId) ??
      draftContext.segments[0];
    return {
      flightId: selectedResponseSegment?.flightId ?? responseContext.flightId,
      fareId: selectedResponseSegment?.fareId ?? responseContext.fareId,
      fareCode: selectedResponseSegment?.fareCode ?? responseContext.fareCode,
      segments: draftContext.segments,
    };
  }

  if (responseContext.flightId && responseContext.fareId) return responseContext;
  return draftContext;
}

export function resolveStorePassengerId(
  passenger:
    | BookingPassengerWithId
    | BookingManageOptionsResponse['passengers'][number]
    | BookingLookupResponse['passengers'][number]
    | { passengerId?: number | null; id?: number | null }
    | undefined
    | null
): number | null {
  if (!passenger) return null;
  const raw = passenger as { passengerId?: number | null; id?: number | null };
  return pickNumericId(raw.passengerId) ?? pickNumericId(raw.id);
}

export function resolveManageBookingId(params: {
  manageOptions: BookingManageOptionsResponse | null;
  bookingLookup: BookingLookupResponse | null;
  bookingResponse: BookingSession | null;
  preferManageBooking?: boolean;
}): number | null {
  if (params.preferManageBooking === false) {
    return pickNumericId(params.bookingResponse?.bookingId);
  }
  return pickNumericId(
    params.manageOptions?.bookingId ??
      params.bookingLookup?.booking?.bookingId ??
      params.bookingResponse?.bookingId
  );
}

function toPassengerProfile(
  passenger:
    | BookingPassengerWithId
    | BookingManageOptionsResponse['passengers'][number]
    | BookingLookupResponse['passengers'][number],
  index: number,
  seat?: string
): PassengerProfileView {
  return {
    id: String(index + 1),
    fullName: [passenger.lastName, passenger.firstName].filter(Boolean).join(' ').trim(),
    seat: seat ?? undefined,
  };
}

export function resolvePassengerDisplayData(params: {
  isManageBookingFlow: boolean;
  bookingResponse: BookingSession | null;
  bookingLookup: BookingLookupResponse | null;
  manageOptions: BookingManageOptionsResponse | null;
  navigationPassengers: PassengerProfileView[] | null;
}): {
  passengers: PassengerProfileView[];
  passengerSource: PassengerLike[];
} {
  const {
    isManageBookingFlow,
    bookingResponse,
    bookingLookup,
    manageOptions,
    navigationPassengers,
  } = params;
  const storePassengers = bookingResponse?.passengers?.length
    ? bookingResponse.passengers.map((passenger, index) => toPassengerProfile(passenger, index))
    : null;
  const managePassengers = manageOptions?.passengers?.length
    ? manageOptions.passengers.map((passenger, index) =>
        toPassengerProfile(
          passenger,
          index,
          manageOptions.seatAssignments.find(
            (assignment) => assignment.passengerId === passenger.passengerId
          )?.seatNumber
        )
      )
    : null;
  const lookupPassengers = bookingLookup?.passengers?.length
    ? bookingLookup.passengers.map((passenger, index) =>
        toPassengerProfile(
          passenger,
          index,
          (passenger.selections?.seats ?? passenger.seatAssignments ?? [])[0]?.seatNumber
        )
      )
    : null;

  return {
    passengers: isManageBookingFlow
      ? (managePassengers ?? lookupPassengers ?? [])
      : (storePassengers ?? navigationPassengers ?? []),
    passengerSource: isManageBookingFlow
      ? (manageOptions?.passengers ?? bookingLookup?.passengers ?? [])
      : (bookingResponse?.passengers ?? []),
  };
}

export function resolveConfirmedSeatAssignments(params: {
  bookingResponse: BookingSession | null;
  manageOptions: BookingManageOptionsResponse | null;
}): ResolvedSeatAssignment[] {
  const { bookingResponse, manageOptions } = params;
  if (bookingResponse?.lastSeatAssignment?.assignments?.length) {
    return bookingResponse.lastSeatAssignment.assignments.map((assignment) => ({
      passengerId: assignment.passengerId,
      seatId: assignment.seatId,
      flightId: assignment.flightId,
      status: assignment.status,
      surchargeAmount: assignment.surchargeAmount,
      currency: assignment.currency,
      seatNumber: assignment.seatNumber,
    }));
  }

  return (manageOptions?.seatAssignments ?? []).map((assignment) => ({
    passengerId: assignment.passengerId,
    seatId: assignment.seatId,
    flightId: assignment.flightId,
    status: assignment.status,
    surchargeAmount: assignment.surchargeAmount,
    currency: assignment.currency,
    seatNumber: assignment.seatNumber,
  }));
}

export function buildConfirmedServicesLookupFromManageOptions(
  manageOptions:
    | {
        serviceSelections?: Array<{
          passengerId: number;
          optionId: number | null;
          quantity: number;
        }>;
      }
    | null
    | undefined
): Record<number, { optionId: number; quantity: number }[]> {
  const next: Record<number, { optionId: number; quantity: number }[]> = {};
  for (const selection of manageOptions?.serviceSelections ?? []) {
    if (!selection.optionId) continue;
    const passengerSelections = next[selection.passengerId] ?? [];
    passengerSelections.push({
      optionId: selection.optionId,
      quantity:
        Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
    });
    next[selection.passengerId] = passengerSelections;
  }
  return next;
}

export function resolveConfirmedServicesSource(params: {
  bookingResponse: BookingSession | null;
  manageOptions: BookingManageOptionsResponse | null;
}): Record<number, { optionId: number; quantity: number }[] | BookingServiceSelectionItem[]> {
  return (
    params.bookingResponse?.confirmedServicesByPassengerId ??
    buildConfirmedServicesLookupFromManageOptions(params.manageOptions)
  );
}

export function createSelectedServicesLookup(
  services: { options?: SelectedServiceOption[] }[] | undefined
): Map<number, SelectedServiceOption> {
  const lookup = new Map<number, SelectedServiceOption>();
  for (const service of services ?? []) {
    for (const option of service.options ?? []) {
      lookup.set(option.optionId, option);
    }
  }
  return lookup;
}
