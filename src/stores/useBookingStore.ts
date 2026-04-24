import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  BookingContactPayload,
  BookingCreateResponse,
  BookingPassengerPayload,
} from '../types/booking.types';
import type {
  FlightRevalidateFareResponse,
  FlightRevalidatePassengerSummary,
  FlightRevalidatePricing,
} from '../types/flight.types';

export interface BookingPersistedDraft {
  revalidateId: string | null;
  expiresAt: number | null;
  flightId: number | null;
  fareId: number | null;
  fareCode: string | null;
  passengerSummary: FlightRevalidatePassengerSummary | null;
  pricing: FlightRevalidatePricing | null;
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
  contacts: BookingContactPayload[];
  passengers: BookingPassengerPayload[];
  raw: BookingCreateResponse;
}

interface BookingStore {
  bookingDraft: BookingPersistedDraft;
  bookingResponse: BookingSession | null;
  setRevalidationDraft: (data: FlightRevalidateFareResponse) => void;
  setBookingRequestDraft: (data: {
    contacts: BookingContactPayload[];
    passengers: BookingPassengerPayload[];
  }) => void;
  setBookingResponse: (data: BookingCreateResponse) => void;
  clearBooking: () => void;
  isRevalidateExpired: () => boolean;
}

const initialDraftState: BookingPersistedDraft = {
  revalidateId: null,
  expiresAt: null,
  flightId: null,
  fareId: null,
  fareCode: null,
  passengerSummary: null,
  pricing: null,
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
    raw: data,
  };
}

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      bookingDraft: initialDraftState,
      bookingResponse: null,
      setRevalidationDraft: (data) =>
        set((state) => ({
          bookingDraft: {
            ...state.bookingDraft,
            revalidateId: data.revalidateId,
            expiresAt: Date.now() + data.expiresInSeconds * 1000,
            flightId: data.flightId,
            fareId: data.fareId,
            passengerSummary: data.passengerSummary,
            pricing: data.pricing,
          },
          bookingResponse: null,
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
      clearBooking: () =>
        set({
          bookingDraft: initialDraftState,
          bookingResponse: null,
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
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            bookingDraft: initialDraftState,
            bookingResponse: null,
          };
        }

        const state = persistedState as Partial<BookingStore>;
        return {
          bookingDraft: state.bookingDraft ?? initialDraftState,
          bookingResponse: state.bookingResponse ?? null,
        };
      },
    }
  )
);
