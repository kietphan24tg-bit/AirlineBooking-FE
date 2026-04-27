import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Armchair, ChevronRight, LuggageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type {
  BookingPassengerWithId,
  BookingServiceSelectionInput,
  PassengerBookingDetails,
  PassengerInfoNavigationState,
  PassengerProfile,
} from '../types/booking.types';
import type { SeatMapCell, SelectedServiceOption, ServiceGroup } from '../types/flight.types';
import SiteHeader from '../components/layout/SiteHeader';
import BookingStepper from '../components/booking/BookingStepper';
import SiteFooter from '../components/layout/SiteFooter';
import AircraftSeatsMap, { type SeatSelectionValue } from '../components/booking/AircraftSeatsMap';
import AdditionalService from '../components/booking/AdditionalService';
import { useBookingStore } from '../stores/useBookingStore';
import { bookingService } from '../services/booking.service';
import { flightService } from '../services/flight.service';

const MOCK_PASSENGERS: PassengerProfile[] = [
  { id: '1', fullName: 'Arthur Wellesley', seat: '2A' },
  { id: '2', fullName: 'Jane Austen', seat: undefined },
];

type SeatContext = {
  flightId: number | null;
  fareId: number | null;
  fareCode: string | null;
};

type ServiceSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ServicesByPassengerId = Record<number, SelectedServiceOption[]>;
type ServiceSaveStatusByPassengerId = Record<number, ServiceSaveStatus>;

function passengersFromNavigationState(
  list: PassengerBookingDetails[] | undefined
): PassengerProfile[] | null {
  if (!list?.length) return null;
  return list.map((p, i) => ({
    id: String(i + 1),
    fullName: [p.lastName, p.firstName].filter(Boolean).join(' ').trim(),
    seat: undefined,
  }));
}

function pickNumericId(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function resolveSeatContext(source: unknown): SeatContext {
  if (!source || typeof source !== 'object') {
    return {
      flightId: null,
      fareId: null,
      fareCode: null,
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

  return {
    flightId: pickNumericId(raw.flightId ?? selectedFareContext?.flightId ?? flight?.flightId),
    fareId: pickNumericId(raw.fareId ?? selectedFareContext?.fareId ?? fare?.fareId),
    fareCode:
      typeof (raw.fareCode ?? selectedFareContext?.fareCode ?? fare?.code ?? fare?.fareCode) ===
      'string'
        ? String(raw.fareCode ?? selectedFareContext?.fareCode ?? fare?.code ?? fare?.fareCode)
        : null,
  };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('vi-VN')} ${currency}`;
  }
}

function normalizeSeatPriceText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().replace(/^\+\s*/, '');
}

function findSeatCellById(
  rows: { cells: SeatMapCell[] }[] | undefined,
  seatId: number | null
): SeatMapCell | null {
  if (!rows?.length || !seatId) return null;
  for (const row of rows) {
    const seat = row.cells.find((cell) => cell.seatId === seatId);
    if (seat) return seat;
  }
  return null;
}

function resolveStorePassengerId(passenger: BookingPassengerWithId | undefined): number | null {
  if (!passenger) return null;
  return pickNumericId(passenger.passengerId) ?? pickNumericId(passenger.id);
}

function buildSelectionsFromSelectedServices(
  services: SelectedServiceOption[]
): BookingServiceSelectionInput[] {
  const byOption = new Map<number, number>();
  for (const s of services) {
    byOption.set(s.optionId, (byOption.get(s.optionId) ?? 0) + 1);
  }
  return Array.from(byOption.entries()).map(([optionId, quantity]) => ({ optionId, quantity }));
}

function createSelectedServicesLookup(
  services: ServiceGroup[] | undefined
): Map<number, SelectedServiceOption> {
  const lookup = new Map<number, SelectedServiceOption>();
  for (const service of services ?? []) {
    for (const option of service.options ?? []) {
      lookup.set(option.optionId, option);
    }
  }
  return lookup;
}

function hydrateServicesByPassengerId(
  services: ServiceGroup[] | undefined,
  confirmedServicesByPassengerId: Record<number, { optionId: number; quantity: number }[]>
): ServicesByPassengerId {
  const optionLookup = createSelectedServicesLookup(services);
  const next: ServicesByPassengerId = {};

  for (const [passengerIdText, selections] of Object.entries(confirmedServicesByPassengerId)) {
    const passengerId = Number(passengerIdText);
    if (!Number.isFinite(passengerId)) continue;
    const hydrated: SelectedServiceOption[] = [];

    for (const selection of selections) {
      const option = optionLookup.get(selection.optionId);
      if (!option) continue;
      const quantity =
        Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1;
      for (let index = 0; index < quantity; index += 1) {
        hydrated.push(option);
      }
    }

    next[passengerId] = hydrated;
  }

  return next;
}

function createInitialServiceStatusMap(
  confirmedServicesByPassengerId: Record<number, unknown>
): ServiceSaveStatusByPassengerId {
  const next: ServiceSaveStatusByPassengerId = {};
  for (const passengerIdText of Object.keys(confirmedServicesByPassengerId)) {
    const passengerId = Number(passengerIdText);
    if (!Number.isFinite(passengerId)) continue;
    next[passengerId] = 'saved';
  }
  return next;
}

function getServiceStatusLabel(status: ServiceSaveStatus): string {
  if (status === 'saved') return 'Da luu';
  if (status === 'saving') return 'Dang luu';
  if (status === 'error') return 'Loi';
  return 'Chua luu';
}

function getBookingSessionExpiredMessage(error: unknown): string | null {
  const status =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response
      ? error.response.status
      : null;

  return status === 409 ? 'Your booking session has expired.\nPlease search again.' : null;
}

export default function SeatSelection() {
  const location = useLocation();
  const bookingDraft = useBookingStore((state) => state.bookingDraft);
  const bookingResponse = useBookingStore((state) => state.bookingResponse);
  const applySeatAssignmentResult = useBookingStore((state) => state.applySeatAssignmentResult);
  const applyServicesAssignmentResult = useBookingStore(
    (state) => state.applyServicesAssignmentResult
  );
  const navPassengers = passengersFromNavigationState(
    (location.state as Partial<PassengerInfoNavigationState> | null)?.passengers
  );
  const storePassengers = bookingResponse?.passengers?.length
    ? bookingResponse.passengers.map((passenger, index) => ({
        id: String(index + 1),
        fullName: [passenger.lastName, passenger.firstName].filter(Boolean).join(' ').trim(),
        seat: undefined,
      }))
    : null;
  const passengers = storePassengers ?? navPassengers ?? MOCK_PASSENGERS;

  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);
  const [isSeatSelecting, setIsSeatSelecting] = useState(true);
  const [isServiceSelecting, setIsServiceSelecting] = useState(false);
  const [servicesByPassengerId, setServicesByPassengerId] = useState<ServicesByPassengerId>({});
  const [serviceSaveStatusByPassengerId, setServiceSaveStatusByPassengerId] =
    useState<ServiceSaveStatusByPassengerId>(() =>
      createInitialServiceStatusMap(bookingResponse?.confirmedServicesByPassengerId ?? {})
    );
  const hydratedPassengersRef = useRef<Set<number>>(new Set());
  const assignInFlight = useRef(false);

  useEffect(() => {
    if (activePassengerIndex >= passengers.length) {
      setActivePassengerIndex(0);
    }
  }, [activePassengerIndex, passengers.length]);

  const seatContext = useMemo(() => {
    const responseContext = resolveSeatContext(bookingResponse);
    if (responseContext.flightId && responseContext.fareId) return responseContext;
    return resolveSeatContext(bookingDraft);
  }, [bookingDraft, bookingResponse]);
  const canLoadSeatMap = isSeatSelecting && !!seatContext.flightId && !!seatContext.fareId;
  const canLoadServices = isServiceSelecting && !!seatContext.flightId && !!seatContext.fareId;

  const activePassenger = bookingResponse?.passengers?.[activePassengerIndex];
  const activePassengerId = useMemo(
    () => resolveStorePassengerId(activePassenger),
    [activePassenger]
  );

  const assignSeatMutation = useMutation({
    mutationFn: (vars: { bookingId: string | number; passengerId: number; seatId: number }) =>
      bookingService.putSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: (data) => {
      applySeatAssignmentResult(data);
      toast.success('Da xac nhan ghe ngoi.');
    },
    onError: (error) => {
      toast.error(
        getBookingSessionExpiredMessage(error) ??
          (error instanceof Error ? error.message : 'Khong the gan ghe. Vui long thu lai.')
      );
    },
  });

  const cancelSeatMutation = useMutation({
    mutationFn: (vars: { bookingId: string | number; passengerId: number; seatId: number }) =>
      bookingService.deleteSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: (data) => {
      applySeatAssignmentResult(data);
      toast.success('Da huy ghe ngoi.');
    },
    onError: (error) => {
      toast.error(
        getBookingSessionExpiredMessage(error) ??
          (error instanceof Error ? error.message : 'Khong the huy ghe. Vui long thu lai.')
      );
    },
  });

  const servicesMutation = useMutation({
    mutationFn: (vars: {
      bookingId: string | number;
      passengerId: number;
      selections: BookingServiceSelectionInput[];
    }) =>
      bookingService.putBookingServices(vars.bookingId, {
        passengers: [{ passengerId: vars.passengerId, selections: vars.selections }],
      }),
  });

  const assignedSeatMetaBySeatId = useMemo(() => {
    const assignments = bookingResponse?.lastSeatAssignment?.assignments;
    if (!assignments?.length) return new Map<number, { label: string; isYours: boolean }>();
    const next = new Map<number, { label: string; isYours: boolean }>();
    const pax = bookingResponse?.passengers ?? [];
    for (const a of assignments) {
      if (a.seatId == null || a.seatId <= 0) continue;
      const idx = pax.findIndex((p) => resolveStorePassengerId(p) === a.passengerId);
      const label = idx >= 0 ? `Da chon (HK ${idx + 1})` : 'Da chon';
      const isYours = activePassengerId != null && a.passengerId === activePassengerId;
      next.set(a.seatId, { label, isYours });
    }
    return next;
  }, [bookingResponse?.lastSeatAssignment, bookingResponse?.passengers, activePassengerId]);

  const seatMapQuery = useQuery({
    queryKey: ['seat-map', seatContext.flightId, seatContext.fareId],
    queryFn: () =>
      flightService.getSeatMap(seatContext.flightId as number, seatContext.fareId as number),
    enabled: canLoadSeatMap,
    staleTime: 60_000,
  });

  const servicesQuery = useQuery({
    queryKey: ['services', seatContext.flightId, seatContext.fareId],
    queryFn: () =>
      flightService.getServices(seatContext.flightId as number, seatContext.fareId as number),
    enabled: canLoadServices,
    staleTime: 60_000,
  });

  useEffect(() => {
    const confirmedServicesByPassengerId = bookingResponse?.confirmedServicesByPassengerId ?? {};
    if (
      !servicesQuery.data?.services?.length ||
      !Object.keys(confirmedServicesByPassengerId).length
    ) {
      return;
    }

    const hydratedServices = hydrateServicesByPassengerId(
      servicesQuery.data.services,
      confirmedServicesByPassengerId
    );

    if (!Object.keys(hydratedServices).length) {
      return;
    }

    setServicesByPassengerId((current) => {
      let changed = false;
      const next = { ...current };

      for (const [passengerIdText, services] of Object.entries(hydratedServices)) {
        const passengerId = Number(passengerIdText);
        if (!Number.isFinite(passengerId) || hydratedPassengersRef.current.has(passengerId)) {
          continue;
        }
        next[passengerId] = services;
        hydratedPassengersRef.current.add(passengerId);
        changed = true;
      }

      return changed ? next : current;
    });

    setServiceSaveStatusByPassengerId((current) => {
      const next = { ...current };
      let changed = false;

      for (const passengerIdText of Object.keys(confirmedServicesByPassengerId)) {
        const passengerId = Number(passengerIdText);
        if (!Number.isFinite(passengerId) || next[passengerId] === 'saved') continue;
        next[passengerId] = 'saved';
        changed = true;
      }

      return changed ? next : current;
    });
  }, [bookingResponse?.confirmedServicesByPassengerId, servicesQuery.data?.services]);

  const activePassengerServices = activePassengerId
    ? (servicesByPassengerId[activePassengerId] ?? [])
    : [];
  const activePassengerServiceStatus =
    activePassengerId != null
      ? (serviceSaveStatusByPassengerId[activePassengerId] ?? 'idle')
      : 'idle';
  const pricing = bookingResponse?.pricing ?? bookingDraft.pricing;
  const serviceCurrency =
    activePassengerServices[0]?.currency ??
    servicesQuery.data?.currency ??
    pricing?.currency ??
    'VND';
  const totalServicePrice = activePassengerServices.reduce(
    (total, service) => total + service.price,
    0
  );
  const totalPriceLabel = pricing
    ? formatMoney(pricing.discountedTotalPrice, pricing.currency || 'VND')
    : null;
  const seatDetails = findSeatCellById(seatMapQuery.data?.rows, selectedSeat?.seatId ?? null);
  const seatPriceLabel = normalizeSeatPriceText(
    selectedSeat?.displayPrice?.text ?? seatDetails?.displayPrice?.text
  );
  const seatMapError =
    !seatContext.flightId || !seatContext.fareId
      ? 'Khong tim thay flightId/fareId trong store de tai so do ghe.'
      : seatMapQuery.error instanceof Error
        ? seatMapQuery.error.message
        : seatMapQuery.isError
          ? 'Khong the tai so do ghe luc nay.'
          : null;
  const servicesError =
    !seatContext.flightId || !seatContext.fareId
      ? 'Khong tim thay flightId/fareId trong store de tai danh sach dich vu.'
      : servicesQuery.error instanceof Error
        ? servicesQuery.error.message
        : servicesQuery.isError
          ? 'Khong the tai danh sach dich vu luc nay.'
          : null;

  const handleSeatPreview = (seat: SeatSelectionValue) => {
    setSelectedSeat(seat);
  };

  const handleSeatConfirm = (seat: SeatSelectionValue) => {
    setSelectedSeat(seat);
    const bookingIdNumeric = pickNumericId(bookingResponse?.bookingId);
    if (bookingIdNumeric == null) return;
    const passengerId = resolveStorePassengerId(
      bookingResponse?.passengers?.[activePassengerIndex]
    );
    if (passengerId == null) return;
    if (assignInFlight.current) return;
    assignInFlight.current = true;
    assignSeatMutation.mutate(
      { bookingId: bookingIdNumeric, passengerId, seatId: seat.seatId },
      {
        onSettled: () => {
          assignInFlight.current = false;
        },
      }
    );
  };

  const handleSeatCancel = (seat: SeatSelectionValue) => {
    setSelectedSeat(seat);
    const bookingIdNumeric = pickNumericId(bookingResponse?.bookingId);
    if (bookingIdNumeric == null) return;
    const passengerId = resolveStorePassengerId(
      bookingResponse?.passengers?.[activePassengerIndex]
    );
    if (passengerId == null) return;
    if (assignInFlight.current) return;
    assignInFlight.current = true;
    cancelSeatMutation.mutate(
      { bookingId: bookingIdNumeric, passengerId, seatId: seat.seatId },
      {
        onSettled: () => {
          assignInFlight.current = false;
        },
      }
    );
  };

  const handleActivePassengerServicesChange = (services: SelectedServiceOption[]) => {
    if (activePassengerId == null) return;
    hydratedPassengersRef.current.add(activePassengerId);
    setServicesByPassengerId((current) => ({
      ...current,
      [activePassengerId]: services,
    }));
    setServiceSaveStatusByPassengerId((current) => ({
      ...current,
      [activePassengerId]: 'idle',
    }));
  };

  const handleServicesConfirm = () => {
    const bookingIdNumeric = pickNumericId(bookingResponse?.bookingId);
    if (bookingIdNumeric == null || activePassengerId == null) return;
    const services = servicesByPassengerId[activePassengerId] ?? [];
    const selections = buildSelectionsFromSelectedServices(services);

    hydratedPassengersRef.current.add(activePassengerId);
    setServiceSaveStatusByPassengerId((current) => ({
      ...current,
      [activePassengerId]: 'saving',
    }));

    servicesMutation.mutate(
      { bookingId: bookingIdNumeric, passengerId: activePassengerId, selections },
      {
        onSuccess: (data, variables) => {
          applyServicesAssignmentResult(data, [variables.passengerId]);
          setServiceSaveStatusByPassengerId((current) => ({
            ...current,
            [variables.passengerId]: 'saved',
          }));
          toast.success(`Da luu dich vu cho hanh khach ${activePassengerIndex + 1}.`);
        },
        onError: (error, variables) => {
          setServiceSaveStatusByPassengerId((current) => ({
            ...current,
            [variables.passengerId]: 'error',
          }));
          toast.error(
            getBookingSessionExpiredMessage(error) ??
              (error instanceof Error
                ? error.message
                : 'Khong the cap nhat dich vu. Vui long thu lai.')
          );
        },
      }
    );
  };

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <SiteHeader />
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-28" />
      <BookingStepper current="select" />
      <main className="relative z-10 mx-auto grid max-w-[92rem] grid-cols-1 gap-6 px-4 pb-16 sm:px-6 xl:grid-cols-[17rem_minmax(0,1fr)] xl:px-8">
        <div className="mb-6 flex flex-col space-y-5 xl:mb-0">
          <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md">
            <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-secondary">
              Select Passenger
            </p>
            <div className="flex flex-wrap gap-3">
              {passengers.map((p, idx) => {
                const passengerId = resolveStorePassengerId(bookingResponse?.passengers?.[idx]);
                const serviceStatus =
                  passengerId != null
                    ? (serviceSaveStatusByPassengerId[passengerId] ?? 'idle')
                    : 'idle';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePassengerIndex(idx)}
                    className={`flex min-w-0 items-center space-x-3 rounded-lg border-2 px-4 py-3 ${
                      idx === activePassengerIndex
                        ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                        : 'border-transparent bg-surface-container-low hover:border-luxury-gold/30'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight-burgundy text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-bold leading-tight text-midnight-burgundy">
                        {p.fullName}
                      </p>
                      <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-tighter text-luxury-gold">
                        {getServiceStatusLabel(serviceStatus)}
                      </p>
                      {p.seat ? (
                        <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-tighter text-luxury-gold">
                          Seat: {p.seat}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="flex flex-row items-center gap-4 rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md duration-200 hover:shadow-lg"
            onClick={() => {
              setIsSeatSelecting(true);
              setIsServiceSelecting(false);
            }}
          >
            <Armchair
              className="h-16 w-16 shrink-0 rounded-xl bg-midnight-burgundy p-3 text-luxury-gold"
              strokeWidth={1.5}
            />
            <div className="flex flex-col items-start">
              <h2 className="mb-1 font-headline text-lg font-black text-midnight-burgundy">
                Chon ghe ngoi
              </h2>
              <p className="text-sm text-on-surface-variant">
                Chon cho ngoi yeu thich cua ban tren may bay.
              </p>
            </div>
            <ChevronRight
              className="ml-auto h-7 w-7 shrink-0 text-on-surface-variant"
              strokeWidth={1.5}
            />
          </button>

          <button
            type="button"
            className="flex flex-row items-center gap-4 rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md duration-200 hover:shadow-lg"
            onClick={() => {
              setIsServiceSelecting(true);
              setIsSeatSelecting(false);
            }}
          >
            <LuggageIcon
              className="h-16 w-16 shrink-0 rounded-xl bg-midnight-burgundy p-3 text-luxury-gold"
              strokeWidth={1.5}
            />
            <div className="flex flex-col items-start">
              <h2 className="mb-1 font-headline text-lg font-black text-midnight-burgundy">
                Chon dich vu bo sung
              </h2>
              <p className="text-sm text-on-surface-variant">
                Them hanh ly, bua an, bao hiem va nhieu hon nua.
              </p>
            </div>
            <ChevronRight
              className="ml-auto h-7 w-7 shrink-0 text-on-surface-variant"
              strokeWidth={1.5}
            />
          </button>

          <div className="rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-5 shadow-lg">
            <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Tom tat</h3>
            <p className="text-sm text-on-surface-variant">
              Flight #{seatContext.flightId ?? '--'}
              {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
            </p>
            {totalPriceLabel ? (
              <p className="mt-6 text-2xl font-black text-secondary">{totalPriceLabel}</p>
            ) : null}
            <p className="text-xs text-on-surface-variant">{passengers.length} khach</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
              HK {activePassengerIndex + 1} | {getServiceStatusLabel(activePassengerServiceStatus)}
            </p>

            {selectedSeat ? (
              <div className="mt-4 rounded-lg bg-midnight-burgundy/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-midnight-burgundy">
                  Ghe da chon
                </p>
                <p className="mt-1 text-lg font-black text-secondary">{selectedSeat.seatNumber}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {seatDetails?.seatTypeDisplay?.label ??
                    selectedSeat.seatTypeDisplay?.label ??
                    'Seat'}{' '}
                  |{' '}
                  {seatDetails?.seatCategoryDisplay?.label ??
                    selectedSeat.seatCategoryDisplay?.label ??
                    selectedSeat.seatCategory}
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {seatPriceLabel ?? 'Selected'}
                </p>
              </div>
            ) : null}

            {activePassengerServices.length > 0 && (
              <div className="mt-6 space-y-2 border-t border-outline-variant/20 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Dich vu bo sung
                </p>
                {activePassengerServices.map((service, index) => (
                  <div
                    key={`${service.serviceId}-${service.optionId}-${index}`}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-on-surface-variant">{service.name}</span>
                    <span className="text-right font-bold text-secondary">
                      {service.priceLabel}
                    </span>
                  </div>
                ))}
                <div className="border-t border-outline-variant/20 pt-2">
                  <div className="flex justify-between font-bold text-midnight-burgundy">
                    <span>Dich vu:</span>
                    <span>{formatMoney(totalServicePrice, serviceCurrency)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex h-12 flex-row gap-3">
              <Link
                to="/home"
                className="inline-flex w-24 items-center justify-center gap-2 rounded-md bg-cabin-silver px-4"
              >
                Huy
              </Link>
              <Link
                to="/booking/checkout"
                className="auth-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-md px-4 text-white transition-all hover:bg-midnight-burgundy/90"
              >
                Thanh toan
              </Link>
            </div>
          </div>
        </div>
        <aside className="min-w-0">
          {isSeatSelecting && (
            <AircraftSeatsMap
              seatMap={seatMapQuery.data ?? null}
              loading={canLoadSeatMap && seatMapQuery.isPending}
              error={seatMapError}
              selectedSeat={selectedSeat}
              assignedSeatBySeatId={assignedSeatMetaBySeatId}
              seatConfirmLoading={assignSeatMutation.isPending || cancelSeatMutation.isPending}
              onSeatPreview={handleSeatPreview}
              onSeatConfirm={handleSeatConfirm}
              onSeatCancel={handleSeatCancel}
            />
          )}
          {isServiceSelecting && (
            <AdditionalService
              services={servicesQuery.data?.services ?? []}
              loading={canLoadServices && servicesQuery.isPending}
              error={servicesError}
              selectedServices={activePassengerServices}
              confirmLoading={activePassengerServiceStatus === 'saving'}
              onSelectedServicesChange={handleActivePassengerServicesChange}
              onConfirm={handleServicesConfirm}
            />
          )}
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
