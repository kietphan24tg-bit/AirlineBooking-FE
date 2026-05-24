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
import {
  pickNumericId,
  resolveConfirmedSeatAssignments,
  resolveManageBookingId,
  resolvePassengerDisplayData,
  resolveSeatContextFromSources,
  type ResolvedSeatAssignment,
  type SeatContext,
} from './seat-selection/seatSelectionResolvers';
import { useSeatAssignmentActions } from './seat-selection/useSeatAssignmentActions';
import { useSeatSelectionSummaryModel } from './seat-selection/useSeatSelectionSummaryModel';

type ServiceSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ServicesBySegmentPassengerKey = Record<string, SelectedServiceOption[]>;
type ServiceSaveStatusBySegmentPassengerKey = Record<string, ServiceSaveStatus>;

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

function buildSegmentPassengerKey(
  flightId: number | null | undefined,
  passengerId: number | null | undefined
): string | null {
  if (!flightId || !passengerId) return null;
  return `${flightId}:${passengerId}`;
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
      quantity:
        Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
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
): Record<number, SelectedServiceOption[]> {
  const optionLookup = createSelectedServicesLookup(services);
  const next: Record<number, SelectedServiceOption[]> = {};

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

function SegmentTabs({
  segments,
  selectedDirection,
  onChange,
}: {
  segments: SeatContext['segments'];
  selectedDirection: 'OUTBOUND' | 'INBOUND';
  onChange: (direction: 'OUTBOUND' | 'INBOUND') => void;
}) {
  if (segments.length <= 1) return null;

  return (
    <div className="mb-5 rounded-xl border border-luxury-gold/20 bg-white/75 p-3 shadow-sm backdrop-blur-md">
      <div className="grid gap-2 sm:grid-cols-2">
        {segments.map((segment) => {
          const active = selectedDirection === segment.direction;
          return (
            <button
              key={`${segment.direction}-${segment.flightId}-${segment.fareId}`}
              type="button"
              onClick={() => onChange(segment.direction)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                active
                  ? 'border-midnight-burgundy bg-midnight-burgundy text-white'
                  : 'border-outline-variant/50 bg-surface text-on-surface hover:border-luxury-gold/40'
              }`}
            >
              <p className="text-sm font-black uppercase tracking-[0.14em]">
                {segment.direction === 'OUTBOUND' ? 'Outbound' : 'Return'}
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  active ? 'text-white/90' : 'text-on-surface-variant'
                }`}
              >
                Flight #{segment.flightId}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getSeatAssignmentErrorMessage(error: unknown, fallback: string): string {
  const status =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response
      ? error.response.status
      : null;

  if (status === 410) {
    return 'This booking session has expired. Please book the flight again.';
  }

  const code =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data &&
    error.response.data.error &&
    typeof error.response.data.error === 'object' &&
    'code' in error.response.data.error &&
    typeof error.response.data.error.code === 'string'
      ? error.response.data.error.code
      : null;

  if (code === 'BOOKING_EXPIRED') {
    return 'This booking session has expired. Please book the flight again.';
  }

  const backendMessage =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data &&
    error.response.data.error &&
    typeof error.response.data.error === 'object' &&
    'message' in error.response.data.error &&
    typeof error.response.data.error.message === 'string'
      ? error.response.data.error.message
      : null;

  if (backendMessage?.trim()) {
    return backendMessage;
  }

  return error instanceof Error && error.message ? error.message : fallback;
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
      return 'This booking has expired or is no longer available for seat and service selection.';
    }
    return null;
  }

  if (draftExpired) {
    return 'Your fare hold has expired. Please select your flight again.';
  }

  if (
    isTerminalBookingStatus(bookingResponseStatus) ||
    isExpiredTimestamp(bookingResponseExpiresAt)
  ) {
    return 'Your booking has expired or is no longer available. Please book the flight again.';
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

function _LegacySummaryPanel({
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
      <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Summary</h3>
      <p className="text-sm text-on-surface-variant">
        Flight #{seatContext.flightId ?? '--'}
        {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
      </p>

      {totalPriceLabel ? (
        <p className="mt-6 text-2xl font-black text-secondary">{totalPriceLabel}</p>
      ) : null}
      <p className="text-xs text-on-surface-variant">{passengersCount} passengers</p>

      {confirmedSeatNumber || activePassengerServices.length > 0 ? (
        <div className="mt-5 space-y-3 border-t border-outline-variant/20 pt-4">
          {confirmedSeatNumber ? (
            <div className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-bold text-midnight-burgundy">Seat</p>
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
                  <p className="font-bold text-midnight-burgundy">Services</p>
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
          Cancel
        </Link>
        <Link
          to="/booking/checkout"
          className="auth-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-md px-4 text-white transition-all hover:bg-midnight-burgundy/90"
        >
          Payment
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

function _InspectorSummaryPanel({
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
    seatDetails?.seatTypeDisplay?.label ?? selectedSeat?.seatTypeDisplay?.label ?? 'Not selected';
  const seatCategoryLabel =
    seatDetails?.seatCategoryDisplay?.label ??
    selectedSeat?.seatCategoryDisplay?.label ??
    selectedSeat?.seatCategory ??
    'Not selected';
  const seatStatusLabel = confirmedSeatNumber ? 'Confirmed' : 'Not selected';
  const seatIncludedLabel = seatDetails ? (seatDetails.included ? 'Yes' : 'No') : '--';
  const serviceSummaryLabel =
    serviceNames.length > 0 ? serviceNames.join(', ') : 'No service selected';
  const servicePriceLabel =
    activePassengerServices.length > 0 ? formatMoney(totalServicePrice, serviceCurrency) : '--';
  const serviceHeroTitle = highlightedService?.name ?? 'No service selected';
  const serviceHeroPrice = highlightedService?.priceLabel ?? servicePriceLabel;
  const serviceDescription =
    highlightedService?.description ?? 'Chon dich vu de xem thong tin chi tiet.';
  const serviceTypeLabel = highlightedService?.serviceName ?? 'Additional service';

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
        {activePassengerName ?? 'Passenger'}
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
          <span className="font-bold">Service:</span> {serviceTypeLabel}
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
            Estimated total
          </p>
          <p className="mt-2 text-3xl font-black text-secondary">{totalPriceLabel}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{passengersCount} passengers</p>
        </div>
      ) : null}

      <div className="mt-8 flex h-12 flex-row gap-3">
        <Link
          to="/"
          className="inline-flex w-24 items-center justify-center gap-2 rounded-md bg-cabin-silver px-4"
        >
          Cancel
        </Link>
        <Link
          to="/booking/checkout"
          className="auth-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-md px-4 text-white transition-all hover:bg-midnight-burgundy/90"
        >
          Payment
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
  seatContext: _seatContext,
  totalPriceLabel: _totalPriceLabel,
  passengersCount: _passengersCount,
  activePassengerName: _activePassengerName,
  highlightedService: _highlightedService,
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
                  className="rounded-lg border border-outline-variant/15 bg-surface-container-lowest px-3 py-3"
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
              No services selected yet.
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
          {confirmLoading ? 'Saving...' : 'Confirm services'}
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
  tripSegments: Array<{
    direction: 'OUTBOUND' | 'INBOUND' | null;
    flightId: number | null;
    itineraryLabel: string | null;
    flightMetaLabel: string | null;
    fareAmountLabel: string | null;
    taxFeeItems: Array<{ label: string; value: string }>;
    taxFeeTotalLabel: string | null;
  }>;
  totalPriceLabel: string | null;
  passengersCount: number;
  passengerItems: Array<{
    passengerId: number | null;
    fullName: string;
    passengerType: string | null;
  }>;
  fareAmountLabel: string | null;
  discountAmountLabel: string | null;
  taxFeeTotalLabel: string | null;
  taxFeeItems: Array<{ label: string; value: string }>;
  seatItems: Array<{
    flightId: number | null;
    passengerId: number;
    passengerName: string;
    seatNumber: string;
    seatTypeLabel: string | null;
    seatCategoryLabel: string | null;
    surchargeAmount: number;
    currency: string;
    surchargeLabel: string;
  }>;
  serviceItems: Array<{
    flightId: number | null;
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
  if (value === 'ADULT') return 'Adult';
  if (value === 'CHILD') return 'Child';
  if (value === 'INFANT') return 'Infant';
  return 'Passenger';
}

function formatSummarySeatLabel(seatNumber: string): string {
  return seatNumber.replace(/^Seat\s+/i, '').trim();
}

function isGenericSegmentItineraryLabel(
  label: string | null | undefined,
  direction: 'OUTBOUND' | 'INBOUND' | null
): boolean {
  if (!label) return true;
  const normalized = label.trim().toLowerCase();
  if (normalized === 'outbound flight' && direction === 'OUTBOUND') return true;
  if (normalized === 'return flight' && direction === 'INBOUND') return true;
  return false;
}

function SummaryTripCard({
  segment,
  passengersCount,
  fareAmountLabel,
  taxFeeTotalLabel,
  seatTotalLabel,
  serviceTotalLabel,
  passengerItems = [],
  taxFeeItems = [],
  seatItems = [],
  serviceItems = [],
}: {
  segment: {
    direction: 'OUTBOUND' | 'INBOUND' | null;
    flightId: number | null;
    itineraryLabel: string | null;
    flightMetaLabel: string | null;
    fareAmountLabel: string | null;
    taxFeeItems: Array<{ label: string; value: string }>;
    taxFeeTotalLabel: string | null;
  };
  passengersCount: number;
  fareAmountLabel?: string | null;
  taxFeeTotalLabel?: string | null;
  seatTotalLabel?: string | null;
  serviceTotalLabel?: string | null;
  passengerItems?: Array<{
    passengerId: number | null;
    fullName: string;
    passengerType: string | null;
  }>;
  taxFeeItems?: Array<{ label: string; value: string }>;
  seatItems?: Array<{
    passengerId: number;
    passengerName: string;
    seatNumber: string;
    surchargeLabel: string;
  }>;
  serviceItems?: Array<{
    passengerId: number;
    passengerName: string;
    serviceName: string;
    optionName: string;
    quantity: number;
    totalPriceLabel: string;
  }>;
}) {
  const routeParts = segment.itineraryLabel?.split('->').map((part) => part.trim()) ?? [];
  const routeLabel =
    routeParts.length >= 2 ? `${routeParts[0]} -> ${routeParts[1]}` : segment.itineraryLabel;
  const showRouteLabel =
    routeLabel != null && !isGenericSegmentItineraryLabel(routeLabel, segment.direction);
  const segmentLabel =
    segment.direction === 'OUTBOUND'
      ? 'Outbound'
      : segment.direction === 'INBOUND'
        ? 'Return'
        : 'Segment';

  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-4">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
        {segmentLabel}
      </p>
      {showRouteLabel ? (
        <p className="mt-3 text-base font-black leading-snug text-on-surface">{routeLabel}</p>
      ) : null}
      {segment.flightMetaLabel ? (
        <p className={`${showRouteLabel ? 'mt-2' : 'mt-3'} text-sm text-on-surface-variant`}>
          {segment.flightMetaLabel}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-on-surface-variant">{passengersCount} passengers</p>

      <div className="mt-4 border-t border-outline-variant/15 pt-4">
        <BookingSummarySection title="Passenger details">
          <div className="space-y-3">
            {passengerItems.length > 0 ? (
              passengerItems.map((passenger) => (
                <div
                  key={`${passenger.passengerId ?? passenger.fullName}-segment`}
                  className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3"
                >
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                    {bookingPassengerTypeLabel(passenger.passengerType)}
                  </p>
                  <p className="mt-2 font-semibold text-on-surface">{passenger.fullName}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">No passenger details.</p>
            )}
          </div>
        </BookingSummarySection>
        <BookingSummarySection title="Fare" value={fareAmountLabel}>
          <div className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-semibold text-on-surface">Flight fare</p>
              <span className="font-black text-secondary">
                {segment.fareAmountLabel ?? fareAmountLabel ?? '--'}
              </span>
            </div>
          </div>
        </BookingSummarySection>
        <BookingSummarySection
          title="Taxes & fees"
          value={segment.taxFeeTotalLabel ?? taxFeeTotalLabel}
        >
          <div className="space-y-2">
            {(segment.taxFeeItems.length > 0 ? segment.taxFeeItems : taxFeeItems).length > 0 ? (
              (segment.taxFeeItems.length > 0 ? segment.taxFeeItems : taxFeeItems).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm"
                >
                  <span className="text-on-surface">{item.label}</span>
                  <span className="font-black text-secondary">{item.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">No taxes or fees.</p>
            )}
          </div>
        </BookingSummarySection>
        <BookingSummarySection title="Seats" value={seatTotalLabel ?? '0 đ'}>
          <div className="space-y-2">
            {seatItems.length > 0 ? (
              seatItems.map((seat) => (
                <div
                  key={`${seat.passengerId}-${seat.seatNumber}-segment`}
                  className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {seat.passengerName}
                      </p>
                      <p className="mt-2 font-semibold text-on-surface">
                        Seat {formatSummarySeatLabel(seat.seatNumber)}
                      </p>
                    </div>
                    <span className="text-sm font-black text-secondary">{seat.surchargeLabel}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">No seats selected.</p>
            )}
          </div>
        </BookingSummarySection>
        <BookingSummarySection title="Services" value={serviceTotalLabel ?? '0 đ'}>
          <div className="space-y-2">
            {serviceItems.length > 0 ? (
              serviceItems.map((service) => (
                <div
                  key={`${service.passengerId}-${service.serviceName}-${service.optionName}-segment`}
                  className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {service.passengerName}
                      </p>
                      <p className="mt-2 font-semibold text-on-surface">{service.serviceName}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {service.optionName}
                        {service.quantity > 1 ? ` x${service.quantity}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-black text-secondary">
                      {service.totalPriceLabel}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">No services selected.</p>
            )}
          </div>
        </BookingSummarySection>
      </div>
    </div>
  );
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
          {value ? (
            <span className="text-sm font-black tabular-nums text-secondary">{value}</span>
          ) : null}
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

function _BookingSummaryPanel({
  itineraryLabel,
  flightMetaLabel,
  tripSegments,
  totalPriceLabel,
  passengersCount,
  passengerItems,
  fareAmountLabel,
  discountAmountLabel,
  taxFeeTotalLabel,
  taxFeeItems,
  seatItems,
  serviceItems,
  serviceTotalLabel,
}: BookingSummaryPanelProps) {
  const groupedPassengers = passengerItems.reduce((map, passenger) => {
    const key = bookingPassengerTypeLabel(passenger.passengerType);
    map.set(key, [...(map.get(key) ?? []), passenger]);
    return map;
  }, new Map<string, BookingSummaryPanelProps['passengerItems']>());
  const summarySeatTotalLabel =
    seatItems.length > 0
      ? formatMoney(
          seatItems.reduce((total, seat) => total + seat.surchargeAmount, 0),
          seatItems[0]?.currency ?? 'VND'
        )
      : null;

  const itineraryParts = itineraryLabel?.split('✈').map((part) => part.trim()) ?? [];
  const itineraryFrom = itineraryParts[0] ?? itineraryLabel ?? 'Summary';
  const itineraryTo = itineraryParts[1] ?? null;

  return (
    <div className="w-full rounded-[1.75rem] border border-luxury-gold/20 bg-white/92 p-5 shadow-[0_22px_70px_rgba(81,35,20,0.12)] backdrop-blur-md xl:sticky xl:top-28 xl:w-[23rem]">
      <div className="border-b border-outline-variant/20 pb-5">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
          Trip summary
        </p>
        <div className="mt-4 space-y-4">
          {(tripSegments.length > 0
            ? tripSegments
            : [
                {
                  direction: null,
                  flightId: null,
                  itineraryLabel,
                  flightMetaLabel,
                  fareAmountLabel: fareAmountLabel ?? null,
                  taxFeeItems: taxFeeItems ?? [],
                  taxFeeTotalLabel: taxFeeTotalLabel ?? null,
                },
              ]
          ).map((segment, index) => (
            <SummaryTripCard
              key={`${segment.direction ?? 'segment'}-${segment.flightMetaLabel ?? index}`}
              segment={segment}
              passengersCount={passengersCount}
            />
          ))}
        </div>
        <div className="hidden mt-4 space-y-2">
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
        <p className="hidden mt-1 text-xs text-on-surface-variant">{passengersCount} passengers</p>
      </div>

      <div className="mt-5 space-y-4">
        <BookingSummarySection title="Passenger details">
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
          <BookingSummarySection title="Fare" value={fareAmountLabel}>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold text-on-surface">Flight fare</p>
                <span className="font-black text-secondary">{fareAmountLabel}</span>
              </div>
              {discountAmountLabel ? (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-outline-variant/10 pt-3 text-sm">
                  <p className="font-semibold text-on-surface">Discount</p>
                  <span className="font-black text-secondary">-{discountAmountLabel}</span>
                </div>
              ) : null}
            </div>
          </BookingSummarySection>
        ) : null}

        {taxFeeTotalLabel ? (
          <BookingSummarySection title="Taxes & fees" value={taxFeeTotalLabel}>
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
          <BookingSummarySection title="Seats" value={summarySeatTotalLabel}>
            <div className="space-y-3">
              {seatItems.map((seat) => (
                <div
                  key={`${seat.passengerId}-${seat.seatNumber}`}
                  className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-outline-variant/10 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {seat.passengerName}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-on-surface">Selected seat</p>
                      <p className="mt-1 text-lg font-bold leading-none tabular-nums text-on-surface">
                        {formatSummarySeatLabel(seat.seatNumber)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-sm font-black tabular-nums text-secondary">
                        {seat.surchargeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BookingSummarySection>
        ) : null}

        {serviceItems.length > 0 ? (
          <BookingSummarySection title="Services" value={serviceTotalLabel}>
            <div className="space-y-3">
              {serviceItems.map((service) => (
                <div
                  key={`${service.passengerId}-${service.serviceName}-${service.optionName}`}
                  className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-outline-variant/10 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {service.passengerName}
                      </span>
                      <p className="mt-3 text-base font-semibold leading-snug text-on-surface">
                        {service.serviceName}
                      </p>
                      <p className="mt-1 text-sm text-on-surface">
                        {service.optionName}
                        {service.quantity > 1 ? (
                          <span className="ml-2 inline-flex rounded-full bg-secondary/10 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-secondary">
                            x{service.quantity}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-sm font-black tabular-nums text-secondary">
                        {service.totalPriceLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BookingSummarySection>
        ) : null}
      </div>

      {totalPriceLabel ? (
        <div className="mt-6 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-4">
          <div className="grid grid-cols-1 gap-y-3">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
              Total payment
            </p>
            <p className="text-[1.95rem] font-black leading-none tabular-nums text-secondary">
              {totalPriceLabel}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex h-12 flex-row gap-3">
        <Link
          to="/"
          className="inline-flex w-24 items-center justify-center gap-2 rounded-md bg-cabin-silver px-4"
        >
          Cancel
        </Link>
        <Link
          to="/booking/checkout"
          className="auth-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-md px-4 text-white transition-all hover:bg-midnight-burgundy/90"
        >
          Payment
        </Link>
      </div>
    </div>
  );
}

function BookingSummaryPanelV2({
  itineraryLabel,
  flightMetaLabel,
  tripSegments,
  totalPriceLabel,
  passengersCount,
  passengerItems: _passengerItems,
  fareAmountLabel,
  discountAmountLabel: _discountAmountLabel,
  taxFeeTotalLabel,
  taxFeeItems: _taxFeeItems,
  seatItems,
  serviceItems: _serviceItems,
  serviceTotalLabel,
}: BookingSummaryPanelProps) {
  const resolvedTripSegments =
    tripSegments.length > 0
      ? tripSegments
      : [
          {
            direction: null,
            flightId: null,
            itineraryLabel,
            flightMetaLabel,
            fareAmountLabel: fareAmountLabel ?? null,
            taxFeeItems: _taxFeeItems ?? [],
            taxFeeTotalLabel: taxFeeTotalLabel ?? null,
          },
        ];

  return (
    <div className="w-full rounded-[1.75rem] border border-luxury-gold/20 bg-white/92 p-5 shadow-[0_22px_70px_rgba(81,35,20,0.12)] backdrop-blur-md xl:sticky xl:top-28 xl:w-[23rem]">
      <div className="pb-5">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
          Trip summary
        </p>
        <div className="mt-4 space-y-4">
          {resolvedTripSegments.map((segment, index) => {
            const segmentSeatItems =
              segment.flightId != null
                ? seatItems.filter((seat) => seat.flightId === segment.flightId)
                : seatItems;
            const segmentSeatTotalLabel =
              segmentSeatItems.length > 0
                ? formatMoney(
                    segmentSeatItems.reduce((total, seat) => total + seat.surchargeAmount, 0),
                    segmentSeatItems[0]?.currency ?? 'VND'
                  )
                : null;
            const segmentServiceItems =
              segment.flightId != null
                ? _serviceItems.filter(
                    (service) => service.flightId == null || service.flightId === segment.flightId
                  )
                : _serviceItems;
            const segmentServiceTotalLabel =
              segmentServiceItems.length > 0
                ? formatMoney(
                    segmentServiceItems.reduce((total, service) => {
                      const numeric = Number(service.totalPriceLabel.replace(/[^\d]/g, ''));
                      return total + (Number.isFinite(numeric) ? numeric : 0);
                    }, 0),
                    'VND'
                  )
                : null;

            return (
              <SummaryTripCard
                key={`${segment.direction ?? 'segment'}-${segment.flightMetaLabel ?? index}`}
                segment={segment}
                passengersCount={passengersCount}
                fareAmountLabel={segment.fareAmountLabel ?? fareAmountLabel}
                taxFeeTotalLabel={segment.taxFeeTotalLabel ?? taxFeeTotalLabel}
                seatTotalLabel={segmentSeatTotalLabel}
                serviceTotalLabel={segmentServiceTotalLabel ?? serviceTotalLabel}
                passengerItems={_passengerItems}
                taxFeeItems={segment.taxFeeItems.length > 0 ? segment.taxFeeItems : _taxFeeItems}
                seatItems={segmentSeatItems}
                serviceItems={segmentServiceItems}
              />
            );
          })}
        </div>
      </div>

      {totalPriceLabel ? (
        <div className="mt-2 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-4">
          <div className="grid grid-cols-1 gap-y-3">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
              Total payment
            </p>
            <p className="text-[1.95rem] font-black leading-none tabular-nums text-secondary">
              {totalPriceLabel}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex h-12 flex-row gap-3">
        <Link
          to="/"
          className="inline-flex w-24 items-center justify-center gap-2 rounded-md bg-cabin-silver px-4"
        >
          Cancel
        </Link>
        <Link
          to="/booking/checkout"
          className="auth-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-md px-4 text-white transition-all hover:bg-midnight-burgundy/90"
        >
          Payment
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
  const { passengers, passengerSource } = useMemo(
    () =>
      resolvePassengerDisplayData({
        isManageBookingFlow,
        bookingResponse,
        bookingLookup,
        manageOptions,
        navigationPassengers: navPassengers,
      }),
    [bookingLookup, bookingResponse, isManageBookingFlow, manageOptions, navPassengers]
  );

  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);
  const [isSeatSelecting, setIsSeatSelecting] = useState(
    location.pathname.endsWith('/seat-selection')
  );
  const [isServiceSelecting, setIsServiceSelecting] = useState(
    location.pathname.endsWith('/add-services')
  );
  const [servicesBySegmentPassengerKey, setServicesBySegmentPassengerKey] =
    useState<ServicesBySegmentPassengerKey>({});
  const [serviceSaveStatusBySegmentPassengerKey, setServiceSaveStatusBySegmentPassengerKey] =
    useState<ServiceSaveStatusBySegmentPassengerKey>({});
  const hydratedSegmentPassengerKeysRef = useRef<Set<string>>(new Set());
  const assignInFlight = useRef(false);
  const manageBookingId = resolveManageBookingId({
    manageOptions,
    bookingLookup,
    bookingResponse,
    preferManageBooking: isManageBookingFlow,
  });
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

  const baseSeatContext = useMemo(
    () =>
      resolveSeatContextFromSources({
        manageOptions,
        bookingResponse,
        bookingDraft,
      }),
    [bookingDraft, bookingResponse, manageOptions]
  );
  const [selectedSegmentDirection, setSelectedSegmentDirection] = useState<'OUTBOUND' | 'INBOUND'>(
    'OUTBOUND'
  );
  const availableSegments = useMemo(
    () =>
      baseSeatContext.segments.length > 0
        ? baseSeatContext.segments
        : baseSeatContext.flightId && baseSeatContext.fareId
          ? [
              {
                direction: 'OUTBOUND' as const,
                flightId: baseSeatContext.flightId,
                fareId: baseSeatContext.fareId,
                fareCode: baseSeatContext.fareCode,
              },
            ]
          : [],
    [baseSeatContext]
  );
  useEffect(() => {
    if (isManageBookingFlow) return;
    if (availableSegments.length === 0) return;
    if (availableSegments.some((segment) => segment.direction === selectedSegmentDirection)) return;
    setSelectedSegmentDirection(availableSegments[0].direction);
  }, [availableSegments, isManageBookingFlow, selectedSegmentDirection]);
  const seatContext = useMemo(() => {
    if (isManageBookingFlow) return baseSeatContext;
    const selected =
      availableSegments.find((segment) => segment.direction === selectedSegmentDirection) ??
      availableSegments[0];
    if (!selected) return baseSeatContext;
    return {
      ...baseSeatContext,
      flightId: selected.flightId,
      fareId: selected.fareId,
      fareCode: selected.fareCode,
      segments: availableSegments,
    };
  }, [availableSegments, baseSeatContext, isManageBookingFlow, selectedSegmentDirection]);
  const canLoadSeatMap = isSeatSelecting && !!seatContext.flightId && !!seatContext.fareId;
  const canLoadServices = isServiceSelecting && !!seatContext.flightId && !!seatContext.fareId;

  const activePassenger = passengerSource[activePassengerIndex];
  const activePassengerId = useMemo(
    () => resolveStorePassengerId(activePassenger),
    [activePassenger]
  );
  const activeServiceSelectionKey = useMemo(
    () => buildSegmentPassengerKey(seatContext.flightId, activePassengerId),
    [activePassengerId, seatContext.flightId]
  );
  useEffect(() => {
    setSelectedSeat(null);
  }, [seatContext.fareId, seatContext.flightId]);

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

  const confirmedSeatAssignments = useMemo<ResolvedSeatAssignment[]>(
    () => resolveConfirmedSeatAssignments({ bookingResponse, manageOptions }),
    [bookingResponse, manageOptions]
  );

  const assignedSeatMetaBySeatId = useMemo(() => {
    if (!confirmedSeatAssignments.length) return new Map<number, AssignedSeatMeta>();
    const next = new Map<number, AssignedSeatMeta>();
    for (const a of confirmedSeatAssignments) {
      if (a.seatId == null || a.seatId <= 0) continue;
      const isYours = activePassengerId != null && a.passengerId === activePassengerId;
      next.set(a.seatId, {
        label: isYours ? 'Selected' : 'Reserved',
        isYours,
        surchargeAmount: a.surchargeAmount,
        currency: a.currency,
      });
    }
    return next;
  }, [confirmedSeatAssignments, activePassengerId]);

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

  const { assignSeat, changeSeat, cancelSeat, isSeatMutationPending } = useSeatAssignmentActions({
    bookingResponse,
    isManageBookingFlow,
    applySeatAssignmentResult,
    currentFlightId: seatContext.flightId,
    refetchSeatMap: seatMapQuery.refetch,
    refetchManageOptions: manageOptionsQuery.refetch,
    onCancelSuccess: () => setSelectedSeat(null),
    getSeatAssignmentErrorMessage,
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
    const currentFlightId = seatContext.flightId;

    if (!currentFlightId || !Object.keys(hydratedServices).length) {
      return;
    }

    setServicesBySegmentPassengerKey((current) => {
      let changed = false;
      const next = { ...current };

      for (const [passengerIdText, services] of Object.entries(hydratedServices)) {
        const passengerId = Number(passengerIdText);
        const key = buildSegmentPassengerKey(currentFlightId, passengerId);
        if (
          !Number.isFinite(passengerId) ||
          !key ||
          hydratedSegmentPassengerKeysRef.current.has(key)
        ) {
          continue;
        }
        next[key] = services;
        hydratedSegmentPassengerKeysRef.current.add(key);
        changed = true;
      }

      return changed ? next : current;
    });

    setServiceSaveStatusBySegmentPassengerKey((current) => {
      const next = { ...current };
      let changed = false;

      for (const passengerIdText of Object.keys(confirmedServicesByPassengerId)) {
        const passengerId = Number(passengerIdText);
        const key = buildSegmentPassengerKey(currentFlightId, passengerId);
        if (!Number.isFinite(passengerId) || !key || next[key] === 'saved') continue;
        next[key] = 'saved';
        changed = true;
      }

      return changed ? next : current;
    });
  }, [
    bookingResponse?.confirmedServicesByPassengerId,
    manageOptions,
    seatContext.flightId,
    servicesQuery.data?.services,
  ]);

  const activePassengerServices = activeServiceSelectionKey
    ? (servicesBySegmentPassengerKey[activeServiceSelectionKey] ?? [])
    : [];
  const confirmedActivePassengerServices = useMemo(() => {
    if (activePassengerId == null) return [];

    const confirmedSelections =
      bookingResponse?.confirmedServicesByPassengerId?.[activePassengerId];
    if (confirmedSelections?.length) {
      return confirmedSelections
        .filter((selection) => selection.optionId > 0)
        .map((selection) => ({
          optionId: selection.optionId,
          name: selection.optionName,
          serviceName: selection.serviceName,
          quantity:
            Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
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
        serviceName: selection.serviceName ?? 'Additional service',
        quantity:
          Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1,
        price: selection.price,
      }));
  }, [
    activePassengerId,
    bookingResponse?.confirmedServicesByPassengerId,
    manageOptions?.serviceSelections,
  ]);
  const activePassengerServiceStatus =
    activeServiceSelectionKey != null
      ? (serviceSaveStatusBySegmentPassengerKey[activeServiceSelectionKey] ?? 'idle')
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
      ? formatMoney(
          bookingLookup.booking.totalAmount,
          bookingLookup.booking.currency || manageOptions.currency
        )
      : null;
  const confirmedSeatAssignment = useMemo(() => {
    if (activePassengerId == null || seatContext.flightId == null) return null;
    const latestAssignment = bookingResponse?.lastSeatAssignment?.assignments?.find(
      (assignment) =>
        assignment.passengerId === activePassengerId &&
        findSeatCellById(seatMapQuery.data?.rows, assignment.seatId) != null
    );
    if (latestAssignment) return latestAssignment;
    return (
      manageOptions?.seatAssignments?.find(
        (assignment) =>
          assignment.passengerId === activePassengerId &&
          assignment.flightId === seatContext.flightId
      ) ?? null
    );
  }, [
    activePassengerId,
    bookingResponse?.lastSeatAssignment?.assignments,
    manageOptions?.seatAssignments,
    seatContext.flightId,
    seatMapQuery.data?.rows,
  ]);
  const confirmedSeat =
    confirmedSeatAssignment?.seatId != null &&
    selectedSeat?.seatId === confirmedSeatAssignment.seatId
      ? selectedSeat
      : null;
  const seatDetails = findSeatCellById(
    seatMapQuery.data?.rows,
    confirmedSeatAssignment?.seatId ?? null
  );
  const confirmedSeatNumber =
    seatDetails?.seatNumber ?? confirmedSeat?.seatNumber ?? activePassengerProfile?.seat ?? null;
  const seatPriceLabel = normalizeSeatPriceText(
    confirmedSeat?.displayPrice?.text ?? seatDetails?.displayPrice?.text
  );
  const {
    totalPriceLabel: resolvedTotalPriceLabel,
    summaryHeader: resolvedSummaryHeader,
    summaryTripSegments: resolvedSummaryTripSegments,
    summaryPassengerItems: resolvedSummaryPassengerItems,
    summaryFareAmountLabel: resolvedSummaryFareAmountLabel,
    summaryDiscountAmountLabel: resolvedSummaryDiscountAmountLabel,
    summaryTaxFeeItems: resolvedSummaryTaxFeeItems,
    summaryTaxFeeTotalLabel: resolvedSummaryTaxFeeTotalLabel,
    summarySeatItems: resolvedSummarySeatItems,
    summaryServiceItems: resolvedSummaryServiceItems,
    summaryServiceTotalLabel: resolvedSummaryServiceTotalLabel,
  } = useSeatSelectionSummaryModel({
    bookingDraft,
    bookingResponse,
    bookingLookup,
    manageOptions,
    passengers,
    passengerSource,
    seatContext,
    seatMapRows: seatMapQuery.data?.rows,
    confirmedSeatAssignments,
    serviceCurrency,
  });
  const seatMapError =
    !seatContext.flightId || !seatContext.fareId
      ? 'Flight ID or fare ID was not found in the store for loading the seat map.'
      : manageOptionsQuery.error instanceof Error
        ? manageOptionsQuery.error.message
        : seatMapQuery.error instanceof Error
          ? seatMapQuery.error.message
          : seatMapQuery.isError
            ? 'Unable to load the seat map right now.'
            : null;
  const servicesError =
    !seatContext.flightId || !seatContext.fareId
      ? 'Flight ID or fare ID was not found in the store for loading the services list.'
      : manageOptionsQuery.error instanceof Error
        ? manageOptionsQuery.error.message
        : servicesQuery.error instanceof Error
          ? servicesQuery.error.message
          : servicesQuery.isError
            ? 'Unable to load the services list right now.'
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
    const passengerName =
      activePassengerProfile?.fullName?.trim() || `Passenger ${activePassengerIndex + 1}`;
    if (assignInFlight.current) return;
    assignInFlight.current = true;
    const currentSeatId = confirmedSeatAssignment?.seatId;
    if (currentSeatId != null) {
      changeSeat(
        {
          bookingId: bookingIdNumeric,
          passengerId,
          fromSeatId: currentSeatId,
          toSeatId: seat.seatId,
          passengerName,
        },
        {
          onSettled: () => {
            assignInFlight.current = false;
          },
        }
      );
      return;
    }

    assignSeat(
      { bookingId: bookingIdNumeric, passengerId, seatId: seat.seatId, passengerName },
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
    const passengerName =
      activePassengerProfile?.fullName?.trim() || `Passenger ${activePassengerIndex + 1}`;
    if (assignInFlight.current) return;
    assignInFlight.current = true;
    cancelSeat(
      { bookingId: bookingIdNumeric, passengerId, seatId: seat.seatId, passengerName },
      {
        onSettled: () => {
          assignInFlight.current = false;
        },
      }
    );
  };

  const handleActivePassengerServicesChange = (services: SelectedServiceOption[]) => {
    if (!activeServiceSelectionKey) return;
    hydratedSegmentPassengerKeysRef.current.add(activeServiceSelectionKey);
    setServicesBySegmentPassengerKey((current) => ({
      ...current,
      [activeServiceSelectionKey]: services,
    }));
    setServiceSaveStatusBySegmentPassengerKey((current) => ({
      ...current,
      [activeServiceSelectionKey]: 'idle',
    }));
  };

  const handleServicesConfirm = () => {
    const bookingIdNumeric = manageBookingId;
    if (bookingIdNumeric == null || activePassengerId == null || !activeServiceSelectionKey) return;
    const passengerName =
      activePassengerProfile?.fullName?.trim() || `Passenger ${activePassengerIndex + 1}`;
    const services = servicesBySegmentPassengerKey[activeServiceSelectionKey] ?? [];
    const selections = buildSelectionsFromSelectedServices(services);

    hydratedSegmentPassengerKeysRef.current.add(activeServiceSelectionKey);
    setServiceSaveStatusBySegmentPassengerKey((current) => ({
      ...current,
      [activeServiceSelectionKey]: 'saving',
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
            applyServicesAssignmentResult(data, [variables.passengerId], seatContext.flightId);
          }
          if (isManageBookingFlow) {
            void manageOptionsQuery.refetch();
          }
          setServiceSaveStatusBySegmentPassengerKey((current) => ({
            ...current,
            [activeServiceSelectionKey]: 'saved',
          }));
          toast.success(`Services added for ${variables.passengerName}.`);
        },
        onError: (error, _variables) => {
          setServiceSaveStatusBySegmentPassengerKey((current) => ({
            ...current,
            [activeServiceSelectionKey]: 'error',
          }));
          toast.error(
            getSeatAssignmentErrorMessage(error, 'Unable to update services. Please try again.')
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
                  {passengers.map((p, idx) => (
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
                      <p className="text-sm font-bold leading-tight text-midnight-burgundy">
                        {p.fullName}
                      </p>
                    </button>
                  ))}
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
                    Choose your seat
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Choose your preferred seat on the aircraft.
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
                    Choose additional services
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Add baggage, meals, insurance, and more.
                  </p>
                </div>
                <ChevronRight
                  className="ml-auto h-7 w-7 shrink-0 text-on-surface-variant"
                  strokeWidth={2}
                />
              </button>
            </div>

            <div className="w-full xl:w-[23rem] xl:shrink-0">
              <BookingSummaryPanelV2
                itineraryLabel={resolvedSummaryHeader.itineraryLabel}
                flightMetaLabel={resolvedSummaryHeader.flightMetaLabel}
                tripSegments={resolvedSummaryTripSegments}
                totalPriceLabel={resolvedTotalPriceLabel}
                passengersCount={passengers.length}
                passengerItems={resolvedSummaryPassengerItems}
                fareAmountLabel={resolvedSummaryFareAmountLabel}
                discountAmountLabel={resolvedSummaryDiscountAmountLabel}
                taxFeeTotalLabel={resolvedSummaryTaxFeeTotalLabel}
                taxFeeItems={resolvedSummaryTaxFeeItems}
                seatItems={resolvedSummarySeatItems}
                serviceItems={resolvedSummaryServiceItems}
                serviceTotalLabel={resolvedSummaryServiceTotalLabel}
              />
              <div className="hidden w-full rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-5 shadow-lg xl:sticky xl:top-28 xl:w-[23rem]">
                <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Summary</h3>
                <p className="text-sm text-on-surface-variant">
                  Flight #{seatContext.flightId ?? '--'}
                  {seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}
                </p>
                {totalPriceLabel ? (
                  <p className="mt-6 text-2xl font-black text-secondary">{totalPriceLabel}</p>
                ) : null}
                <p className="text-xs text-on-surface-variant">{passengers.length} passengers</p>

                {confirmedSeatNumber ? (
                  <div className="mt-4 rounded-lg bg-midnight-burgundy/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-midnight-burgundy">
                      Ghe da chon
                    </p>
                    <p className="mt-1 text-lg font-black text-secondary">{confirmedSeatNumber}</p>
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
                      Additional services
                    </p>
                    {confirmedActivePassengerServices.map((service) => (
                      <div key={service.optionId} className="flex justify-between gap-3 text-sm">
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
                        <span>Services:</span>
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
                    Cancel
                  </Link>
                  <Link
                    to="/booking/checkout"
                    className="auth-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-md px-4 text-white transition-all hover:bg-midnight-burgundy/90"
                  >
                    Payment
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectionMode === 'seat' && (
          <section className="mb-6">
            {!isManageBookingFlow ? (
              <SegmentTabs
                segments={availableSegments}
                selectedDirection={selectedSegmentDirection}
                onChange={setSelectedSegmentDirection}
              />
            ) : null}
            <AircraftSeatsMap
              seatMap={seatMapQuery.data ?? null}
              loading={canLoadSeatMap && seatMapQuery.isPending}
              error={seatMapError}
              selectedSeat={selectedSeat}
              assignedSeatBySeatId={assignedSeatMetaBySeatId}
              seatConfirmLoading={isSeatMutationPending}
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
              {!isManageBookingFlow ? (
                <SegmentTabs
                  segments={availableSegments}
                  selectedDirection={selectedSegmentDirection}
                  onChange={setSelectedSegmentDirection}
                />
              ) : null}
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
                totalPriceLabel={resolvedTotalPriceLabel}
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
