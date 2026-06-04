import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  BookingLookupResponse,
  BookingManageOptionsResponse,
  BookingContactPayload,
  BookingContactWithId,
  BookingCreateResponse,
  BookingPassengerPayload,
  BookingPassengerWithId,
  BookingServiceSelectionItem,
  PutBookingServicesResponse,
  SeatAssignmentResponse,
} from '../types/booking.types';
import type {
  FlightItinerarySegmentDirection,
  FlightRevalidateFareResponse,
  FlightRevalidateItineraryResponse,
  FlightRevalidatePassengerSummary,
  FlightRevalidatePricing,
} from '../types/flight.types';

export interface BookingDraftSegment {
  direction: FlightItinerarySegmentDirection;
  flightId: number;
  fareId: number;
  fareCode: string | null;
  cabinClass: string | null;
  pricing: FlightRevalidatePricing | null;
}

export interface BookingPersistedDraft {
  revalidateId: string | null;
  expiresAt: number | null;
  tripType: 'ONE_WAY' | 'ROUND_TRIP';
  promoCode: string | null;
  flightId: number | null;
  fareId: number | null;
  fareCode: string | null;
  segments: BookingDraftSegment[];
  passengerSummary: FlightRevalidatePassengerSummary | null;
  pricing: FlightRevalidatePricing | null;
  originPath: string | null;
  contacts: BookingContactPayload[];
  passengers: BookingPassengerPayload[];
}

export interface BookingSession {
  bookingId: string | number | null;
  bookingCode: string | null;
  flightId: number | null;
  fareId: number | null;
  fareCode: string | null;
  pricing: FlightRevalidatePricing | null;
  passengerSummary: FlightRevalidatePassengerSummary | null;
  contacts: BookingContactWithId[];
  passengers: BookingPassengerWithId[];
  confirmedServicesByPassengerId: Record<number, BookingServiceSelectionItem[]>;
  /** Last successful `PUT /api/bookings/{id}/services` (full response). */
  lastServicesResult: PutBookingServicesResponse | null;
  /** Last successful `PUT /api/bookings/{id}/seat-assignments` — used to lock seats on the map. */
  lastSeatAssignment: SeatAssignmentResponse | null;
  raw: BookingCreateResponse;
}

export interface BookingLookupCriteria {
  pnrCode: string;
  lastName: string;
}

interface BookingStore {
  bookingDraft: BookingPersistedDraft;
  bookingResponse: BookingSession | null;
  bookingLookup: BookingLookupResponse | null;
  lookupCriteria: BookingLookupCriteria | null;
  manageOptions: BookingManageOptionsResponse | null;
  /**
   * When the page boots with `?mockManageBooking=1`, ManageBooking sets this
   * flag so downstream pages know they are looking at fixture data. Lives
   * outside `partialize` so it is purely in-memory and resets on full reload
   * back into the real flow.
   */
  mockManageBookingMode: boolean;
  setMockManageBookingMode: (enabled: boolean) => void;
  setLookupCriteria: (data: BookingLookupCriteria | null) => void;
  setBookingLookup: (data: BookingLookupResponse) => void;
  setManageOptions: (data: BookingManageOptionsResponse | null) => void;
  setRevalidationDraft: (
    data: FlightRevalidateFareResponse | FlightRevalidateItineraryResponse,
    options?: { originPath?: string | null }
  ) => void;
  setBookingRequestDraft: (data: {
    contacts: BookingContactPayload[];
    passengers: BookingPassengerPayload[];
  }) => void;
  setBookingResponse: (data: BookingCreateResponse) => void;
  applySeatAssignmentResult: (
    data: SeatAssignmentResponse,
    replacedPassengerIds?: number[],
    flightId?: number | null
  ) => void;
  applyServicesAssignmentResult: (
    data: PutBookingServicesResponse,
    submittedPassengerIds: number[],
    flightId?: number | null
  ) => void;
  clearBooking: () => void;
  isRevalidateExpired: () => boolean;
}

const initialDraftState: BookingPersistedDraft = {
  revalidateId: null,
  expiresAt: null,
  tripType: 'ONE_WAY',
  promoCode: null,
  flightId: null,
  fareId: null,
  fareCode: null,
  segments: [],
  passengerSummary: null,
  pricing: null,
  originPath: null,
  contacts: [],
  passengers: [],
};

function pickNumericId(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function pickText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeDraftSegmentsFromRevalidate(
  data: FlightRevalidateFareResponse | FlightRevalidateItineraryResponse
): BookingDraftSegment[] {
  if ('segments' in data && Array.isArray(data.segments) && data.segments.length > 0) {
    return data.segments
      .map((segment) => ({
        direction: segment.direction,
        flightId: segment.flightId,
        fareId: segment.fareId,
        fareCode: segment.fareCode ?? null,
        cabinClass: segment.cabinClass ?? null,
        pricing: 'pricing' in segment ? (segment.pricing ?? null) : null,
      }))
      .filter((segment) => Number.isFinite(segment.flightId) && Number.isFinite(segment.fareId));
  }
  if ('flightId' in data && 'fareId' in data) {
    return [
      {
        direction: 'OUTBOUND',
        flightId: data.flightId,
        fareId: data.fareId,
        fareCode: null,
        cabinClass: null,
        pricing: 'pricing' in data ? data.pricing : null,
      },
    ];
  }
  return [];
}

function mergeSessionPricingFromTotal(
  bookingResponse: BookingSession,
  totalAmount: number
): Pick<BookingSession, 'pricing' | 'raw'> | null {
  if (!bookingResponse.pricing) return null;
  const nextPricing = {
    ...bookingResponse.pricing,
    discountedTotalPrice: totalAmount,
  };
  return {
    pricing: nextPricing,
    raw: bookingResponse.raw
      ? {
          ...bookingResponse.raw,
          pricing: bookingResponse.raw.pricing
            ? { ...bookingResponse.raw.pricing, discountedTotalPrice: totalAmount }
            : nextPricing,
        }
      : bookingResponse.raw,
  };
}

function mergeConfirmedServicesByPassengerId(
  previous: Record<number, BookingServiceSelectionItem[]>,
  data: PutBookingServicesResponse,
  submittedPassengerIds: number[],
  flightId?: number | null
): Record<number, BookingServiceSelectionItem[]> {
  const next = { ...previous };

  for (const passengerId of submittedPassengerIds) {
    const existing = next[passengerId] ?? [];
    next[passengerId] =
      flightId != null ? existing.filter((selection) => selection.flightId !== flightId) : [];
  }

  for (const passenger of data.passengers ?? []) {
    const existing = next[passenger.passengerId] ?? [];
    next[passenger.passengerId] =
      flightId != null
        ? [
            ...existing.filter((selection) => selection.flightId !== flightId),
            ...(passenger.selections ?? []).map((selection) => ({ ...selection, flightId })),
          ]
        : (passenger.selections ?? []);
  }

  return next;
}

function normalizeBookingResponse(
  currentDraft: BookingPersistedDraft,
  data: BookingCreateResponse
): BookingSession {
  const raw = data as Record<string, unknown>;
  const booking = data.booking;
  const flight = data.flight;
  const fare = data.fare;

  return {
    bookingId: booking?.bookingId ?? data.bookingId ?? data.id ?? null,
    bookingCode:
      booking?.pnrCode ??
      booking?.bookingCode ??
      booking?.pnr ??
      data.bookingCode ??
      data.pnr ??
      null,
    flightId: pickNumericId(flight?.flightId ?? raw.flightId) ?? currentDraft.flightId,
    fareId: pickNumericId(fare?.fareId ?? raw.fareId) ?? currentDraft.fareId,
    fareCode: pickText(fare?.code ?? fare?.fareCode ?? raw.fareCode) ?? currentDraft.fareCode,
    pricing: data.pricing ?? currentDraft.pricing,
    passengerSummary: data.passengerSummary ?? currentDraft.passengerSummary,
    contacts: data.contacts?.length ? data.contacts : currentDraft.contacts,
    passengers: data.passengers?.length ? data.passengers : currentDraft.passengers,
    confirmedServicesByPassengerId: {},
    lastServicesResult: null,
    lastSeatAssignment: null,
    raw: data,
  };
}

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      bookingDraft: initialDraftState,
      bookingResponse: null,
      bookingLookup: null,
      lookupCriteria: null,
      manageOptions: null,
      mockManageBookingMode: false,
      setMockManageBookingMode: (enabled) => set({ mockManageBookingMode: enabled }),
      setLookupCriteria: (data) => set({ lookupCriteria: data }),
      setBookingLookup: (data) => set({ bookingLookup: data }),
      setManageOptions: (data) => set({ manageOptions: data }),
      setRevalidationDraft: (data, options) =>
        set((state) => ({
          bookingResponse: null,
          bookingLookup: null,
          lookupCriteria: null,
          manageOptions: null,
          bookingDraft: {
            ...state.bookingDraft,
            revalidateId: data.revalidateId,
            expiresAt: Date.now() + data.expiresInSeconds * 1000,
            tripType: 'tripType' in data ? data.tripType : 'ONE_WAY',
            promoCode:
              typeof data.promoCode === 'string' && data.promoCode.trim()
                ? data.promoCode.trim()
                : null,
            flightId:
              'flightId' in data
                ? data.flightId
                : (data.segments?.find((segment) => segment.direction === 'OUTBOUND')?.flightId ??
                  data.segments?.[0]?.flightId ??
                  null),
            fareId:
              'fareId' in data
                ? data.fareId
                : (data.segments?.find((segment) => segment.direction === 'OUTBOUND')?.fareId ??
                  data.segments?.[0]?.fareId ??
                  null),
            fareCode:
              'segments' in data
                ? (data.segments?.find((segment) => segment.direction === 'OUTBOUND')?.fareCode ??
                  data.segments?.[0]?.fareCode ??
                  null)
                : null,
            segments: normalizeDraftSegmentsFromRevalidate(data),
            passengerSummary: data.passengerSummary,
            pricing: data.pricing,
            originPath: options?.originPath ?? state.bookingDraft.originPath,
          },
        })),
      setBookingRequestDraft: (data) =>
        set((state) => ({
          bookingDraft: {
            ...state.bookingDraft,
            contacts: data.contacts,
            passengers: data.passengers,
          },
        })),
      setBookingResponse: (data) =>
        set((state) => ({
          bookingResponse: normalizeBookingResponse(state.bookingDraft, data),
        })),
      applySeatAssignmentResult: (data, _replacedPassengerIds = [], _flightId = null) =>
        set((state) => {
          const { bookingResponse } = state;
          if (!bookingResponse) return state;
          const merged = mergeSessionPricingFromTotal(bookingResponse, data.totalAmount);
          if (!merged) {
            return {
              bookingResponse: {
                ...bookingResponse,
                lastSeatAssignment: data,
              },
            };
          }
          return {
            bookingResponse: {
              ...bookingResponse,
              ...merged,
              lastSeatAssignment: data,
            },
          };
        }),
      applyServicesAssignmentResult: (data, submittedPassengerIds, flightId = null) =>
        set((state) => {
          const { bookingResponse } = state;
          if (!bookingResponse) return state;
          const merged = mergeSessionPricingFromTotal(bookingResponse, data.totalAmount);
          if (!merged) return state;
          return {
            bookingResponse: {
              ...bookingResponse,
              ...merged,
              confirmedServicesByPassengerId: mergeConfirmedServicesByPassengerId(
                bookingResponse.confirmedServicesByPassengerId,
                data,
                submittedPassengerIds,
                flightId
              ),
              lastServicesResult: data,
            },
          };
        }),
      clearBooking: () =>
        set({
          bookingDraft: initialDraftState,
          bookingResponse: null,
          bookingLookup: null,
          lookupCriteria: null,
          manageOptions: null,
        }),
      isRevalidateExpired: () => {
        const expiresAt = get().bookingDraft.expiresAt;
        return !expiresAt || Date.now() >= expiresAt;
      },
    }),
    {
      name: 'airline-booking-fe:booking:v1',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        bookingDraft: state.bookingDraft,
        bookingResponse: state.bookingResponse,
        bookingLookup: state.bookingLookup,
        lookupCriteria: state.lookupCriteria,
        manageOptions: state.manageOptions,
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            bookingDraft: initialDraftState,
            bookingResponse: null,
            bookingLookup: null,
            lookupCriteria: null,
            manageOptions: null,
          };
        }

        const state = persistedState as Partial<BookingStore>;
        return {
          bookingDraft: state.bookingDraft
            ? {
                ...initialDraftState,
                ...state.bookingDraft,
                tripType: state.bookingDraft.tripType ?? 'ONE_WAY',
                promoCode: state.bookingDraft.promoCode ?? null,
                originPath: state.bookingDraft.originPath ?? null,
                segments:
                  state.bookingDraft.segments && state.bookingDraft.segments.length > 0
                    ? state.bookingDraft.segments
                    : state.bookingDraft.flightId && state.bookingDraft.fareId
                      ? [
                          {
                            direction: 'OUTBOUND',
                            flightId: state.bookingDraft.flightId,
                            fareId: state.bookingDraft.fareId,
                            fareCode: state.bookingDraft.fareCode ?? null,
                            cabinClass: null,
                            pricing: state.bookingDraft.pricing,
                          },
                        ]
                      : [],
              }
            : initialDraftState,
          bookingResponse: state.bookingResponse
            ? {
                ...state.bookingResponse,
                confirmedServicesByPassengerId:
                  state.bookingResponse.confirmedServicesByPassengerId ?? {},
                lastServicesResult: state.bookingResponse.lastServicesResult ?? null,
                lastSeatAssignment: state.bookingResponse.lastSeatAssignment ?? null,
              }
            : null,
          bookingLookup: state.bookingLookup ?? null,
          lookupCriteria: state.lookupCriteria ?? null,
          manageOptions: state.manageOptions ?? null,
        };
      },
    }
  )
);
