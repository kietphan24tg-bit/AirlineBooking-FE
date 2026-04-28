import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Armchair, ChevronRight, LuggageIcon } from 'lucide-react';
import type {
  PassengerBookingDetails,
  PassengerInfoNavigationState,
  PassengerProfile,
} from '../types/booking.types';
import type { SeatMapCell, SelectedServiceOption } from '../types/flight.types';
import SiteHeader from '../components/layout/SiteHeader';
import BookingStepper from '../components/booking/BookingStepper';
import SiteFooter from '../components/layout/SiteFooter';
import AircraftSeatsMap, { type SeatSelectionValue } from '../components/booking/AircraftSeatsMap';
import AdditionalService from '../components/booking/AdditionalService';
import { useBookingStore } from '../stores/useBookingStore';
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

export default function SeatSelection() {
  const location = useLocation();
  const bookingDraft = useBookingStore((state) => state.bookingDraft);
  const bookingResponse = useBookingStore((state) => state.bookingResponse);
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

  const [selectedServices, setSelectedServices] = useState<SelectedServiceOption[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);
  const [isSeatSelecting, setIsSeatSelecting] = useState(false);
  const [isServiceSelecting, setIsServiceSelecting] = useState(false);
  const seatContext = useMemo(() => {
    const responseContext = resolveSeatContext(bookingResponse);
    if (responseContext.flightId && responseContext.fareId) return responseContext;
    return resolveSeatContext(bookingDraft);
  }, [bookingDraft, bookingResponse]);
  const canLoadSeatMap = isSeatSelecting && !!seatContext.flightId && !!seatContext.fareId;
  const canLoadServices = isServiceSelecting && !!seatContext.flightId && !!seatContext.fareId;

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

  const pricing = bookingResponse?.pricing ?? bookingDraft.pricing;
  const serviceCurrency =
    selectedServices[0]?.currency ?? servicesQuery.data?.currency ?? pricing?.currency ?? 'VND';
  const totalServicePrice = selectedServices.reduce((total, service) => total + service.price, 0);
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

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <SiteHeader />
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-28" />
      <BookingStepper current="select" />
      <main className="relative z-10 mx-auto min-h-svh max-w-7xl gap-6 px-4 pb-16 sm:px-6 xl:grid-cols-[17rem_minmax(0,1fr)] xl:px-8">
        {!isSeatSelecting && !isServiceSelecting && (
          <div className="mb-6 flex flex-row space-y-5 xl:mb-0 gap-5">
            <div className="flex flex-col w-full gap-5">
              <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md">
                <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-secondary">
                  Select Passenger
                </p>
                <div className="flex flex-wrap gap-3">
                  {passengers.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`flex min-w-0 items-center space-x-3 rounded-lg border-2 px-4 py-3 ${
                        idx === 0
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
                        {p.seat ? (
                          <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-tighter text-luxury-gold">
                            Seat: {p.seat}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="flex flex-row items-center gap-4 rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md duration-200 hover:shadow-lg h-40"
                onClick={() => {
                  setIsSeatSelecting(true);
                }}
              >
                <Armchair
                  className="h-30 w-30 shrink-0 rounded-xl bg-midnight-burgundy p-3 text-luxury-gold"
                  strokeWidth={1}
                />
                <div className="flex flex-col items-start">
                  <h2 className="mb-1 font-headline text-lg font-black text-midnight-burgundy">
                    Chọn ghế ngồi
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Chọn chỗ ngồi yêu thích của bạn trên máy bay.
                  </p>
                </div>
                <ChevronRight
                  className="ml-auto h-7 w-7 shrink-0 text-on-surface-variant"
                  strokeWidth={2}
                />
              </button>

              <button
                type="button"
                className="flex flex-row items-center gap-4 rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md duration-200 hover:shadow-lg h-40"
                onClick={() => {
                  setIsServiceSelecting(true);
                }}
              >
                <LuggageIcon
                  className="h-30 w-30 shrink-0 rounded-xl bg-midnight-burgundy p-3 text-luxury-gold"
                  strokeWidth={1}
                />
                <div className="flex flex-col items-start">
                  <h2 className="mb-1 font-headline text-lg font-black text-midnight-burgundy">
                    Chọn dịch vụ bổ sung
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Thêm hành lý, bữa ăn, bảo hiểm và nhiều hơn nữa.
                  </p>
                </div>
                <ChevronRight
                  className="ml-auto h-7 w-7 shrink-0 text-on-surface-variant"
                  strokeWidth={2}
                />
              </button>
            </div>

            <div className="rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-5 shadow-lg w-150 h-full">
              <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Tóm tắt</h3>
              <p className="text-sm text-on-surface-variant">
                Flight #{seatContext.flightId ?? '--'}
                {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
              </p>
              {totalPriceLabel ? (
                <p className="mt-6 text-2xl font-black text-secondary">{totalPriceLabel}</p>
              ) : null}
              <p className="text-xs text-on-surface-variant">{passengers.length} khach</p>

              {selectedSeat ? (
                <div className="mt-4 rounded-lg bg-midnight-burgundy/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-midnight-burgundy">
                    Ghe da chon
                  </p>
                  <p className="mt-1 text-lg font-black text-secondary">
                    {selectedSeat.seatNumber}
                  </p>
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

              {selectedServices.length > 0 && (
                <div className="mt-6 space-y-2 border-t border-outline-variant/20 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Dich vu bo sung
                  </p>
                  {selectedServices.map((service) => (
                    <div
                      key={`${service.serviceId}-${service.optionId}`}
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
        )}

        {isSeatSelecting && (
          <AircraftSeatsMap
            seatMap={seatMapQuery.data ?? null}
            loading={canLoadSeatMap && seatMapQuery.isPending}
            error={seatMapError}
            selectedSeat={selectedSeat}
            onSeatSelect={setSelectedSeat}
            onClose={() => setIsSeatSelecting(false)}
          />
        )}
        {isServiceSelecting && (
          <AdditionalService
            services={servicesQuery.data?.services ?? []}
            loading={canLoadServices && servicesQuery.isPending}
            error={servicesError}
            selectedServices={selectedServices}
            onSelectServices={setSelectedServices}
            onClose={() => setIsServiceSelecting(false)}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
