import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Armchair, ChevronDown, ChevronRight, ChevronUp, LuggageIcon } from 'lucide-react';
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
import AircraftSeatsMap, {
  type AssignedSeatMeta,
  type SeatSelectionValue,
} from '../components/booking/AircraftSeatsMap';
import AdditionalService from '../components/booking/AdditionalService';
import { useBookingStore } from '../stores/useBookingStore';
import { bookingService } from '../services/booking.service';
import { flightService } from '../services/flight.service';

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

function formatItineraryRouteLabel(itinerary: {
  departureCity: string;
  departureAirportCode: string;
  arrivalCity: string;
  arrivalAirportCode: string;
}): string {
  return `${itinerary.departureCity} (${itinerary.departureAirportCode})  ✈  ${itinerary.arrivalCity} (${itinerary.arrivalAirportCode})`;
}

function formatItineraryMetaLabel(itinerary: {
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  cabinClass: string | null;
}): string {
  const departureDate = new Date(itinerary.departureTime);
  const arrivalDate = new Date(itinerary.arrivalTime);
  const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const weekday =
    Number.isFinite(departureDate.getTime()) ? weekdayLabels[departureDate.getDay()] : '--';
  const dateLabel = Number.isFinite(departureDate.getTime())
    ? `${String(departureDate.getDate()).padStart(2, '0')}/${String(
        departureDate.getMonth() + 1
      ).padStart(2, '0')}/${departureDate.getFullYear()}`
    : '--/--/----';
  const departureTimeLabel = Number.isFinite(departureDate.getTime())
    ? departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';
  const arrivalTimeLabel = Number.isFinite(arrivalDate.getTime())
    ? arrivalDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';
  const cabinLabel =
    itinerary.cabinClass?.trim().toUpperCase() === 'ECONOMY'
      ? 'Eco'
      : itinerary.cabinClass?.trim() ?? '--';

  return `${weekday}, ${dateLabel} | ${departureTimeLabel} - ${arrivalTimeLabel} | ${itinerary.flightNumber} | ${cabinLabel}`;
}

function buildSummaryHeaderFromRawBooking(
  bookingResponse: ReturnType<typeof useBookingStore.getState>['bookingResponse'],
  seatContext: SeatContext
): { itineraryLabel: string | null; flightMetaLabel: string | null } {
  const rawFlight =
    bookingResponse?.raw?.flight && typeof bookingResponse.raw.flight === 'object'
      ? (bookingResponse.raw.flight as Record<string, unknown>)
      : null;
  const rawFare =
    bookingResponse?.raw?.fare && typeof bookingResponse.raw.fare === 'object'
      ? (bookingResponse.raw.fare as Record<string, unknown>)
      : null;
  const departure =
    rawFlight?.departure && typeof rawFlight.departure === 'object'
      ? (rawFlight.departure as Record<string, unknown>)
      : null;
  const arrival =
    rawFlight?.arrival && typeof rawFlight.arrival === 'object'
      ? (rawFlight.arrival as Record<string, unknown>)
      : null;

  const departureCity = typeof departure?.city === 'string' ? departure.city : null;
  const departureCode =
    typeof departure?.airportCode === 'string'
      ? departure.airportCode
      : typeof departure?.code === 'string'
        ? departure.code
        : null;
  const arrivalCity = typeof arrival?.city === 'string' ? arrival.city : null;
  const arrivalCode =
    typeof arrival?.airportCode === 'string'
      ? arrival.airportCode
      : typeof arrival?.code === 'string'
        ? arrival.code
        : null;
  const departureTime = typeof departure?.time === 'string' ? departure.time : null;
  const arrivalTime = typeof arrival?.time === 'string' ? arrival.time : null;
  const flightNumber = typeof rawFlight?.flightNumber === 'string' ? rawFlight.flightNumber : null;
  const cabinClass =
    typeof rawFare?.cabinClass === 'string'
      ? rawFare.cabinClass
      : typeof rawFare?.name === 'string'
        ? rawFare.name
        : seatContext.fareCode;

  const itineraryLabel =
    departureCity && departureCode && arrivalCity && arrivalCode
      ? `${departureCity} (${departureCode})  ✈  ${arrivalCity} (${arrivalCode})`
      : null;

  let flightMetaLabel: string | null = null;
  if (departureTime && arrivalTime && flightNumber) {
    flightMetaLabel = formatItineraryMetaLabel({
      departureTime,
      arrivalTime,
      flightNumber,
      cabinClass: cabinClass ?? null,
    });
  } else if (flightNumber) {
    flightMetaLabel = `${flightNumber} | ${cabinClass ?? '--'}`;
  }

  return {
    itineraryLabel,
    flightMetaLabel:
      flightMetaLabel ??
      `Flight #${seatContext.flightId ?? '--'}${seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}`,
  };
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

function resolveStorePassengerId(
  passenger:
    | BookingPassengerWithId
    | { passengerId?: number | null; id?: number | null }
    | undefined
    | null
): number | null {
  if (!passenger) return null;
  return pickNumericId(passenger.passengerId) ?? pickNumericId(passenger.id);
}

function buildConfirmedServicesLookupFromManageOptions(
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
      quantity: Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
    });
    next[selection.passengerId] = passengerSelections;
  }
  return next;
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

  return status === 409 || status === 410
    ? 'Phiên đặt chỗ đã hết hạn. Vui lòng đặt lại chuyến bay.'
    : null;
}

function isExpiredTimestamp(value: string | null | undefined): boolean {
  if (!value) return false;
  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt) && Date.now() >= expiresAt;
}

function isTerminalBookingStatus(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toUpperCase();
  return normalized === 'EXPIRED' || normalized === 'CANCELLED' || normalized === 'CANCELED';
}

function resolveSeatSelectionBlockReason(params: {
  isManageBookingFlow: boolean;
  draftExpired: boolean;
  bookingResponseStatus: string | null | undefined;
  bookingResponseExpiresAt: string | null | undefined;
  bookingLookupStatus: string | null | undefined;
  bookingLookupExpiresAt: string | null | undefined;
  manageBookingStatus: string | null | undefined;
}): string | null {
  const {
    isManageBookingFlow,
    draftExpired,
    bookingResponseStatus,
    bookingResponseExpiresAt,
    bookingLookupStatus,
    bookingLookupExpiresAt,
    manageBookingStatus,
  } = params;

  if (isManageBookingFlow) {
    if (
      isTerminalBookingStatus(manageBookingStatus) ||
      isTerminalBookingStatus(bookingLookupStatus) ||
      isExpiredTimestamp(bookingLookupExpiresAt)
    ) {
      return 'Đặt chỗ này đã hết hạn hoặc không còn khả dụng để chọn ghế và dịch vụ.';
    }
    return null;
  }

  if (draftExpired) {
    return 'Phiên giữ giá đã hết hạn. Vui lòng chọn lại chuyến bay.';
  }

  if (
    isTerminalBookingStatus(bookingResponseStatus) ||
    isExpiredTimestamp(bookingResponseExpiresAt)
  ) {
    return 'Đặt chỗ của bạn đã hết hạn hoặc không còn khả dụng. Vui lòng đặt lại chuyến bay.';
  }

  return null;
}

type SummaryPanelProps = {
  seatContext: SeatContext;
  totalPriceLabel: string | null;
  passengersCount: number;
  selectedSeat: SeatSelectionValue | null;
  confirmedSeatNumber: string | null;
  seatDetails: SeatMapCell | null;
  seatPriceLabel: string | null;
  activePassengerServices: SelectedServiceOption[];
  totalServicePrice: number;
  serviceCurrency: string;
};

export function SummaryPanel({
  seatContext,
  totalPriceLabel,
  passengersCount,
  selectedSeat,
  confirmedSeatNumber,
  seatDetails,
  seatPriceLabel,
  activePassengerServices,
  totalServicePrice,
  serviceCurrency,
}: SummaryPanelProps) {
  return (
    <div className="w-full rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-5 shadow-lg xl:sticky xl:top-28 xl:w-[23rem]">
      <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Tóm tắt</h3>
      <p className="text-sm text-on-surface-variant">
        Flight #{seatContext.flightId ?? '--'}
        {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
      </p>

      {totalPriceLabel ? (
        <p className="mt-6 text-2xl font-black text-secondary">{totalPriceLabel}</p>
      ) : null}
      <p className="text-xs text-on-surface-variant">{passengersCount} khach</p>

      {(confirmedSeatNumber || activePassengerServices.length > 0) ? (
        <div className="mt-5 space-y-3 border-t border-outline-variant/20 pt-4">
          {confirmedSeatNumber ? (
            <div className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-bold text-midnight-burgundy">Ghế</p>
                <p className="text-on-surface-variant">
                  {confirmedSeatNumber}
                  {(seatDetails?.seatCategoryDisplay?.label ??
                    selectedSeat?.seatCategoryDisplay?.label ??
                    selectedSeat?.seatCategory) &&
                    ` • ${
                      seatDetails?.seatCategoryDisplay?.label ??
                      selectedSeat?.seatCategoryDisplay?.label ??
                      selectedSeat?.seatCategory
                    }`}
                </p>
              </div>
              <span className="text-right font-bold text-secondary">
                {seatPriceLabel ?? 'Selected'}
              </span>
            </div>
          ) : null}

          {activePassengerServices.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold text-midnight-burgundy">Dịch vụ</p>
                  <p className="text-on-surface-variant">
                    {activePassengerServices
                      .map((service) => service.name)
                      .filter((value, index, list) => list.indexOf(value) === index)
                      .join(', ')}
                  </p>
                </div>
                <span className="text-right font-bold text-secondary">
                  {formatMoney(totalServicePrice, serviceCurrency)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex h-12 flex-row gap-3">
        <Link
          to="/"
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
  );
}

type InspectorSummaryPanelProps = {
  seatContext: SeatContext;
  totalPriceLabel: string | null;
  passengersCount: number;
  activePassengerName: string | null;
  selectedSeat: SeatSelectionValue | null;
  confirmedSeatNumber: string | null;
  seatDetails: SeatMapCell | null;
  seatPriceLabel: string | null;
  highlightedService: SelectedServiceOption | null;
  activePassengerServices: SelectedServiceOption[];
  totalServicePrice: number;
  serviceCurrency: string;
};

function InspectorSummaryPanel({
  seatContext,
  totalPriceLabel,
  passengersCount,
  activePassengerName,
  selectedSeat,
  confirmedSeatNumber,
  seatDetails,
  seatPriceLabel,
  highlightedService,
  activePassengerServices,
  totalServicePrice,
  serviceCurrency,
}: InspectorSummaryPanelProps) {
  const serviceNames = activePassengerServices
    .map((service) => service.name)
    .filter((value, index, list) => list.indexOf(value) === index);
  const seatTypeLabel =
    seatDetails?.seatTypeDisplay?.label ?? selectedSeat?.seatTypeDisplay?.label ?? 'Chua chon';
  const seatCategoryLabel =
    seatDetails?.seatCategoryDisplay?.label ??
    selectedSeat?.seatCategoryDisplay?.label ??
    selectedSeat?.seatCategory ??
    'Chua chon';
  const seatStatusLabel = confirmedSeatNumber ? 'Da xac nhan' : 'Chua chon';
  const seatIncludedLabel = seatDetails ? (seatDetails.included ? 'Co' : 'Khong') : '--';
  const serviceSummaryLabel =
    serviceNames.length > 0 ? serviceNames.join(', ') : 'Chua chon dich vu';
  const servicePriceLabel =
    activePassengerServices.length > 0 ? formatMoney(totalServicePrice, serviceCurrency) : '--';
  const serviceHeroTitle = highlightedService?.name ?? 'Chua chon dich vu';
  const serviceHeroPrice = highlightedService?.priceLabel ?? servicePriceLabel;
  const serviceDescription = highlightedService?.description ?? 'Chon dich vu de xem thong tin chi tiet.';
  const serviceTypeLabel = highlightedService?.serviceName ?? 'Dich vu bo sung';

  return (
    <div className="w-full rounded-xl border border-outline-variant/20 bg-white/90 p-5 shadow-sm backdrop-blur-md xl:sticky xl:top-28 xl:w-[22rem]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-midnight-burgundy">
        Selected service
      </p>
      <p className="mt-3 text-sm text-on-surface-variant">
        Flight #{seatContext.flightId ?? '--'}
        {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
      </p>
      <p className="mt-1 text-sm font-semibold text-midnight-burgundy">
        {activePassengerName ?? 'Hanh khach'}
      </p>

      <div className="mt-5 rounded-lg bg-surface-container-lowest p-4">
        <div className="flex items-center gap-3">
          <LuggageIcon className="h-14 w-14 shrink-0 text-luxury-gold" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="truncate font-headline text-3xl font-black leading-none text-midnight-burgundy">
              {serviceHeroTitle}
            </p>
            <p className="mt-3 inline-flex min-h-9 items-center rounded-full bg-luxury-gold/15 px-3.5 text-sm font-black text-secondary">
              {serviceHeroPrice}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm text-on-surface">
        <p>
          <span className="font-bold">Loai ghe:</span> {seatTypeLabel}
        </p>
        <p>
          <span className="font-bold">Hang ghe:</span> {seatCategoryLabel}
        </p>
        <p>
          <span className="font-bold">Dich vu:</span> {serviceTypeLabel}
        </p>
        <p className="leading-6 text-on-surface-variant">
          <span className="font-bold text-on-surface">Mo ta:</span> {serviceDescription}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-outline-variant/20 pt-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
            Trang thai ghe
          </p>
          <p className="mt-1 font-black text-midnight-burgundy">{seatStatusLabel}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
            Bao gom trong ve
          </p>
          <p className="mt-1 font-black text-midnight-burgundy">{seatIncludedLabel}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
            Phu thu ghe
          </p>
          <p className="mt-2 inline-flex rounded-full bg-midnight-burgundy/10 px-3 py-1 text-sm font-black text-midnight-burgundy">
            {seatPriceLabel ?? '--'}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-outline-variant/20 pt-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
          Nhom dich vu
        </p>
        <p className="mt-2 text-sm font-semibold text-midnight-burgundy">{serviceSummaryLabel}</p>
        <p className="mt-2 text-sm font-black text-secondary">{servicePriceLabel}</p>
      </div>

      {totalPriceLabel ? (
        <div className="mt-5 border-t border-outline-variant/20 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
            Tong tam tinh
          </p>
          <p className="mt-2 text-3xl font-black text-secondary">{totalPriceLabel}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{passengersCount} khach</p>
        </div>
      ) : null}

      <div className="mt-8 flex h-12 flex-row gap-3">
        <Link
          to="/"
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
  );
}

type ServiceDetailPanelProps = {
  seatContext: SeatContext;
  totalPriceLabel: string | null;
  passengersCount: number;
  activePassengerName: string | null;
  highlightedService: SelectedServiceOption | null;
  activePassengerServices: SelectedServiceOption[];
  totalServicePrice: number;
  serviceCurrency: string;
  confirmLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function ServiceDetailPanel({
  seatContext,
  totalPriceLabel,
  passengersCount,
  activePassengerName,
  highlightedService,
  activePassengerServices,
  totalServicePrice,
  serviceCurrency,
  confirmLoading,
  onConfirm,
  onClose,
}: ServiceDetailPanelProps) {
  const groupedServices = Array.from(
    activePassengerServices.reduce((map, service) => {
      const existing = map.get(service.optionId);
      if (existing) {
        existing.quantity += 1;
        existing.totalPrice += service.price;
        return map;
      }

      map.set(service.optionId, {
        optionId: service.optionId,
        name: service.name,
        serviceName: service.serviceName,
        quantity: 1,
        totalPrice: service.price,
        currency: service.currency,
      });
      return map;
    }, new Map<number, { optionId: number; name: string; serviceName: string; quantity: number; totalPrice: number; currency: string }>())
  ).map(([, value]) => value);

  const highlightedGroup = highlightedService
    ? groupedServices.find((service) => service.optionId === highlightedService.optionId) ?? null
    : null;
  const totalServicesLabel =
    activePassengerServices.length > 0 ? formatMoney(totalServicePrice, serviceCurrency) : '--';

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-white/90 p-5 shadow-sm backdrop-blur-md w-82">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-midnight-burgundy">
        Services summary
      </p>

      <div className="mt-5 grid gap-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Selected services
          </p>
          {groupedServices.length > 0 ? (
            <div className="mt-3 space-y-3">
              {groupedServices.map((service) => (
                <div
                  key={service.optionId}
                  className={`rounded-lg border px-3 py-3 ${
                    highlightedGroup?.optionId === service.optionId
                      ? 'border-midnight-burgundy/25 bg-midnight-burgundy/5'
                      : 'border-outline-variant/15 bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-midnight-burgundy">{service.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{service.serviceName}</p>
                      {service.quantity > 1 ? (
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-secondary">
                          x{service.quantity}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-right font-black text-secondary">
                      {formatMoney(service.totalPrice, service.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-outline-variant/30 bg-surface-container-lowest px-3 py-4 text-sm text-on-surface-variant">
              Chua co dich vu nao duoc chon.
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant/20 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Services subtotal
            </p>
            <p className="text-sm font-black text-secondary">{totalServicesLabel}</p>
          </div>
        </div>
      </div>

      <div className="hidden xl:block">
        <button
          type="button"
          disabled={confirmLoading || activePassengerServices.length === 0}
          onClick={onConfirm}
          className="auth-primary-btn mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLoading ? 'Dang luu...' : 'Xac nhan dich vu'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={confirmLoading}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-400/30 bg-slate-100/90 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to overview
        </button>
      </div>
    </div>
  );
}

type BookingSummaryPanelProps = {
  itineraryLabel: string | null;
  flightMetaLabel: string | null;
  totalPriceLabel: string | null;
  passengersCount: number;
  passengerItems: Array<{
    passengerId: number | null;
    fullName: string;
    passengerType: string | null;
  }>;
  fareAmountLabel: string | null;
  taxFeeTotalLabel: string | null;
  taxFeeItems: Array<{ label: string; value: string }>;
  seatItems: Array<{
    passengerId: number;
    passengerName: string;
    seatNumber: string;
    seatTypeLabel: string | null;
    seatCategoryLabel: string | null;
    surchargeLabel: string;
  }>;
  serviceItems: Array<{
    passengerId: number;
    passengerName: string;
    serviceName: string;
    optionName: string;
    quantity: number;
    totalPriceLabel: string;
  }>;
  serviceTotalLabel: string | null;
};

function bookingPassengerTypeLabel(value: string | null | undefined): string {
  if (value === 'ADULT') return 'Người lớn';
  if (value === 'CHILD') return 'Trẻ em';
  if (value === 'INFANT') return 'Em bé';
  return 'Hành khách';
}

function BookingSummarySection({
  title,
  value,
  defaultOpen = false,
  collapsible = true,
  children,
}: {
  title: string;
  value?: string | null;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const interactive = collapsible;

  return (
    <section className="border-t border-outline-variant/20 pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={interactive ? () => setOpen((current) => !current) : undefined}
        disabled={!interactive}
        className={`flex w-full items-center justify-between gap-3 text-left ${
          interactive ? 'cursor-pointer' : 'cursor-default'
        } disabled:cursor-default`}
      >
        <span className="text-sm font-black uppercase tracking-[0.14em] text-on-surface">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {value ? <span className="text-sm font-black text-secondary">{value}</span> : null}
          {interactive ? (
            open ? (
              <ChevronUp className="h-4 w-4 text-on-surface-variant" />
            ) : (
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            )
          ) : null}
        </span>
      </button>

      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function BookingSummaryPanel({
  itineraryLabel,
  flightMetaLabel,
  totalPriceLabel,
  passengersCount,
  passengerItems,
  fareAmountLabel,
  taxFeeTotalLabel,
  taxFeeItems,
  seatItems,
  serviceItems,
  serviceTotalLabel,
}: BookingSummaryPanelProps) {
  const groupedPassengers = passengerItems.reduce(
    (map, passenger) => {
      const key = bookingPassengerTypeLabel(passenger.passengerType);
      map.set(key, [...(map.get(key) ?? []), passenger]);
      return map;
    },
    new Map<string, BookingSummaryPanelProps['passengerItems']>()
  );
  const itineraryParts = itineraryLabel?.split('✈').map((part) => part.trim()) ?? [];
  const itineraryFrom = itineraryParts[0] ?? itineraryLabel ?? 'Tom tat';
  const itineraryTo = itineraryParts[1] ?? null;

  return (
    <div className="w-full rounded-[1.75rem] border border-luxury-gold/20 bg-white/92 p-5 shadow-[0_22px_70px_rgba(81,35,20,0.12)] backdrop-blur-md xl:sticky xl:top-28 xl:w-[23rem]">
      <div className="border-b border-outline-variant/20 pb-5">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
          Tổng kết chuyến đi
        </p>
        <div className="mt-4 space-y-2">
          <h3 className="font-headline text-[1.05rem] font-black leading-snug text-on-surface sm:text-[1.15rem]">
            {itineraryFrom}
          </h3>
          {itineraryTo ? (
            <div className="flex items-start gap-2 text-on-surface">
              <span className="pt-0.5 text-secondary">✈</span>
              <p className="font-headline text-[1.05rem] font-black leading-snug sm:text-[1.15rem]">
                {itineraryTo}
              </p>
            </div>
          ) : null}
        </div>
        {flightMetaLabel ? <p className="mt-2 text-sm text-on-surface-variant">{flightMetaLabel}</p> : null}
        <p className="mt-1 text-xs text-on-surface-variant">{passengersCount} khách</p>
      </div>

      <div className="mt-5 space-y-4">
        <BookingSummarySection title="Thông tin hành khách">
          <div className="space-y-3">
            {Array.from(groupedPassengers.entries()).map(([groupLabel, items]) => (
              <div
                key={groupLabel}
                className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                  {groupLabel}
                </p>
                <div className="mt-2 space-y-1">
                  {items.map((passenger) => (
                    <p
                      key={`${groupLabel}-${passenger.passengerId ?? passenger.fullName}`}
                      className="font-semibold text-on-surface"
                    >
                      {passenger.fullName}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </BookingSummarySection>

        {fareAmountLabel ? (
          <BookingSummarySection title="Giá vé" value={fareAmountLabel}>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold text-on-surface">Vé chuyến đi</p>
                <span className="font-black text-secondary">{fareAmountLabel}</span>
              </div>
            </div>
          </BookingSummarySection>
        ) : null}

        {taxFeeTotalLabel ? (
          <BookingSummarySection title="Thuế, phí" value={taxFeeTotalLabel}>
            <div className="space-y-2">
              {taxFeeItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3 text-sm"
                >
                  <span className="text-on-surface">{item.label}</span>
                  <span className="font-black text-secondary">{item.value}</span>
                </div>
              ))}
            </div>
          </BookingSummarySection>
        ) : null}

        {seatItems.length > 0 ? (
          <BookingSummarySection
            title="Ghế"
            value={
              seatItems.length === 1 ? seatItems[0].surchargeLabel : `${seatItems.length} ghế đã chọn`
            }
          >
            <div className="space-y-3">
              {seatItems.map((seat) => (
                <div
                  key={`${seat.passengerId}-${seat.seatNumber}`}
                  className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {seat.passengerName}
                      </p>
                      <p className="mt-2 font-bold text-midnight-burgundy">Ghế đã chọn</p>
                      <p className="mt-1 text-[1.35rem] font-black leading-none text-secondary">
                        {seat.seatNumber}
                      </p>
                      {(seat.seatTypeLabel || seat.seatCategoryLabel) ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                          {[seat.seatTypeLabel, seat.seatCategoryLabel].filter(Boolean).join(' | ')}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-black text-secondary">
                      {seat.surchargeLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </BookingSummarySection>
        ) : null}

        {serviceItems.length > 0 ? (
          <BookingSummarySection title="Dịch vụ" value={serviceTotalLabel}>
            <div className="space-y-3">
              {serviceItems.map((service) => (
                <div
                  key={`${service.passengerId}-${service.serviceName}-${service.optionName}`}
                  className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {service.passengerName}
                      </p>
                      <p className="mt-2 font-bold text-midnight-burgundy">{service.serviceName}</p>
                      <p className="mt-1 text-sm text-on-surface">
                        {service.optionName}
                        {service.quantity > 1 ? ` x${service.quantity}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-secondary">
                      {service.totalPriceLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </BookingSummarySection>
        ) : null}
      </div>

      {totalPriceLabel ? (
        <div className="mt-6 rounded-[1.4rem] border border-midnight-burgundy/15 bg-[linear-gradient(135deg,rgba(124,9,55,0.06),rgba(199,154,46,0.16))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
                Tổng thanh toán
              </p>
              <p className="mt-2 text-3xl font-black leading-none text-secondary">{totalPriceLabel}</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-midnight-burgundy">
                Sẵn sàng thanh toán
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex h-12 flex-row gap-3">
        <Link
          to="/"
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
  );
}

export default function SeatSelection() {
  const location = useLocation();
  const navigate = useNavigate();
  const isManageBookingFlow = location.pathname.startsWith('/manage-booking/');
  const bookingDraft = useBookingStore((state) => state.bookingDraft);
  const bookingResponse = useBookingStore((state) => state.bookingResponse);
  const bookingLookup = useBookingStore((state) => state.bookingLookup);
  const manageOptions = useBookingStore((state) => state.manageOptions);
  const clearBooking = useBookingStore((state) => state.clearBooking);
  const isRevalidateExpired = useBookingStore((state) => state.isRevalidateExpired);
  const setManageOptions = useBookingStore((state) => state.setManageOptions);
  const applySeatAssignmentResult = useBookingStore((state) => state.applySeatAssignmentResult);
  const applyServicesAssignmentResult = useBookingStore(
    (state) => state.applyServicesAssignmentResult
  );
  const hasHandledSessionBlockRef = useRef(false);
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
  const managePassengers = manageOptions?.passengers?.length
    ? manageOptions.passengers.map((passenger, index) => ({
        id: String(index + 1),
        fullName: [passenger.lastName, passenger.firstName].filter(Boolean).join(' ').trim(),
        seat:
          manageOptions.seatAssignments.find(
            (assignment) => assignment.passengerId === passenger.passengerId
          )?.seatNumber ?? undefined,
      }))
    : null;
  // For the manage-booking flow, prefer manageOptions/lookup; fall back to bookingResponse only in
  // the original booking flow. The legacy `MOCK_PASSENGERS` placeholder was removed because the
  // mock URL flag (`?mockManageBooking=1`) now hydrates real fixtures into the store instead.
  const lookupPassengers = bookingLookup?.passengers?.length
    ? bookingLookup.passengers.map((passenger, index) => ({
        id: String(index + 1),
        fullName: [passenger.lastName, passenger.firstName].filter(Boolean).join(' ').trim(),
        seat:
          (passenger.selections?.seats ?? passenger.seatAssignments ?? [])[0]?.seatNumber ??
          undefined,
      }))
    : null;
  const passengers: PassengerProfile[] = isManageBookingFlow
    ? (managePassengers ?? lookupPassengers ?? [])
    : (storePassengers ?? navPassengers ?? []);
  const passengerSource = isManageBookingFlow
    ? (manageOptions?.passengers ?? bookingLookup?.passengers ?? [])
    : (bookingResponse?.passengers ?? []);

  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);
  const [isSeatSelecting, setIsSeatSelecting] = useState(
    location.pathname.endsWith('/seat-selection')
  );
  const [isServiceSelecting, setIsServiceSelecting] = useState(
    location.pathname.endsWith('/add-services')
  );
  const [servicesByPassengerId, setServicesByPassengerId] = useState<ServicesByPassengerId>({});
  const [serviceSaveStatusByPassengerId, setServiceSaveStatusByPassengerId] =
    useState<ServiceSaveStatusByPassengerId>(() =>
      createInitialServiceStatusMap(
        bookingResponse?.confirmedServicesByPassengerId ??
          buildConfirmedServicesLookupFromManageOptions(manageOptions)
      )
    );
  const hydratedPassengersRef = useRef<Set<number>>(new Set());
  const assignInFlight = useRef(false);
  const manageBookingId = pickNumericId(
    manageOptions?.bookingId ?? bookingLookup?.booking?.bookingId ?? bookingResponse?.bookingId
  );
  const bookingResponseStatus =
    typeof bookingResponse?.raw?.booking === 'object' &&
    bookingResponse.raw.booking &&
    'status' in bookingResponse.raw.booking
      ? String(bookingResponse.raw.booking.status ?? '')
      : null;
  const bookingResponseExpiresAt =
    typeof bookingResponse?.raw?.booking === 'object' &&
    bookingResponse.raw.booking &&
    'expiresAt' in bookingResponse.raw.booking &&
    typeof bookingResponse.raw.booking.expiresAt === 'string'
      ? bookingResponse.raw.booking.expiresAt
      : null;
  const sessionBlockReason = resolveSeatSelectionBlockReason({
    isManageBookingFlow,
    draftExpired: isRevalidateExpired(),
    bookingResponseStatus,
    bookingResponseExpiresAt,
    bookingLookupStatus: bookingLookup?.booking?.status,
    bookingLookupExpiresAt: bookingLookup?.booking?.expiresAt,
    manageBookingStatus: manageOptions?.bookingStatus,
  });

  useEffect(() => {
    if (!sessionBlockReason || hasHandledSessionBlockRef.current) return;
    hasHandledSessionBlockRef.current = true;
    toast.error(sessionBlockReason);
    if (!isManageBookingFlow) {
      clearBooking();
      navigate('/', { replace: true });
      return;
    }
    navigate('/manage-booking', { replace: true });
  }, [clearBooking, isManageBookingFlow, navigate, sessionBlockReason]);

  useEffect(() => {
    if (activePassengerIndex >= passengers.length) {
      setActivePassengerIndex(0);
    }
  }, [activePassengerIndex, passengers.length]);

  const manageOptionsQuery = useQuery({
    queryKey: ['manage-options', manageBookingId],
    queryFn: () => bookingService.getManageOptions(manageBookingId as number),
    enabled: isManageBookingFlow && manageBookingId != null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (manageOptionsQuery.data) {
      setManageOptions(manageOptionsQuery.data);
    }
  }, [manageOptionsQuery.data, setManageOptions]);

  const seatContext = useMemo(() => {
    if (manageOptions?.itineraries?.length) {
      const itinerary = manageOptions.itineraries[0];
      return {
        flightId: itinerary.flightId,
        fareId: itinerary.fareId,
        fareCode: null,
      };
    }
    const responseContext = resolveSeatContext(bookingResponse);
    if (responseContext.flightId && responseContext.fareId) return responseContext;
    return resolveSeatContext(bookingDraft);
  }, [bookingDraft, bookingResponse, manageOptions]);
  const canLoadSeatMap = isSeatSelecting && !!seatContext.flightId && !!seatContext.fareId;
  const canLoadServices = isServiceSelecting && !!seatContext.flightId && !!seatContext.fareId;

  const activePassenger = passengerSource[activePassengerIndex];
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
      if (bookingResponse) {
        applySeatAssignmentResult(data);
      }
      void seatMapQuery.refetch();
      if (isManageBookingFlow) {
        void manageOptionsQuery.refetch();
      }
      toast.success('Da xac nhan ghe ngoi.');
    },
    onError: (error) => {
      toast.error(
        getBookingSessionExpiredMessage(error) ??
          (error instanceof Error ? error.message : 'Khong the gan ghe. Vui long thu lai.')
      );
    },
  });

  const changeSeatMutation = useMutation({
    mutationFn: (vars: {
      bookingId: string | number;
      passengerId: number;
      fromSeatId: number;
      toSeatId: number;
    }) =>
      bookingService.patchSeatAssignment(vars.bookingId, {
        passengerId: vars.passengerId,
        fromSeatId: vars.fromSeatId,
        toSeatId: vars.toSeatId,
      }),
    onSuccess: (data) => {
      if (bookingResponse) {
        applySeatAssignmentResult(data);
      }
      void seatMapQuery.refetch();
      if (isManageBookingFlow) {
        void manageOptionsQuery.refetch();
      }
      toast.success('Da doi ghe ngoi.');
    },
    onError: (error) => {
      toast.error(
        getBookingSessionExpiredMessage(error) ??
          (error instanceof Error ? error.message : 'Khong the doi ghe. Vui long thu lai.')
      );
    },
  });

  const cancelSeatMutation = useMutation({
    mutationFn: (vars: { bookingId: string | number; passengerId: number; seatId: number }) =>
      bookingService.deleteSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: (data) => {
      if (bookingResponse) {
        applySeatAssignmentResult(data);
      }
      setSelectedSeat(null);
      void seatMapQuery.refetch();
      if (isManageBookingFlow) {
        void manageOptionsQuery.refetch();
      }
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
      passengerName: string;
      selections: BookingServiceSelectionInput[];
    }) =>
      bookingService.putBookingServices(vars.bookingId, {
        passengers: [{ passengerId: vars.passengerId, selections: vars.selections }],
      }),
  });

  const assignedSeatMetaBySeatId = useMemo(() => {
    const assignments =
      bookingResponse?.lastSeatAssignment?.assignments ??
      manageOptions?.seatAssignments?.map((assignment) => ({
        passengerId: assignment.passengerId,
        seatId: assignment.seatId,
        status: assignment.status,
        surchargeAmount: assignment.surchargeAmount,
        currency: assignment.currency,
      }));
    if (!assignments?.length) return new Map<number, AssignedSeatMeta>();
    const next = new Map<number, AssignedSeatMeta>();
    for (const a of assignments) {
      if (a.seatId == null || a.seatId <= 0) continue;
      const isYours = activePassengerId != null && a.passengerId === activePassengerId;
      next.set(a.seatId, {
        label: isYours ? 'Đã chọn' : 'Đã giữ',
        isYours,
        surchargeAmount: a.surchargeAmount,
        currency: a.currency,
      });
    }
    return next;
  }, [
    bookingResponse?.lastSeatAssignment?.assignments,
    manageOptions?.seatAssignments,
    activePassengerId,
  ]);

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
    const confirmedServicesByPassengerId =
      bookingResponse?.confirmedServicesByPassengerId ??
      buildConfirmedServicesLookupFromManageOptions(manageOptions);
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
  }, [bookingResponse?.confirmedServicesByPassengerId, manageOptions, servicesQuery.data?.services]);

  const activePassengerServices = activePassengerId
    ? (servicesByPassengerId[activePassengerId] ?? [])
    : [];
  const confirmedActivePassengerServices = useMemo(() => {
    if (activePassengerId == null) return [];

    const confirmedSelections = bookingResponse?.confirmedServicesByPassengerId?.[activePassengerId];
    if (confirmedSelections?.length) {
      return confirmedSelections
        .filter((selection) => selection.optionId > 0)
        .map((selection) => ({
          optionId: selection.optionId,
          name: selection.optionName,
          serviceName: selection.serviceName,
          quantity: Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
          price: selection.price,
        }));
    }

    return (manageOptions?.serviceSelections ?? [])
      .filter(
        (selection) => selection.passengerId === activePassengerId && (selection.optionId ?? 0) > 0
      )
      .map((selection) => ({
        optionId: selection.optionId as number,
        name: selection.optionName ?? `Option ${selection.optionId}`,
        serviceName: selection.serviceName ?? 'Dich vu bo sung',
        quantity: Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
        price: selection.price,
      }));
  }, [
    activePassengerId,
    bookingResponse?.confirmedServicesByPassengerId,
    manageOptions?.serviceSelections,
  ]);
  const activePassengerServiceStatus =
    activePassengerId != null
      ? (serviceSaveStatusByPassengerId[activePassengerId] ?? 'idle')
      : 'idle';
  const highlightedService = activePassengerServices[activePassengerServices.length - 1] ?? null;
  const pricing = bookingResponse?.pricing ?? bookingDraft.pricing;
  const serviceCurrency =
    activePassengerServices[0]?.currency ??
    manageOptions?.currency ??
    servicesQuery.data?.currency ??
    pricing?.currency ??
    'VND';
  const totalServicePrice = activePassengerServices.reduce(
    (total, service) => total + service.price,
    0
  );
  const confirmedTotalServicePrice = confirmedActivePassengerServices.reduce(
    (total, service) => total + service.price * service.quantity,
    0
  );
  const activePassengerProfile = passengers[activePassengerIndex] ?? null;
  const totalPriceLabel = pricing
    ? formatMoney(pricing.discountedTotalPrice, pricing.currency || 'VND')
    : manageOptions && bookingLookup
      ? formatMoney(bookingLookup.booking.totalAmount, bookingLookup.booking.currency || manageOptions.currency)
      : null;
  const confirmedSeatAssignment = useMemo(() => {
    if (activePassengerId == null) return null;
    const latestAssignment = bookingResponse?.lastSeatAssignment?.assignments?.find(
      (assignment) => assignment.passengerId === activePassengerId
    );
    if (latestAssignment) return latestAssignment;
    return (
      manageOptions?.seatAssignments?.find(
        (assignment) => assignment.passengerId === activePassengerId
      ) ?? null
    );
  }, [activePassengerId, bookingResponse?.lastSeatAssignment?.assignments, manageOptions?.seatAssignments]);
  const confirmedSeat =
    confirmedSeatAssignment?.seatId != null && selectedSeat?.seatId === confirmedSeatAssignment.seatId
      ? selectedSeat
      : null;
  const seatDetails = findSeatCellById(
    seatMapQuery.data?.rows,
    confirmedSeatAssignment?.seatId ?? null
  );
  const passengerSeatLabelByPassengerId = useMemo(() => {
    const next = new Map<number, string>();

    for (const assignment of bookingResponse?.lastSeatAssignment?.assignments ?? []) {
      const passengerId = pickNumericId(assignment.passengerId);
      if (passengerId == null) continue;

      const mappedSeatNumber =
        assignment.seatId === selectedSeat?.seatId
          ? selectedSeat.seatNumber
          : findSeatCellById(seatMapQuery.data?.rows, assignment.seatId)?.seatNumber;

      if (mappedSeatNumber) {
        next.set(passengerId, mappedSeatNumber);
      }
    }

    for (const assignment of manageOptions?.seatAssignments ?? []) {
      const passengerId = pickNumericId(assignment.passengerId);
      const seatNumber = assignment.seatNumber?.trim();
      if (passengerId == null || !seatNumber || next.has(passengerId)) continue;
      next.set(passengerId, seatNumber);
    }

    for (const passenger of bookingLookup?.passengers ?? []) {
      const passengerId = pickNumericId(passenger.passengerId);
      const seatNumber = (passenger.selections?.seats ?? passenger.seatAssignments ?? [])[0]?.seatNumber;
      if (passengerId == null || !seatNumber || next.has(passengerId)) continue;
      next.set(passengerId, seatNumber);
    }

    return next;
  }, [
    bookingLookup?.passengers,
    bookingResponse?.lastSeatAssignment?.assignments,
    manageOptions?.seatAssignments,
    seatMapQuery.data?.rows,
    selectedSeat,
  ]);
  const confirmedSeatNumber =
    seatDetails?.seatNumber ?? confirmedSeat?.seatNumber ?? activePassengerProfile?.seat ?? null;
  const seatPriceLabel = normalizeSeatPriceText(
    confirmedSeat?.displayPrice?.text ?? seatDetails?.displayPrice?.text
  );
  const summaryItinerary = manageOptions?.itineraries?.[0] ?? null;
  const summaryHeader = useMemo(
    () =>
      summaryItinerary
        ? {
            itineraryLabel: formatItineraryRouteLabel(summaryItinerary),
            flightMetaLabel: formatItineraryMetaLabel(summaryItinerary),
          }
        : buildSummaryHeaderFromRawBooking(bookingResponse, seatContext),
    [bookingResponse, seatContext, summaryItinerary]
  );
  const summaryPassengerItems = useMemo(
    () =>
      passengers.map((passenger, index) => ({
        passengerId: resolveStorePassengerId(passengerSource[index]),
        fullName: passenger.fullName,
        passengerType:
          passengerSource[index] &&
          typeof passengerSource[index] === 'object' &&
          'passengerType' in passengerSource[index]
            ? String(passengerSource[index].passengerType ?? '')
            : null,
      })),
    [passengerSource, passengers]
  );
  const summaryFareAmountLabel =
    pricing != null ? formatMoney(pricing.baseFare, pricing.currency || 'VND') : null;
  const summaryTaxFeeItems = pricing
    ? [
        { label: 'Thuế', value: formatMoney(pricing.taxes, pricing.currency || 'VND') },
        { label: 'Phí', value: formatMoney(pricing.fees, pricing.currency || 'VND') },
      ]
    : [];
  const summaryTaxFeeTotalLabel =
    pricing != null
      ? formatMoney((pricing.taxes ?? 0) + (pricing.fees ?? 0), pricing.currency || 'VND')
      : null;
  const summarySeatItems = useMemo(() => {
    const assignments =
      bookingResponse?.lastSeatAssignment?.assignments ?? manageOptions?.seatAssignments ?? [];

    return assignments
      .map((assignment) => {
        const passengerId = pickNumericId(assignment.passengerId);
        const seatId = pickNumericId(assignment.seatId);
        if (passengerId == null || seatId == null) return null;
        const seatCell = findSeatCellById(seatMapQuery.data?.rows, seatId);
        const passengerName =
          summaryPassengerItems.find((item) => item.passengerId === passengerId)?.fullName ??
          `Hành khách ${passengerId}`;
        const seatNumber =
          seatCell?.seatNumber ??
          ('seatNumber' in assignment && typeof assignment.seatNumber === 'string'
            ? assignment.seatNumber
            : `Seat ${seatId}`);
        const surchargeAmount =
          'surchargeAmount' in assignment && typeof assignment.surchargeAmount === 'number'
            ? assignment.surchargeAmount
            : 0;
        const currency =
          'currency' in assignment && typeof assignment.currency === 'string'
            ? assignment.currency
            : pricing?.currency ?? manageOptions?.currency ?? 'VND';

        return {
          passengerId,
          passengerName,
          seatNumber,
          seatTypeLabel: seatCell?.seatTypeDisplay?.label ?? null,
          seatCategoryLabel: seatCell?.seatCategoryDisplay?.label ?? null,
          surchargeLabel: formatMoney(surchargeAmount, currency),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [
    bookingResponse?.lastSeatAssignment?.assignments,
    manageOptions?.currency,
    manageOptions?.seatAssignments,
    pricing?.currency,
    seatMapQuery.data?.rows,
    summaryPassengerItems,
  ]);
  const summaryServiceItems = useMemo(() => {
    const next: Array<{
      passengerId: number;
      passengerName: string;
      serviceName: string;
      optionName: string;
      quantity: number;
      totalPriceLabel: string;
    }> = [];

    const confirmedServiceEntries = Object.entries(
      bookingResponse?.confirmedServicesByPassengerId ?? {}
    );

    if (confirmedServiceEntries.length > 0) {
      for (const [passengerIdText, selections] of confirmedServiceEntries) {
        const passengerId = Number(passengerIdText);
        if (!Number.isFinite(passengerId)) continue;
        const passengerName =
          summaryPassengerItems.find((item) => item.passengerId === passengerId)?.fullName ??
          `Hành khách ${passengerId}`;

        for (const selection of selections) {
          next.push({
            passengerId,
            passengerName,
            serviceName: selection.serviceName,
            optionName: selection.optionName,
            quantity:
              Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
            totalPriceLabel: formatMoney(
              selection.price * (Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1),
              serviceCurrency
            ),
          });
        }
      }

      return next;
    }

    for (const selection of manageOptions?.serviceSelections ?? []) {
      const passengerId = pickNumericId(selection.passengerId);
      if (passengerId == null || (selection.optionId ?? 0) <= 0) continue;
      const quantity =
        Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1;
      const passengerName =
        summaryPassengerItems.find((item) => item.passengerId === passengerId)?.fullName ??
        `Hành khách ${passengerId}`;
      next.push({
        passengerId,
        passengerName,
        serviceName: selection.serviceName ?? 'Dich vu bo sung',
        optionName: selection.optionName ?? `Option ${selection.optionId}`,
        quantity,
        totalPriceLabel: formatMoney(
          selection.price * quantity,
          manageOptions?.currency ?? serviceCurrency
        ),
      });
    }

    return next;
  }, [
    bookingResponse?.confirmedServicesByPassengerId,
    manageOptions?.currency,
    manageOptions?.serviceSelections,
    serviceCurrency,
    summaryPassengerItems,
  ]);
  const summaryServiceTotalAmount = useMemo(
    () =>
      summaryServiceItems.reduce((total, item) => {
        const match = item.totalPriceLabel.replace(/[^\d]/g, '');
        const numeric = Number(match);
        return total + (Number.isFinite(numeric) ? numeric : 0);
      }, 0),
    [summaryServiceItems]
  );
  const summaryServiceTotalLabel =
    summaryServiceItems.length > 0 ? formatMoney(summaryServiceTotalAmount, serviceCurrency) : null;
  const seatMapError =
    !seatContext.flightId || !seatContext.fareId
      ? 'Khong tim thay flightId/fareId trong store de tai so do ghe.'
      : manageOptionsQuery.error instanceof Error
        ? manageOptionsQuery.error.message
      : seatMapQuery.error instanceof Error
        ? seatMapQuery.error.message
        : seatMapQuery.isError
          ? 'Khong the tai so do ghe luc nay.'
          : null;
  const servicesError =
    !seatContext.flightId || !seatContext.fareId
      ? 'Khong tim thay flightId/fareId trong store de tai danh sach dich vu.'
      : manageOptionsQuery.error instanceof Error
        ? manageOptionsQuery.error.message
      : servicesQuery.error instanceof Error
        ? servicesQuery.error.message
        : servicesQuery.isError
          ? 'Khong the tai danh sach dich vu luc nay.'
          : null;
  const selectionMode = isSeatSelecting ? 'seat' : isServiceSelecting ? 'service' : 'overview';
  const openSeatSelection = () => {
    setIsSeatSelecting(true);
    setIsServiceSelecting(false);
  };

  const openServiceSelection = () => {
    setIsServiceSelecting(true);
    setIsSeatSelecting(false);
  };

  const returnToOverview = () => {
    setIsSeatSelecting(false);
    setIsServiceSelecting(false);
  };

  const handleSeatPreview = (seat: SeatSelectionValue) => {
    setSelectedSeat(seat);
  };

  const handleSeatConfirm = (seat: SeatSelectionValue) => {
    setSelectedSeat(seat);
    const bookingIdNumeric = manageBookingId;
    if (bookingIdNumeric == null) return;
    const passengerId = activePassengerId;
    if (passengerId == null) return;
    if (assignInFlight.current) return;
    assignInFlight.current = true;
    const currentSeatId = confirmedSeatAssignment?.seatId;
    if (currentSeatId != null) {
      changeSeatMutation.mutate(
        {
          bookingId: bookingIdNumeric,
          passengerId,
          fromSeatId: currentSeatId,
          toSeatId: seat.seatId,
        },
        {
          onSettled: () => {
            assignInFlight.current = false;
          },
        }
      );
      return;
    }

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
    const bookingIdNumeric = manageBookingId;
    if (bookingIdNumeric == null) return;
    const passengerId = activePassengerId;
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
    const bookingIdNumeric = manageBookingId;
    if (bookingIdNumeric == null || activePassengerId == null) return;
    const passengerName = activePassengerProfile?.fullName?.trim() || `Hanh khach ${activePassengerIndex + 1}`;
    const services = servicesByPassengerId[activePassengerId] ?? [];
    const selections = buildSelectionsFromSelectedServices(services);

    hydratedPassengersRef.current.add(activePassengerId);
    setServiceSaveStatusByPassengerId((current) => ({
      ...current,
      [activePassengerId]: 'saving',
    }));

    servicesMutation.mutate(
      {
        bookingId: bookingIdNumeric,
        passengerId: activePassengerId,
        passengerName,
        selections,
      },
      {
        onSuccess: (data, variables) => {
          if (bookingResponse) {
            applyServicesAssignmentResult(data, [variables.passengerId]);
          }
          if (isManageBookingFlow) {
            void manageOptionsQuery.refetch();
          }
          setServiceSaveStatusByPassengerId((current) => ({
            ...current,
            [variables.passengerId]: 'saved',
          }));
          toast.success(`Da them dich vu cho ${variables.passengerName}.`);
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
      <main className="relative z-10 mx-auto min-h-svh max-w-7xl gap-6 px-4 pb-16 sm:px-6 xl:px-8">
        {!isSeatSelecting && !isServiceSelecting && (
          <div className="mb-6 flex flex-col gap-5 xl:mb-0 xl:flex-row xl:items-start">
            <div className="flex w-full flex-col gap-5 xl:min-w-0 xl:flex-1">
              <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md">
                <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-secondary">
                  Select Passenger
                </p>
                <div className="flex flex-wrap gap-3">
                  {passengers.map((p, idx) => {
                    const passengerId = resolveStorePassengerId(passengerSource[idx]);
                    const seatLabel =
                      passengerId != null
                        ? (passengerSeatLabelByPassengerId.get(passengerId) ?? p.seat)
                        : p.seat;
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
                          {seatLabel ? (
                            <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-tighter text-luxury-gold">
                              Seat: {seatLabel}
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
                className="flex flex-row items-center gap-4 rounded-xl border border-luxury-gold/10 bg-white/60 p-5 shadow-sm backdrop-blur-md duration-200 hover:shadow-lg h-40"
                onClick={() => {
                  openSeatSelection();
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
                  openServiceSelection();
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

            <div className="w-full xl:w-[23rem] xl:shrink-0">
              <BookingSummaryPanel
                itineraryLabel={summaryHeader.itineraryLabel}
                flightMetaLabel={summaryHeader.flightMetaLabel}
                totalPriceLabel={totalPriceLabel}
                passengersCount={passengers.length}
                passengerItems={summaryPassengerItems}
                fareAmountLabel={summaryFareAmountLabel}
                taxFeeTotalLabel={summaryTaxFeeTotalLabel}
                taxFeeItems={summaryTaxFeeItems}
                seatItems={summarySeatItems}
                serviceItems={summaryServiceItems}
                serviceTotalLabel={summaryServiceTotalLabel}
              />
              <div className="hidden w-full rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-5 shadow-lg xl:sticky xl:top-28 xl:w-[23rem]">
              <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Tóm tắt</h3>
              <p className="text-sm text-on-surface-variant">
                Flight #{seatContext.flightId ?? '--'}
                {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
              </p>
              {totalPriceLabel ? (
                <p className="mt-6 text-2xl font-black text-secondary">{totalPriceLabel}</p>
              ) : null}
              <p className="text-xs text-on-surface-variant">{passengers.length} khach</p>

              {confirmedSeatNumber ? (
                <div className="mt-4 rounded-lg bg-midnight-burgundy/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-midnight-burgundy">
                    Ghe da chon
                  </p>
                  <p className="mt-1 text-lg font-black text-secondary">
                    {confirmedSeatNumber}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {seatDetails?.seatTypeDisplay?.label ??
                      confirmedSeat?.seatTypeDisplay?.label ??
                      'Seat'}{' '}
                    |{' '}
                    {seatDetails?.seatCategoryDisplay?.label ??
                      confirmedSeat?.seatCategoryDisplay?.label ??
                      confirmedSeat?.seatCategory}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {seatPriceLabel ?? 'Selected'}
                  </p>
                </div>
              ) : null}

              {confirmedActivePassengerServices.length > 0 && (
                <div className="mt-6 space-y-2 border-t border-outline-variant/20 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Dich vu bo sung
                  </p>
                  {confirmedActivePassengerServices.map((service) => (
                    <div
                      key={service.optionId}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span className="text-on-surface-variant">
                        {service.name}
                        {service.quantity > 1 ? ` x${service.quantity}` : ''}
                      </span>
                      <span className="text-right font-bold text-secondary">
                        {formatMoney(service.price * service.quantity, serviceCurrency)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-outline-variant/20 pt-2">
                    <div className="flex justify-between font-bold text-midnight-burgundy">
                      <span>Dich vu:</span>
                      <span>{formatMoney(confirmedTotalServicePrice, serviceCurrency)}</span>
                    </div>
                  </div>
                </div>
              )}

                <div className="mt-8 flex h-12 flex-row gap-3">
                  <Link
                    to="/"
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
          </div>
        )}

        {selectionMode === 'seat' && (
          <section className="mb-6">
            <AircraftSeatsMap
              seatMap={seatMapQuery.data ?? null}
              loading={canLoadSeatMap && seatMapQuery.isPending}
              error={seatMapError}
              selectedSeat={selectedSeat}
              assignedSeatBySeatId={assignedSeatMetaBySeatId}
              seatConfirmLoading={
                assignSeatMutation.isPending ||
                changeSeatMutation.isPending ||
                cancelSeatMutation.isPending
              }
              showDetailPanel
              headerSubtitle={`Flight #${seatContext.flightId ?? '--'}${seatContext.fareCode ? ` - ${seatContext.fareCode}` : ''}`}
              onSeatPreview={handleSeatPreview}
              onSeatConfirm={handleSeatConfirm}
              onSeatCancel={handleSeatCancel}
              onClose={returnToOverview}
            />
          </section>
        )}

        {selectionMode === 'service' && (
          <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="min-w-0">
              {isServiceSelecting && (
                <AdditionalService
                  services={servicesQuery.data?.services ?? []}
                  loading={canLoadServices && servicesQuery.isPending}
                  error={servicesError}
                  selectedServices={activePassengerServices}
                  confirmLoading={activePassengerServiceStatus === 'saving'}
                  onSelectedServicesChange={handleActivePassengerServicesChange}
                  onConfirm={handleServicesConfirm}
                  onClose={returnToOverview}
                />
              )}
            </div>

            <div className="w-full xl:w-[22rem] xl:shrink-0 xl:self-start">
              <ServiceDetailPanel
                seatContext={seatContext}
                totalPriceLabel={totalPriceLabel}
                passengersCount={passengers.length}
                activePassengerName={activePassengerProfile?.fullName ?? null}
                highlightedService={highlightedService}
                activePassengerServices={activePassengerServices}
                totalServicePrice={totalServicePrice}
                serviceCurrency={serviceCurrency}
                confirmLoading={activePassengerServiceStatus === 'saving'}
                onConfirm={handleServicesConfirm}
                onClose={returnToOverview}
              />
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
