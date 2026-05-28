import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  Info,
  Loader2,
  Plane,
  PlaneTakeoff,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PaymentCard from '../components/booking/PaymentCard';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import {
  bookingService,
  commitMockManageBookingVariant,
  resetMockManageBookingVariant,
  resolveMockManageBookingVariant,
} from '../services/booking.service';
import { flightService } from '../services/flight.service';
import {
  cancelPayment,
  createFlightChangePaymentLink,
  getPaymentMethods,
  getPaymentStatus,
} from '../services/payment.service';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  FlightChangeConfirmResponse,
  FlightChangeQuoteResponse,
} from '../types/booking.types';
import type { FlightCalendarDay, FlightLeg } from '../types/flight.types';
import type { CreatePaymentResponse, PaymentStatus } from '../types/payment-create.types';
import type { PaymentMethod } from '../types/payment.types';

interface DerivedFlight {
  id: string;
  flightId: number;
  flightNumber: string;
  departureCode: string;
  departureCity: string;
  departureTerminal: string | null;
  departureTime: string;
  departureDate: string;
  departureRaw: string;
  arrivalCode: string;
  arrivalCity: string;
  arrivalTerminal: string | null;
  arrivalTime: string;
  arrivalDate: string;
  arrivalRaw: string;
  durationLabel: string;
  cabin: string;
  fareName: string;
  changeable: boolean;
  changeFee: number;
  currency: string;
}

interface NewFlightOption {
  id: string;
  flightId: number;
  fareId: number;
  flightNumber: string;
  aircraft: string;
  departureCode: string;
  arrivalCode: string;
  departureTime: string;
  arrivalTime: string;
  durationLabel: string;
  cabin: string;
  fareName: string;
  priceAmount: number;
  priceLabel: string;
  currency: string;
}

interface PassengerDisplayItem {
  id: number;
  fullName: string;
  typeLabel: string;
}

interface SettlementSummary {
  originalFareAmount: number;
  newFareAmount: number;
  fareDifference: number;
  changeFee: number;
  additionalCharges: number;
  refunds: number;
  noChangeAmount: number;
  netAmount: number;
  mode: 'NO_CHANGE' | 'COLLECT_PAYMENT' | 'REFUND';
}

type FlightChangePaymentResultVariant =
  | 'saved'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'
  | 'error';

type FlightChangeRedirectContext = {
  paymentId: number;
  amount: number;
  currency: string;
  pnr: string;
  currentFlight: DerivedFlight | null;
  newFlight: NewFlightOption | null;
};

type CompletedFlightChange = {
  pnr: string;
  currentFlight: DerivedFlight;
  newFlight: NewFlightOption;
};

const FLIGHT_CHANGE_REDIRECT_CONTEXT_KEY = 'flight-change-payment-redirect-context';

const CHANGE_STEP_ITEMS = [
  { id: 1, label: 'Select flight' },
  { id: 2, label: 'Select new flight' },
  { id: 3, label: 'Confirm changes' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Complete' },
] as const;

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDayMonth(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatWeekday(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Flight day';
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).replace('.', '');
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function formatIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, offset: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayIso(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '--';
  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatMoney(amount: number | null | undefined, currency = 'VND'): string {
  if (!Number.isFinite(amount)) return '--';
  const safeAmount = amount as number;
  return `${safeAmount.toLocaleString('en-US')} ${currency}`;
}

function resolvePaymentId(response: CreatePaymentResponse | null): number | null {
  if (!response) return null;
  return response.payment?.id ?? response.payment?.paymentId ?? null;
}

function storeFlightChangeRedirectContext(context: FlightChangeRedirectContext): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(FLIGHT_CHANGE_REDIRECT_CONTEXT_KEY, JSON.stringify(context));
}

function readFlightChangeRedirectContext(): FlightChangeRedirectContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(FLIGHT_CHANGE_REDIRECT_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlightChangeRedirectContext;
  } catch {
    return null;
  }
}

function clearFlightChangeRedirectContext(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(FLIGHT_CHANGE_REDIRECT_CONTEXT_KEY);
}

function mapPaymentStatusToResultVariant(
  status: PaymentStatus | null | undefined
): FlightChangePaymentResultVariant | null {
  if (status === 'SUCCESS') return 'saved';
  if (status === 'FAILED') return 'payment_failed';
  if (status === 'CANCELLED' || status === 'CANCELED') return 'payment_cancelled';
  if (status === 'EXPIRED') return 'payment_expired';
  return null;
}

function getFlightChangePaymentErrorMessage(
  variant: Exclude<FlightChangePaymentResultVariant, 'saved'>
): string {
  switch (variant) {
    case 'payment_failed':
      return 'Payment failed. Please try again or choose a different method.';
    case 'payment_cancelled':
      return 'The transaction was cancelled before it was completed. Please create a new one to continue.';
    case 'payment_expired':
      return 'The payment link has expired. Please generate a new one to continue.';
    default:
      return 'Unable to confirm payment status right now. Please try again.';
  }
}

function cabinLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'ECONOMY') return 'Eco';
  if (normalized === 'PREMIUM') return 'Premium';
  if (normalized === 'BUSINESS') return 'Business';
  if (normalized === 'FIRST') return 'First';
  return value;
}

function passengerTypeLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'ADULT') return 'Adult';
  if (normalized === 'CHILD') return 'Child';
  if (normalized === 'INFANT') return 'Infant';
  return value;
}

function mapQuoteSummaryToSettlement(
  summary: FlightChangeQuoteResponse['summary']
): SettlementSummary {
  const additionalCharges = Math.max(summary.fareDifference, 0) + Math.max(summary.changeFee, 0);
  const refunds = Math.max(-summary.fareDifference, 0);
  return {
    originalFareAmount: summary.originalFareAmount,
    newFareAmount: summary.newFareAmount,
    fareDifference: summary.fareDifference,
    changeFee: summary.changeFee,
    additionalCharges,
    refunds,
    noChangeAmount: summary.netAmount === 0 ? 0 : 0,
    netAmount: summary.netAmount,
    mode:
      summary.netAmount > 0 ? 'COLLECT_PAYMENT' : summary.netAmount < 0 ? 'REFUND' : 'NO_CHANGE',
  };
}

function mapFlightLegToOptions(leg: FlightLeg): NewFlightOption[] {
  return [...leg.cabinFares]
    .filter((fare) => fare.selectable && typeof fare.fareId === 'number')
    .sort((a, b) => a.priceAmount - b.priceAmount)
    .map((fare) => ({
      id: `${leg.id}:${fare.fareId}`,
      flightId: Number(leg.id),
      fareId: fare.fareId as number,
      flightNumber: leg.flightNumber,
      aircraft: leg.aircraft,
      departureCode: leg.departureCode,
      arrivalCode: leg.arrivalCode,
      departureTime: leg.departureTime,
      arrivalTime: leg.arrivalTime,
      durationLabel: leg.durationLabel,
      cabin: cabinLabel(fare.cabin),
      fareName: fare.fareCode ?? fare.cabin,
      priceAmount: fare.priceAmount,
      priceLabel: fare.priceLabel,
      currency: fare.currency ?? 'VND',
    }));
}

function ChangeFlightStepper({ currentStepId }: { currentStepId: number }) {
  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-4 border-b border-luxury-gold/15 pb-4">
        {CHANGE_STEP_ITEMS.map((step, index) => {
          const status =
            step.id < currentStepId
              ? 'completed'
              : step.id === currentStepId
                ? 'active'
                : 'pending';

          return (
            <div key={step.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    status === 'completed'
                      ? 'bg-luxury-gold text-midnight-burgundy'
                      : status === 'active'
                        ? 'bg-midnight-burgundy text-white'
                        : 'border border-luxury-gold/20 bg-white text-on-surface-variant'
                  }`}
                >
                  {status === 'completed' ? <Check className="h-3.5 w-3.5" /> : step.id}
                </div>
                <span
                  className={`whitespace-nowrap text-sm ${
                    status === 'active'
                      ? 'font-semibold text-midnight-burgundy'
                      : 'font-medium text-on-surface-variant'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < CHANGE_STEP_ITEMS.length - 1 ? (
                <div className="h-px w-10 bg-luxury-gold/20 md:w-16" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlightChangeCard({
  flight,
  index,
  selected,
  onSelect,
}: {
  flight: DerivedFlight;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer overflow-hidden rounded-[1.4rem] border bg-white/95 shadow-sm transition-all ${
        selected
          ? 'border-luxury-gold/40 bg-[linear-gradient(180deg,rgba(125,6,51,0.035),rgba(255,255,255,0.98))] shadow-[0_18px_36px_rgba(125,6,51,0.08)]'
          : 'border-luxury-gold/15 hover:border-luxury-gold/28 hover:bg-surface-lowest hover:shadow-[0_12px_24px_rgba(125,6,51,0.05)]'
      }`}
    >
      <div className="flex flex-col md:flex-row">
        <div
          className={`flex w-full items-start gap-3 border-b p-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r ${
            selected
              ? 'border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.45))]'
              : 'border-luxury-gold/10'
          }`}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            aria-label={`Select flight ${index + 1}`}
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              selected
                ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                : 'border-luxury-gold/25 bg-white text-transparent hover:border-midnight-burgundy/50'
            }`}
          >
            {selected ? <Check className="h-3.5 w-3.5" /> : null}
          </button>

          <div className="flex flex-col items-start">
            <span className="mb-2 rounded-full bg-luxury-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Flight {index + 1}
            </span>
            <div className="font-headline text-base font-black text-midnight-burgundy">
              {flight.flightNumber}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-on-surface">
              {flight.departureCode}
              <ArrowRight className="h-3 w-3 text-luxury-gold" />
              {flight.arrivalCode}
            </div>
            <div className="mt-1.5 text-xs text-on-surface-variant">
              {flight.departureTime} - {flight.arrivalTime} • {flight.departureDate}
            </div>
            {!flight.changeable ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-low px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                <Info className="h-3 w-3" />
                Not changeable
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 p-4 md:grid-cols-4">
          <div className="flex flex-col text-sm">
            <div className="text-base font-bold text-on-surface">{flight.departureTime}</div>
            <div className="mt-0.5 font-semibold text-on-surface">{flight.departureCode}</div>
            <div className="text-[11px] text-on-surface-variant">{flight.departureDate}</div>
            <div className="truncate text-[11px] text-on-surface-variant">{flight.departureCity}</div>
            {flight.departureTerminal ? (
              <div className="mt-0.5 text-[11px] font-medium text-on-surface-variant">
                Terminal {flight.departureTerminal}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center justify-center px-2 text-center">
            <Plane className="mb-1 h-5 w-5 shrink-0 text-luxury-gold" />
            <span className="whitespace-nowrap text-[11px] text-on-surface-variant">
              {flight.durationLabel}
            </span>
          </div>

          <div className="flex flex-col text-sm">
            <div className="text-base font-bold text-on-surface">{flight.arrivalTime}</div>
            <div className="mt-0.5 font-semibold text-on-surface">{flight.arrivalCode}</div>
            <div className="text-[11px] text-on-surface-variant">{flight.arrivalDate}</div>
            <div className="truncate text-[11px] text-on-surface-variant">{flight.arrivalCity}</div>
            {flight.arrivalTerminal ? (
              <div className="mt-0.5 text-[11px] font-medium text-on-surface-variant">
                Terminal {flight.arrivalTerminal}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col text-sm">
            <div className="mb-1 text-[11px] text-on-surface-variant">Fare</div>
            <div className="text-[11px] font-semibold text-on-surface">{flight.fareName}</div>
            <div className="mb-1 mt-2 text-[11px] text-on-surface-variant">Change fee</div>
            <div className="text-[11px] font-semibold text-on-surface">
              {flight.changeable ? formatMoney(flight.changeFee, flight.currency) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ChooseFlightStep({
  flights,
  selectedFlightId,
  onSelect,
  onContinue,
  onBack,
}: {
  flights: DerivedFlight[];
  selectedFlightId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <section className="pb-6">
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">
        Change flight flow
      </h2>
      <ChangeFlightStepper currentStepId={1} />

      <div className="glass-panel overflow-hidden rounded-[1.75rem] border border-luxury-gold/15 bg-white/95 shadow-[0_18px_50px_rgba(62,16,30,0.08)]">
        <div className="border-b border-luxury-gold/10 p-5">
          <h3 className="font-headline text-lg font-black text-midnight-burgundy">1. Select the flight to change</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Choose which flight in your itinerary you want to change.
          </p>
        </div>

        <div className="space-y-4 bg-[linear-gradient(180deg,rgba(249,246,241,0.8),rgba(255,255,255,0.6))] p-5">
          {flights.length === 0 ? (
            <div className="rounded-xl border border-dashed border-luxury-gold/20 bg-white px-5 py-10 text-center text-sm text-on-surface-variant">
              No flights found for this booking.
            </div>
          ) : (
            flights.map((flight, index) => (
              <FlightChangeCard
                key={flight.id}
                flight={flight}
                index={index}
                selected={selectedFlightId === flight.id}
                onSelect={() => onSelect(flight.id)}
              />
            ))
          )}
        </div>

        <div className="flex items-start gap-2 border-t border-luxury-gold/10 bg-luxury-gold/8 px-5 py-3 text-xs text-on-surface">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <p>
            Note: Change fees and any fare difference (if applicable) will be shown in the next step.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-luxury-gold/10 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-midnight-burgundy/20 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            disabled={!selectedFlightId}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ChooseNewFlightStep({
  currentFlight,
  calendarDays,
  selectedDate,
  options,
  loading,
  errorMessage,
  continuing,
  selectedOptionId,
  passengerSummary,
  onSelect,
  onSelectDate,
  onBack,
  onContinue,
  onRefresh,
  onShiftWindow,
}: {
  currentFlight: DerivedFlight;
  calendarDays: FlightCalendarDay[];
  selectedDate: string;
  options: NewFlightOption[];
  loading: boolean;
  errorMessage: string | null;
  continuing: boolean;
  selectedOptionId: string | null;
  passengerSummary: string;
  onSelect: (id: string) => void;
  onSelectDate: (date: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onRefresh: () => void;
  onShiftWindow: (offset: number) => void;
}) {
  const selectedCalendarDay =
    calendarDays.find((day) => day.date === selectedDate) ??
    calendarDays.find((day) => day.date === formatIsoDate(currentFlight.departureRaw)) ??
    null;
  return (
    <section className="pb-6">
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">
        Change flight flow
      </h2>
      <ChangeFlightStepper currentStepId={2} />

      <div className="glass-panel overflow-hidden rounded-[28px] border border-luxury-gold/18 bg-white/96 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
        <div className="border-b border-luxury-gold/12 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-headline text-[1.55rem] font-black text-on-surface">
                2. Select a new flight
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Choose the best replacement option for the flight you want to change.
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-luxury-gold/18 bg-white px-3 py-2 text-xs font-semibold text-midnight-burgundy transition hover:border-luxury-gold/28 hover:bg-midnight-burgundy/5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px]">
            <div className="rounded-[24px] border border-luxury-gold/14 bg-surface-lowest p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy/55">
                Current flight
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="min-w-[92px]">
                  <div className="text-[1.75rem] font-black tracking-tight text-on-surface">
                    {currentFlight.departureCode}
                  </div>
                  <div className="mt-1 text-sm font-medium text-on-surface">
                    {currentFlight.departureTime}
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-3 text-midnight-burgundy/40">
                  <div className="h-px flex-1 bg-luxury-gold/35" />
                  <Plane className="h-4 w-4 shrink-0 stroke-midnight-burgundy" />
                  <div className="h-px flex-1 bg-luxury-gold/35" />
                </div>
                <div className="min-w-[92px] text-left lg:text-right">
                  <div className="text-[1.75rem] font-black tracking-tight text-on-surface">
                    {currentFlight.arrivalCode}
                  </div>
                  <div className="mt-1 text-sm font-medium text-on-surface">
                    {currentFlight.arrivalTime}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-on-surface-variant">
                <span className="font-semibold text-midnight-burgundy">{currentFlight.flightNumber}</span>
                <span>{currentFlight.departureDate}</span>
                <span>Fare {currentFlight.fareName}</span>
                <span>{currentFlight.durationLabel}</span>
              </div>
            </div>

            <div className="rounded-[24px] border border-luxury-gold/14 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy/55">
                Passengers
              </div>
              <div className="mt-3 text-sm font-semibold text-on-surface">{passengerSummary}</div>
              <div className="mt-4 rounded-2xl border border-luxury-gold/14 bg-midnight-burgundy/5 px-3 py-2 text-xs text-midnight-burgundy">
                Results are based on the latest data for your current itinerary.
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onShiftWindow(-1)}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-luxury-gold/16 bg-white text-midnight-burgundy transition hover:bg-midnight-burgundy/5 disabled:cursor-not-allowed disabled:text-midnight-burgundy/30"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {calendarDays.map((day) => {
              const selected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onSelectDate(day.date)}
                  className={`min-w-[132px] rounded-[20px] border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-luxury-gold/45 bg-midnight-burgundy/6 shadow-[0_12px_26px_rgba(125,6,51,0.08)]'
                      : 'border-luxury-gold/14 bg-white hover:border-luxury-gold/28 hover:bg-surface-lowest'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold ${
                      selected ? 'text-midnight-burgundy' : 'text-on-surface-variant'
                    }`}
                  >
                    {formatWeekday(day.date)}
                  </div>
                  <div
                    className={`mt-1 text-sm font-bold ${
                      selected ? 'text-midnight-burgundy' : 'text-on-surface'
                    }`}
                  >
                    {formatDayMonth(day.date)}
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    {day.lowestPrice == null
                      ? 'No price yet'
                      : formatMoney(day.lowestPrice, day.currency ?? 'VND')}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onShiftWindow(1)}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-luxury-gold/16 bg-white text-midnight-burgundy transition hover:bg-midnight-burgundy/5 disabled:cursor-not-allowed disabled:text-midnight-burgundy/30"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-luxury-gold/12 bg-surface-lowest px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="font-medium text-on-surface-variant">
              {loading
                ? 'Searching for available flights...'
                : `${selectedCalendarDay?.flightCount ?? options.length} matching options`}
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-surface-lowest/70 p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-dashed border-luxury-gold/18 bg-white px-5 py-10 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading available flights...
            </div>
          ) : errorMessage ? (
            <div className="flex items-start gap-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{errorMessage}</p>
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-luxury-gold/18 bg-white px-5 py-10 text-center text-sm text-on-surface-variant">
              No replacement flights available for this itinerary. Please choose another date or contact support.
            </div>
          ) : (
            options.map((option) => {
              const selected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className={`w-full rounded-[24px] border bg-white p-4 text-left transition-all ${
                    selected
                      ? 'border-luxury-gold/40 bg-midnight-burgundy/4 shadow-[0_14px_32px_rgba(125,6,51,0.08)]'
                      : 'border-luxury-gold/14 hover:border-luxury-gold/26 hover:bg-white'
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                    <div className="flex items-center justify-center md:self-start">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                            : 'border-luxury-gold/24 bg-white text-transparent'
                        }`}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-semibold text-midnight-burgundy">{option.flightNumber}</span>
                        <span className="rounded-full border border-luxury-gold/14 bg-surface-lowest px-2 py-0.5 font-medium text-on-surface-variant">
                          {option.aircraft}
                        </span>
                        <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          {option.fareName}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[auto_minmax(84px,1fr)_auto] sm:items-center">
                        <div>
                          <div className="text-[1.45rem] font-black tracking-tight text-on-surface sm:text-[1.55rem]">
                            {option.departureTime}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-on-surface">
                            {option.departureCode}
                          </div>
                        </div>

                        <div className="flex min-w-[84px] flex-col items-center justify-center text-on-surface-variant">
                          <div className="flex w-full items-center gap-2">
                            <div className="h-px flex-1 bg-luxury-gold/35" />
                            <Plane className="h-4 w-4 shrink-0 stroke-midnight-burgundy" />
                            <div className="h-px flex-1 bg-luxury-gold/35" />
                          </div>
                          <span className="mt-1 text-xs">{option.durationLabel}</span>
                        </div>

                        <div className="sm:text-right">
                          <div className="text-[1.45rem] font-black tracking-tight text-on-surface sm:text-[1.55rem]">
                            {option.arrivalTime}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-on-surface">
                            {option.arrivalCode}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-luxury-gold/12 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-midnight-burgundy/55">
                        {option.cabin}
                      </div>
                      <div className="mt-1 text-lg font-bold text-midnight-burgundy">{option.priceLabel}</div>
                      <div className="mt-1 text-xs text-on-surface-variant">
                        Price applies to the selected passengers
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-luxury-gold/12 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-luxury-gold/16 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            disabled={!selectedOptionId || continuing}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-luxury-gold shadow-[0_14px_30px_rgba(125,6,51,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ConfirmChangeStep({
  currentFlight,
  newFlight,
  passengers,
  settlement,
  currency,
  extrasSummary,
  continuing,
  errorMessage,
  onBack,
  onContinue,
}: {
  currentFlight: DerivedFlight;
  newFlight: NewFlightOption;
  passengers: PassengerDisplayItem[];
  settlement: SettlementSummary;
  currency: string;
  extrasSummary: string;
  continuing: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const amountTone =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'text-midnight-burgundy'
      : settlement.mode === 'REFUND'
        ? 'text-emerald-700'
        : 'text-on-surface';
  const fareDifferenceTone =
    settlement.fareDifference > 0
      ? 'text-midnight-burgundy'
      : settlement.fareDifference < 0
        ? 'text-emerald-700'
        : 'text-on-surface';
  const changeFeeAmount = Math.max(settlement.changeFee, 0);
  const settlementLabel =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Additional payment required'
      : settlement.mode === 'REFUND'
        ? 'Refund'
        : 'No change';
  const settlementCaption =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Additional charges for changing your flight'
      : settlement.mode === 'REFUND'
        ? 'Refund will be processed after confirmation'
        : extrasSummary;
  const totalLabel =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Total due'
      : settlement.mode === 'REFUND'
        ? 'Total refund'
        : 'No payment due';
  const continueLabel =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Continue: Payment'
      : settlement.mode === 'REFUND'
        ? 'Continue: Refund'
        : 'Confirm changes';

  return (
    <section className="pb-6">
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">
        Change flight flow
      </h2>
      <ChangeFlightStepper currentStepId={3} />

      <div className="glass-panel rounded-[28px] border border-luxury-gold/18 bg-white/96 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
        <div className="border-b border-luxury-gold/12 p-5">
          <h3 className="font-headline text-[1.55rem] font-black text-on-surface">
            3. Confirm changes
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Please review the details before continuing.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-[24px] border border-luxury-gold/14 bg-white p-4">
            <div className="text-sm font-semibold text-on-surface">Flight to be changed</div>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
              <article className="rounded-[22px] border border-luxury-gold/14 bg-surface-lowest p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy/55">
                  Current
                </div>
                <div className="mt-2 text-base font-bold text-on-surface">
                  {currentFlight.flightNumber}
                </div>
                <div className="mt-1 text-sm font-semibold text-on-surface">
                  {currentFlight.departureCode} → {currentFlight.arrivalCode}
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {currentFlight.departureTime} - {currentFlight.arrivalTime} |{' '}
                  {currentFlight.departureDate}
                </div>
                <div className="mt-3 inline-flex rounded-full border border-luxury-gold/16 bg-white px-2.5 py-1 text-xs font-semibold text-midnight-burgundy">
                  {currentFlight.fareName}
                </div>
              </article>

              <div className="flex items-center justify-center text-midnight-burgundy/45">
                <ArrowRight className="h-5 w-5" />
              </div>

              <article className="rounded-[22px] border border-luxury-gold/24 bg-midnight-burgundy/5 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy">
                  New
                </div>
                <div className="mt-2 text-base font-bold text-on-surface">
                  {newFlight.flightNumber}
                </div>
                <div className="mt-1 text-sm font-semibold text-on-surface">
                  {newFlight.departureCode} → {newFlight.arrivalCode}
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {newFlight.departureTime} - {newFlight.arrivalTime}
                </div>
                <div className="mt-3 inline-flex rounded-full border border-luxury-gold/22 bg-luxury-gold/16 px-2.5 py-1 text-xs font-semibold text-midnight-burgundy">
                  {newFlight.fareName}
                </div>
              </article>
            </div>
          </div>

          <div className="rounded-[24px] border border-luxury-gold/14 bg-white p-4">
            <div className="text-sm font-semibold text-on-surface">Passenger details</div>
            <div className="mt-4 space-y-3">
              {passengers.map((passenger, index) => (
                <div
                  key={passenger.id}
                  className="flex items-start gap-3 rounded-[20px] border border-luxury-gold/12 bg-surface-lowest px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-luxury-gold/12 bg-white text-xs font-semibold text-midnight-burgundy">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-on-surface">{passenger.fullName}</div>
                    <div className="text-xs text-on-surface-variant">{passenger.typeLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-luxury-gold/14 bg-white p-4">
            <div className="text-sm font-semibold text-on-surface">Payment breakdown</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Original fare</span>
                <span className="font-semibold text-on-surface">
                  {formatMoney(settlement.originalFareAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>New fare</span>
                <span className="font-semibold text-on-surface">
                  {formatMoney(settlement.newFareAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Fare difference</span>
                <span className={`font-semibold ${fareDifferenceTone}`}>
                  {settlement.fareDifference === 0
                    ? formatMoney(0, currency)
                    : `${settlement.fareDifference > 0 ? '+' : '−'}${formatMoney(
                        Math.abs(settlement.fareDifference),
                        currency
                      )}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Change fee</span>
                <span className="font-semibold text-on-surface">
                  {formatMoney(changeFeeAmount, currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-luxury-gold/14 bg-surface-lowest px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-midnight-burgundy">
                    {settlementLabel}
                  </div>
                  <div className="mt-1 text-sm text-on-surface-variant">{settlementCaption}</div>
                </div>
                <div className={`text-xl font-bold ${amountTone}`}>
                  {settlement.mode === 'NO_CHANGE'
                    ? '—'
                    : formatMoney(Math.abs(settlement.netAmount), currency)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-luxury-gold/12 pt-4 text-base font-bold text-on-surface">
              <span>{totalLabel}</span>
              <span className={amountTone}>
                {settlement.mode === 'NO_CHANGE'
                  ? '—'
                  : formatMoney(Math.abs(settlement.netAmount), currency)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-[22px] border border-luxury-gold/14 bg-midnight-burgundy/5 px-4 py-3 text-sm text-midnight-burgundy">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-midnight-burgundy" />
            <p>
              If you continue, your current seats and add-ons will be re-evaluated based on the fare rules of the new flight.
            </p>
          </div>
          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{errorMessage}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-luxury-gold/12 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-luxury-gold/16 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            disabled={continuing}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-luxury-gold shadow-[0_14px_30px_rgba(125,6,51,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {continueLabel}
            {!continuing ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>
      </div>
    </section>
  );
}

function PaymentMethodOption({
  selected,
  onClick,
  title,
  subtitle,
  trailing,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string | null;
  trailing: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition ${
        selected
          ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600'
          : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-red-600 bg-red-600' : 'border-stone-300 bg-white'
        }`}
      >
        {selected ? <span className="block h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-900">{title}</span>
        {subtitle ? <span className="block text-xs text-stone-500">{subtitle}</span> : null}
      </span>
      {trailing}
    </button>
  );
}

function resolvePaymentMethodDisplay(method: PaymentMethod): {
  title: string;
  subtitle: string | null;
} {
  switch (method.code) {
    case 'STRIPE_CARD':
      return { title: 'Credit / Debit card', subtitle: method.provider ?? null };
    case 'VIETQR':
      return { title: 'Bank transfer', subtitle: method.provider ?? null };
    case 'PAY_LATER':
      return { title: 'Hold booking, pay later', subtitle: method.provider ?? null };
    default:
      return { title: method.label, subtitle: method.provider ?? null };
  }
}

function PaymentStep({
  settlement,
  currency,
  paymentMethods,
  paymentMethodsLoading: _paymentMethodsLoading,
  paying,
  errorMessage,
  passengerName,
  onBack,
  onConfirm,
}: {
  settlement: SettlementSummary;
  currency: string;
  paymentMethods: PaymentMethod[];
  paymentMethodsLoading: boolean;
  paying: boolean;
  errorMessage: string | null;
  passengerName: string;
  onBack: () => void;
  onConfirm: (methodCode: string) => void;
}) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const isRefund = settlement.mode === 'REFUND';
  const amount = Math.abs(settlement.netAmount);
  const paymentMethodLabel = 'VISA •••• 1234';
  const fareDifferenceAmount = settlement.fareDifference;
  const changeFeeAmount = Math.max(settlement.changeFee, 0);
  const visiblePaymentMethods = useMemo(
    () => paymentMethods.filter((method) => method.code !== 'PAYOS_QR'),
    [paymentMethods]
  );
  const hasPaymentMethods = visiblePaymentMethods.length > 0;

  useEffect(() => {
    if (isRefund || !hasPaymentMethods) return;
    setSelectedPaymentMethod((current) =>
      current && visiblePaymentMethods.some((method) => method.code === current)
        ? current
        : visiblePaymentMethods[0]?.code || ''
    );
  }, [hasPaymentMethods, isRefund, visiblePaymentMethods]);

  const primaryMethod = visiblePaymentMethods[0] ?? null;
  const secondaryMethod = visiblePaymentMethods[1] ?? null;
  const tertiaryMethod = visiblePaymentMethods[2] ?? null;
  const quaternaryMethod = visiblePaymentMethods[3] ?? null;

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">
        Change flight flow
      </h2>
      <ChangeFlightStepper currentStepId={4} />

      <div className="glass-panel rounded-[28px] border border-luxury-gold/18 bg-white/96 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
        <div className="border-b border-luxury-gold/12 p-5">
          <h3 className="font-headline text-[1.55rem] font-black text-on-surface">
            {isRefund ? '4. Refund' : '4. Additional payment'}
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            {isRefund
              ? 'Any fare difference will be refunded to the original payment method used for this booking.'
              : 'Pay the fare difference and change fee to confirm your new flight.'}
          </p>
        </div>

        {isRefund ? (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-4 rounded-[24px] border border-luxury-gold/14 bg-white p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-emerald-100 text-emerald-700">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <div className="text-lg font-bold text-on-surface">Automatic refund</div>
                <p className="text-sm leading-6 text-on-surface-variant">
                  Your flight change has been confirmed. We’ll automatically process the refund to your original payment method — no further action is needed.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-luxury-gold/14 bg-surface-lowest">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-on-surface-variant">Refund amount</span>
                <span className="text-xl font-bold text-emerald-700">
                  {formatMoney(amount, currency)}
                </span>
              </div>
              <div className="border-t border-luxury-gold/12" />
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-on-surface-variant">Method</span>
                <span className="text-sm font-bold text-on-surface">{paymentMethodLabel}</span>
              </div>
              <div className="border-t border-luxury-gold/12" />
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-on-surface-variant">Recipient</span>
                <span className="text-sm font-semibold text-stone-900">{passengerName || '—'}</span>
              </div>
              <div className="border-t border-luxury-gold/12" />
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-on-surface-variant">Processing time</span>
                <span className="text-sm font-semibold text-stone-900">7–14 business days</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-[22px] border border-luxury-gold/14 bg-midnight-burgundy/5 px-4 py-3 text-xs text-midnight-burgundy">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-midnight-burgundy" />
              <p className="leading-5">
                You can track the refund status in Manage booking. If you haven’t received it after the stated timeframe, please call 1900 1234.
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(event) => setAgreedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-midnight-burgundy"
              />
              <span className="leading-5">
                I have read and agree to SOVEREIGN’s refund policy and change rules.
              </span>
            </label>
            {!agreedTerms ? (
              <p className="text-xs text-amber-700">
                Please check the box to confirm you agree before continuing.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex items-start gap-3 rounded-[22px] border border-luxury-gold/14 bg-midnight-burgundy/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-midnight-burgundy" />
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-midnight-burgundy">Additional payment required</div>
                <p className="text-sm text-on-surface-variant">
                  Please complete payment to confirm the flight change.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <h4 className="text-base font-bold text-on-surface">Payment breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-on-surface-variant">Original fare</span>
                  <span className="font-semibold text-on-surface">
                    {formatMoney(settlement.originalFareAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-on-surface-variant">New fare</span>
                  <span className="font-semibold text-on-surface">
                    {formatMoney(settlement.newFareAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-on-surface-variant">Fare difference</span>
                  <span className="font-semibold text-on-surface">
                    {formatMoney(fareDifferenceAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-on-surface-variant">Change fee</span>
                  <span className="font-semibold text-on-surface">
                    {formatMoney(changeFeeAmount, currency)}
                  </span>
                </div>
              </div>
              <div className="border-t border-luxury-gold/12" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-on-surface">Total due</span>
                  <span className="text-xl font-bold tracking-tight text-midnight-burgundy">
                    {formatMoney(amount, currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Please pay to confirm the change.
                </p>
              </div>
            </div>

            <div className="border-t border-luxury-gold/12" />

            <div className="hidden">
              <h4 className="text-base font-bold text-stone-950">Choose a payment method</h4>
              <div className="space-y-2.5">
                <PaymentMethodOption
                  selected={selectedPaymentMethod === (primaryMethod?.code ?? '')}
                  onClick={() => primaryMethod && setSelectedPaymentMethod(primaryMethod.code)}
                  subtitle={primaryMethod?.provider ?? null}
                  title="Credit / Debit card"
                  trailing={null}
                />
                <PaymentMethodOption
                  selected={selectedPaymentMethod === (secondaryMethod?.code ?? '')}
                  onClick={() => secondaryMethod && setSelectedPaymentMethod(secondaryMethod.code)}
                  subtitle={secondaryMethod?.provider ?? null}
                  title="E-wallet"
                  trailing={null}
                />
                <PaymentMethodOption
                  selected={selectedPaymentMethod === (tertiaryMethod?.code ?? '')}
                  onClick={() => tertiaryMethod && setSelectedPaymentMethod(tertiaryMethod.code)}
                  subtitle={tertiaryMethod?.provider ?? null}
                  title="Bank transfer"
                  trailing={null}
                />
                {quaternaryMethod ? (
                  <PaymentMethodOption
                    selected={selectedPaymentMethod === quaternaryMethod.code}
                    onClick={() => setSelectedPaymentMethod(quaternaryMethod.code)}
                    subtitle={quaternaryMethod.provider}
                    title={quaternaryMethod.label}
                    trailing={null}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-bold text-on-surface">Payment method</h4>
              <div className="space-y-2.5">
                {visiblePaymentMethods.map((method) => {
                  const display = resolvePaymentMethodDisplay(method);
                  return (
                    <PaymentMethodOption
                      key={method.code}
                      selected={selectedPaymentMethod === method.code}
                      onClick={() => setSelectedPaymentMethod(method.code)}
                      subtitle={display.subtitle}
                      title={display.title}
                      trailing={null}
                    />
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(event) => setAgreedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-midnight-burgundy"
              />
              <span className="leading-5">
                I agree to SOVEREIGN’s transaction terms and change policy.
              </span>
            </label>
          </div>
        )}

        {errorMessage ? (
          <div className="border-t border-luxury-gold/12 px-5 py-3">
            <div className="flex items-start gap-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-luxury-gold/12 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-luxury-gold/16 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            disabled={paying || !agreedTerms || (!isRefund && !selectedPaymentMethod)}
            onClick={() => onConfirm(selectedPaymentMethod)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-luxury-gold shadow-[0_14px_30px_rgba(125,6,51,0.18)] transition disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${
              isRefund ? 'bg-midnight-burgundy hover:brightness-110' : 'bg-midnight-burgundy hover:brightness-110'
            }`}
          >
            {paying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRefund ? (
              <Check className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {isRefund
              ? `Confirm refund ${formatMoney(amount, currency)}`
              : `Pay ${formatMoney(amount, currency)}`}
          </button>
        </div>
      </div>
    </section>
  );
}

function CompleteStep({
  pnr,
  currentFlight,
  newFlight,
}: {
  pnr: string;
  currentFlight: DerivedFlight;
  newFlight: NewFlightOption;
}) {
  const navigate = useNavigate();

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">
        Change flight flow
      </h2>
      <ChangeFlightStepper currentStepId={5} />

      <div className="glass-panel rounded-[28px] border border-luxury-gold/18 bg-white/96 p-6 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-headline text-2xl font-black text-on-surface">Flight change successful</h3>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Booking reference <span className="font-semibold text-on-surface">{pnr}</span> has been updated with your new flight.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-[24px] border border-luxury-gold/14 bg-surface-lowest p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy/55">
              Previous flight
            </div>
            <div className="mt-2 text-base font-bold text-on-surface">
              {currentFlight.flightNumber}
            </div>
            <div className="mt-1 text-sm text-on-surface">
              {currentFlight.departureCode} → {currentFlight.arrivalCode}
            </div>
            <div className="mt-1 text-xs text-on-surface-variant">
              {currentFlight.departureTime} - {currentFlight.arrivalTime} •{' '}
              {currentFlight.departureDate}
            </div>
          </article>

          <article className="rounded-[24px] border border-luxury-gold/24 bg-midnight-burgundy/5 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy">
              New flight
            </div>
            <div className="mt-2 text-base font-bold text-on-surface">{newFlight.flightNumber}</div>
            <div className="mt-1 text-sm text-on-surface">
              {newFlight.departureCode} → {newFlight.arrivalCode}
            </div>
            <div className="mt-1 text-xs text-on-surface-variant">
              {newFlight.departureTime} - {newFlight.arrivalTime}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full border border-luxury-gold/16 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/5"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </button>
          <button
            type="button"
            onClick={() => navigate('/manage-booking')}
            className="inline-flex items-center gap-2 rounded-full bg-midnight-burgundy px-5 py-2.5 text-sm font-semibold text-luxury-gold shadow-[0_14px_30px_rgba(125,6,51,0.18)] transition hover:brightness-110"
          >
            Manage booking
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ChangeFlight() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingLookup = useBookingStore((state) => state.bookingLookup);
  const setBookingLookup = useBookingStore((state) => state.setBookingLookup);
  const setManageOptions = useBookingStore((state) => state.setManageOptions);
  const setMockManageBookingMode = useBookingStore((state) => state.setMockManageBookingMode);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedNewOptionId, setSelectedNewOptionId] = useState<string | null>(null);
  const [calendarCenterDate, setCalendarCenterDate] = useState<string | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [flightChangeQuote, setFlightChangeQuote] = useState<FlightChangeQuoteResponse | null>(
    null
  );
  const [flightChangeConfirm, setFlightChangeConfirm] =
    useState<FlightChangeConfirmResponse | null>(null);
  const [confirmingChange, setConfirmingChange] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<CreatePaymentResponse | null>(null);
  const [paymentStatusOverride, setPaymentStatusOverride] = useState<PaymentStatus | null>(null);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(false);
  const [cancelingPayment, setCancelingPayment] = useState(false);
  const [regeneratingPayment, setRegeneratingPayment] = useState(false);
  const [completedFlightChange, setCompletedFlightChange] = useState<CompletedFlightChange | null>(
    null
  );
  const autoBootstrappedRef = useRef(false);
  const pendingCalendarDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (bookingLookup || autoBootstrappedRef.current) return;

    autoBootstrappedRef.current = true;
    setBootstrapping(true);
    setBootstrapError(null);
    setMockManageBookingMode(true);
    resetMockManageBookingVariant(resolveMockManageBookingVariant() ?? 'CONFIRMED');

    void (async () => {
      try {
        const lookup = await bookingService.lookupBooking({
          pnrCode: 'ABC123',
          lastName: 'Nguyen',
        });
        setBookingLookup(lookup);
        const options = await bookingService.getManageOptions(lookup.booking.bookingId);
        setManageOptions(options);
      } catch (error) {
        setBootstrapError(
          error instanceof Error ? error.message : 'Unable to load sample booking data.'
        );
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [bookingLookup, setBookingLookup, setManageOptions, setMockManageBookingMode]);

  const flights = useMemo<DerivedFlight[]>(() => {
    if (!bookingLookup) return [];

    return bookingLookup.itineraries.map((itinerary) => ({
      id: String(itinerary.flightId),
      flightId: itinerary.flightId,
      flightNumber: itinerary.flightNumber,
      departureCode: itinerary.departureAirportCode,
      departureCity: itinerary.departureCity,
      departureTerminal: itinerary.departureTerminal,
      departureTime: formatTime(itinerary.departureTime),
      departureDate: formatShortDate(itinerary.departureTime),
      departureRaw: itinerary.departureTime,
      arrivalCode: itinerary.arrivalAirportCode,
      arrivalCity: itinerary.arrivalCity,
      arrivalTerminal: itinerary.arrivalTerminal,
      arrivalTime: formatTime(itinerary.arrivalTime),
      arrivalDate: formatShortDate(itinerary.arrivalTime),
      arrivalRaw: itinerary.arrivalTime,
      durationLabel: formatDuration(itinerary.departureTime, itinerary.arrivalTime),
      cabin: cabinLabel(itinerary.cabinClass),
      fareName: itinerary.fareName,
      changeable: itinerary.fareBenefits.changeable,
      changeFee: itinerary.fareBenefits.changeFee,
      currency: bookingLookup.booking.currency,
    }));
  }, [bookingLookup]);

  const selectedFlight = useMemo(
    () => flights.find((flight) => flight.id === selectedFlightId) ?? null,
    [flights, selectedFlightId]
  );

  useEffect(() => {
    if (!selectedFlight) return;
    const flightDate = formatIsoDate(selectedFlight.departureRaw);
    setCalendarCenterDate(flightDate);
    setSelectedCalendarDate(flightDate);
    setSelectedNewOptionId(null);
    setFlightChangeQuote(null);
    setFlightChangeConfirm(null);
    setQuoteError(null);
    setCompletedFlightChange(null);
    setActivePayment(null);
    setPaymentStatusOverride(null);
    setPaymentError(null);
  }, [selectedFlight]);

  const adultCount =
    bookingLookup?.passengers.filter((passenger) => passenger.passengerType === 'ADULT').length ??
    1;
  const childCount =
    bookingLookup?.passengers.filter((passenger) => passenger.passengerType === 'CHILD').length ??
    0;
  const infantCount =
    bookingLookup?.passengers.filter((passenger) => passenger.passengerType === 'INFANT').length ??
    0;
  const passengerSummary =
    [
      adultCount > 0 ? `${adultCount} adult${adultCount > 1 ? 's' : ''}` : null,
      childCount > 0 ? `${childCount} child${childCount > 1 ? 'ren' : ''}` : null,
      infantCount > 0 ? `${infantCount} infant${infantCount > 1 ? 's' : ''}` : null,
    ]
      .filter(Boolean)
      .join(', ') || '1 adult';
  const passengerItems = useMemo<PassengerDisplayItem[]>(
    () =>
      (bookingLookup?.passengers ?? []).map((passenger) => ({
        id: passenger.passengerId,
        fullName: `${passenger.lastName} ${passenger.firstName}`.trim(),
        typeLabel: passengerTypeLabel(passenger.passengerType),
      })),
    [bookingLookup]
  );
  const extrasSummary = useMemo(() => {
    if (!bookingLookup) return 'No add-ons';

    const extrasCount = bookingLookup.passengers.reduce((sum, passenger) => {
      const seatCount =
        passenger.selections?.seats.length ?? passenger.seatAssignments?.length ?? 0;
      const serviceCount =
        passenger.selections?.services.reduce((total, service) => total + service.quantity, 0) ??
        passenger.serviceSelections?.reduce((total, service) => total + service.quantity, 0) ??
        0;
      return sum + seatCount + serviceCount;
    }, 0);

    const passengerCount = bookingLookup.passengers.length;
    if (extrasCount === 0) {
      return passengerCount > 0
        ? `No add-ons for ${passengerCount} passenger${passengerCount > 1 ? 's' : ''}`
        : 'No add-ons';
    }

    return `${extrasCount} add-on${extrasCount > 1 ? 's' : ''} across ${passengerCount} passenger${
      passengerCount > 1 ? 's' : ''
    }`;
  }, [bookingLookup]);

  const newFlightsQuery = useQuery({
    queryKey: [
      'change-flight-calendar',
      selectedFlight?.departureCode,
      selectedFlight?.arrivalCode,
      calendarCenterDate,
      adultCount,
      childCount,
      infantCount,
    ],
    enabled: step >= 2 && selectedFlight != null && calendarCenterDate != null,
    queryFn: () =>
      flightService.searchCalendar(
        {
          tripType: 'ONE_WAY',
          from: selectedFlight!.departureCode,
          to: selectedFlight!.arrivalCode,
          departureDate: calendarCenterDate!,
          adult: Math.max(1, adultCount),
          child: childCount,
          infant: infantCount,
        },
        {
          connectionFilter: 'ANY',
          departureTimeBucket: 'ANY',
          arrivalTimeBucket: 'ANY',
          cabinClasses: [],
          maxBudget: null,
        },
        'Cheapest',
        { limit: 10, daysBefore: 3, daysAfter: 3 }
      ),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });

  const calendarDays = newFlightsQuery.data?.days ?? [];

  useEffect(() => {
    if (calendarDays.length === 0) return;
    const pendingDate = pendingCalendarDateRef.current;
    if (pendingDate && calendarDays.some((day) => day.date === pendingDate)) {
      pendingCalendarDateRef.current = null;
      setSelectedCalendarDate(pendingDate);
      return;
    }
    if (!selectedCalendarDate || !calendarDays.some((day) => day.date === selectedCalendarDate)) {
      const fallbackDate =
        calendarCenterDate ?? newFlightsQuery.data?.selectedDate ?? calendarDays[0]?.date;
      if (fallbackDate) setSelectedCalendarDate(fallbackDate);
    }
  }, [calendarCenterDate, calendarDays, newFlightsQuery.data?.selectedDate, selectedCalendarDate]);

  const activeCalendarDate = selectedCalendarDate ?? calendarCenterDate ?? '';
  const activeCalendarDay =
    calendarDays.find((day) => day.date === activeCalendarDate) ??
    calendarDays.find((day) => day.date === (calendarCenterDate ?? '')) ??
    null;

  const newFlightOptions = useMemo<NewFlightOption[]>(() => {
    if (!activeCalendarDay) return [];
    return (activeCalendarDay.flights ?? [])
      .flatMap(mapFlightLegToOptions)
      .filter(
        (option) =>
          option.flightNumber !== selectedFlight?.flightNumber &&
          option.departureCode === selectedFlight?.departureCode &&
          option.arrivalCode === selectedFlight?.arrivalCode
      )
      .sort((a, b) => a.priceAmount - b.priceAmount);
  }, [
    activeCalendarDay,
    selectedFlight?.arrivalCode,
    selectedFlight?.departureCode,
    selectedFlight?.flightNumber,
  ]);

  const selectedNewOption = useMemo(
    () => newFlightOptions.find((option) => option.id === selectedNewOptionId) ?? null,
    [newFlightOptions, selectedNewOptionId]
  );
  const completedStepData = completedFlightChange
    ? completedFlightChange
    : selectedFlight && selectedNewOption
      ? {
          pnr: bookingLookup?.booking.pnrCode ?? '',
          currentFlight: selectedFlight,
          newFlight: selectedNewOption,
        }
      : null;
  const quotedSettlement = useMemo(
    () =>
      flightChangeQuote?.summary ? mapQuoteSummaryToSettlement(flightChangeQuote.summary) : null,
    [flightChangeQuote]
  );
  const activeSettlement = useMemo(() => {
    if (flightChangeConfirm?.summary) {
      return {
        originalFareAmount: quotedSettlement?.originalFareAmount ?? 0,
        newFareAmount: quotedSettlement?.newFareAmount ?? 0,
        fareDifference: quotedSettlement?.fareDifference ?? 0,
        changeFee: quotedSettlement?.changeFee ?? 0,
        additionalCharges: flightChangeConfirm.summary.additionalAmount,
        refunds: flightChangeConfirm.summary.refundAmount,
        noChangeAmount: flightChangeConfirm.summary.netAmount === 0 ? 0 : 0,
        netAmount: flightChangeConfirm.summary.netAmount,
        mode:
          flightChangeConfirm.settlementType === 'COLLECT_PAYMENT'
            ? 'COLLECT_PAYMENT'
            : flightChangeConfirm.settlementType === 'REFUND'
              ? 'REFUND'
              : 'NO_CHANGE',
      } satisfies SettlementSummary;
    }
    return quotedSettlement;
  }, [flightChangeConfirm, quotedSettlement]);

  const paymentMethodsQuery = useQuery({
    queryKey: ['flight-change-payment-methods', bookingLookup?.booking.bookingId],
    queryFn: () => getPaymentMethods(bookingLookup!.booking.bookingId, { onlySupported: true }),
    enabled: step === 4 && bookingLookup != null && activeSettlement?.mode === 'COLLECT_PAYMENT',
    staleTime: 60_000,
  });

  const paymentMethods = useMemo<PaymentMethod[]>(() => {
    const queriedMethods =
      paymentMethodsQuery.data?.groups
        .flatMap((group) => group.methods)
        .filter((method) => method.supported) ?? [];
    if (queriedMethods.length > 0) {
      return queriedMethods;
    }
    if (flightChangeConfirm?.paymentMethods && flightChangeConfirm.paymentMethods.length > 0) {
      return flightChangeConfirm.paymentMethods
        .filter((method) => method.supported)
        .map((method) => ({
          code: method.code,
          label: method.label,
          provider: method.provider,
          icon: method.icon,
          supported: method.supported,
          meta: null,
        }));
    }
    return [];
  }, [flightChangeConfirm?.paymentMethods, paymentMethodsQuery.data]);

  useEffect(() => {
    if (
      selectedNewOptionId &&
      !newFlightOptions.some((option) => option.id === selectedNewOptionId)
    ) {
      setSelectedNewOptionId(null);
    }
  }, [newFlightOptions, selectedNewOptionId]);

  async function handleRequestFlightChangeQuote() {
    if (!bookingLookup || !selectedFlight || !selectedNewOption) return;
    setQuoting(true);
    setQuoteError(null);
    setFlightChangeQuote(null);
    try {
      const tickets = await bookingService.getBookingTickets(bookingLookup.booking.bookingId);
      if (!tickets.tickets.length) {
        throw new Error('No valid ticket found to create a change quote.');
      }
      const quote = await bookingService.quoteFlightChange(bookingLookup.booking.bookingId, {
        ticketIds: tickets.tickets.map((ticket) => ticket.id),
        currentFlightId: selectedFlight.flightId,
        newFlightId: selectedNewOption.flightId,
        newFareId: selectedNewOption.fareId,
      });
      setFlightChangeQuote(quote);
      setFlightChangeConfirm(null);
      setStep(3);
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : 'Unable to create a flight change quote.');
    } finally {
      setQuoting(false);
    }
  }

  async function handleContinueFromQuote() {
    if (!bookingLookup || !flightChangeQuote || !quotedSettlement) return;
    setConfirmingChange(true);
    setQuoteError(null);
    try {
      const confirm = await bookingService.confirmFlightChange(bookingLookup.booking.bookingId, {
        quoteToken: flightChangeQuote.quoteToken ?? '',
        idempotencyKey: `flight-change-${bookingLookup.booking.bookingId}-${Date.now()}`,
        expectedAdditionalAmount: Math.max(quotedSettlement.netAmount, 0),
        expectedRefundAmount: Math.max(-quotedSettlement.netAmount, 0),
        expectedNetAmount: quotedSettlement.netAmount,
      });
      setFlightChangeConfirm(confirm);
      if (confirm.status === 'REFUND_FAILED') {
        throw new Error(confirm.errorMessage ?? 'Unable to confirm the flight change.');
      }

      if (confirm.status === 'PAYMENT_REQUIRED') {
        setStep(4);
        return;
      }

      if (confirm.settlementType === 'REFUND') {
        setStep(4);
        return;
      }

      setStep(5);
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : 'Unable to confirm the flight change.');
    } finally {
      setConfirmingChange(false);
    }
  }

  function handleSelectCalendarDate(date: string) {
    setSelectedCalendarDate(date);
    setSelectedNewOptionId(null);
    setFlightChangeQuote(null);
    setQuoteError(null);
  }

  function handleShiftCalendarWindow(offset: number) {
    if (!activeCalendarDate) return;
    const nextDate = addDays(activeCalendarDate, offset);
    if (nextDate < getTodayIso()) return;
    const existsInCurrentWindow = calendarDays.some((day) => day.date === nextDate);

    setSelectedNewOptionId(null);
    setFlightChangeQuote(null);
    setQuoteError(null);
    if (existsInCurrentWindow) {
      setSelectedCalendarDate(nextDate);
      return;
    }

    pendingCalendarDateRef.current = nextDate;
    setCalendarCenterDate(nextDate);
  }

  function resetFlightChangePaymentCard() {
    setActivePayment(null);
    setPaymentStatusOverride(null);
    setCheckingPaymentStatus(false);
    setCancelingPayment(false);
    setRegeneratingPayment(false);
  }

  function finalizeFlightChangePayment(
    variant: FlightChangePaymentResultVariant | null,
    options?: { preserveCard?: boolean }
  ) {
    if (!options?.preserveCard) {
      resetFlightChangePaymentCard();
    }
    if (variant === 'saved') {
      const mockVariant = resolveMockManageBookingVariant();
      if (mockVariant) commitMockManageBookingVariant(mockVariant);
      const redirectContext = readFlightChangeRedirectContext();
      const resolvedCurrentFlight = selectedFlight ?? redirectContext?.currentFlight ?? null;
      const resolvedNewFlight = selectedNewOption ?? redirectContext?.newFlight ?? null;
      const resolvedPnr = bookingLookup?.booking.pnrCode ?? redirectContext?.pnr ?? '';
      if (resolvedCurrentFlight && resolvedNewFlight && resolvedPnr) {
        setCompletedFlightChange({
          pnr: resolvedPnr,
          currentFlight: resolvedCurrentFlight,
          newFlight: resolvedNewFlight,
        });
      }
      clearFlightChangeRedirectContext();
      setPaymentError(null);
      setStep(5);
      return;
    }
    if (variant) {
      clearFlightChangeRedirectContext();
      setPaymentError(getFlightChangePaymentErrorMessage(variant));
      setStep(4);
    }
  }

  async function createOrRefreshFlightChangePayment(
    methodCode: string,
    mode: 'create' | 'regenerate'
  ) {
    if (!bookingLookup || !flightChangeConfirm) return;

    if (flightChangeConfirm.settlementType === 'REFUND') {
      finalizeFlightChangePayment('saved');
      return;
    }

    if (!flightChangeConfirm.settlementId) return;

    const availableMethods = paymentMethods;
    const resolvedMethod =
      availableMethods.find((method) => method.code === methodCode) ?? availableMethods[0];

    if (!resolvedMethod?.code) {
      setPaymentError('No valid payment method found for this flight change.');
      return;
    }

    if (mode === 'create') {
      setPaying(true);
    } else {
      setRegeneratingPayment(true);
    }
    setPaymentError(null);
    setPaymentStatusOverride(null);
    try {
      const response = await createFlightChangePaymentLink({
        bookingId: bookingLookup.booking.bookingId,
        flightChangeSettlementId: flightChangeConfirm.settlementId,
        method: resolvedMethod.code,
      });
      const paymentUrl = response.action?.paymentUrl ?? response.payment.paymentUrl ?? null;
      const hasQrData = Boolean(response.action?.qrData ?? response.payment.qrData);
      if (paymentUrl && !hasQrData) {
        const isLocalMockUrl = /mock\\.stripe\\.local/i.test(paymentUrl);
        if (isLocalMockUrl) {
          finalizeFlightChangePayment('saved');
          return;
        }
        const paymentId = resolvePaymentId(response);
        if (paymentId != null) {
          storeFlightChangeRedirectContext({
            paymentId,
            amount: Math.abs(activeSettlement?.netAmount ?? 0),
            currency: flightChangeConfirm.currency,
            pnr: bookingLookup.booking.pnrCode,
            currentFlight: selectedFlight,
            newFlight: selectedNewOption,
          });
        }
        window.location.assign(paymentUrl);
        return;
      }
      setActivePayment(response);
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : 'Unable to create a payment link.'
      );
    } finally {
      if (mode === 'create') {
        setPaying(false);
      } else {
        setRegeneratingPayment(false);
      }
    }
  }

  async function handlePayment(methodCode: string) {
    await createOrRefreshFlightChangePayment(methodCode, 'create');
  }

  async function regenerateFlightChangePayment() {
    const methodCode = activePayment?.payment.method ?? paymentMethods[0]?.code ?? '';
    if (!methodCode) return;
    await createOrRefreshFlightChangePayment(methodCode, 'regenerate');
  }

  async function checkFlightChangePaymentStatus() {
    const paymentId = resolvePaymentId(activePayment);
    if (paymentId == null) return;
    setCheckingPaymentStatus(true);
    setPaymentError(null);
    try {
      const response = await getPaymentStatus(paymentId);
      const status = (response.payment?.status as PaymentStatus | undefined) ?? null;
      setPaymentStatusOverride(status);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Unable to check payment status. Please try again.'
      );
    } finally {
      setCheckingPaymentStatus(false);
    }
  }

  async function cancelCreatedFlightChangePayment() {
    const paymentId = resolvePaymentId(activePayment);
    if (paymentId == null) {
      resetFlightChangePaymentCard();
      return;
    }
    setCancelingPayment(true);
    setPaymentError(null);
    try {
      await cancelPayment(paymentId, 'Flight change payment cancelled');
      setPaymentStatusOverride('CANCELLED');
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : 'Unable to cancel the payment transaction.'
      );
    } finally {
      setCancelingPayment(false);
    }
  }

  async function handleFlightChangePaymentExpired() {
    await checkFlightChangePaymentStatus();
  }

  function closeFlightChangePaymentCard() {
    const effectiveStatus =
      paymentStatusOverride ?? (activePayment?.payment.status as PaymentStatus | undefined) ?? null;
    const nextVariant = mapPaymentStatusToResultVariant(effectiveStatus);
    finalizeFlightChangePayment(nextVariant);
  }

  useEffect(() => {
    const paymentId = resolvePaymentId(activePayment);
    const resolvedStatus =
      paymentStatusOverride ?? (activePayment?.payment.status as PaymentStatus | undefined) ?? null;

    if (paymentId == null) return;
    if (resolvedStatus != null && resolvedStatus !== 'PENDING') {
      finalizeFlightChangePayment(mapPaymentStatusToResultVariant(resolvedStatus), {
        preserveCard: false,
      });
      return;
    }

    const timer = window.setInterval(() => {
      void checkFlightChangePaymentStatus();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    activePayment,
    paymentStatusOverride,
    checkFlightChangePaymentStatus,
    finalizeFlightChangePayment,
  ]);

  const handledFlightChangeReturnRef = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const storedRedirectContext = readFlightChangeRedirectContext();
    const rawPaymentId = params.get('flightChangePaymentId') ?? params.get('paymentId');
    const flightChangeReturn = params.get('flightChangeReturn') === '1' || rawPaymentId != null;
    if (!flightChangeReturn && !rawPaymentId) return;

    const paymentId = Number(rawPaymentId ?? storedRedirectContext?.paymentId ?? NaN);
    if (!Number.isFinite(paymentId) || paymentId <= 0) return;

    const handledKey = `${paymentId}:${location.search}`;
    if (handledFlightChangeReturnRef.current === handledKey) return;
    handledFlightChangeReturnRef.current = handledKey;

    setStep(4);
    if (
      storedRedirectContext?.currentFlight &&
      storedRedirectContext?.newFlight &&
      storedRedirectContext?.pnr
    ) {
      setCompletedFlightChange({
        pnr: storedRedirectContext.pnr,
        currentFlight: storedRedirectContext.currentFlight,
        newFlight: storedRedirectContext.newFlight,
      });
    }

    let cancelled = false;
    let timer: number | null = null;

    const cleanupUrl = () => {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('flightChangeReturn');
      nextParams.delete('flightChangePaymentId');
      nextParams.delete('paymentId');
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true }
      );
    };

    const finishWithVariant = (variant: FlightChangePaymentResultVariant) => {
      cleanupUrl();
      finalizeFlightChangePayment(variant, { preserveCard: false });
    };

    const pollStatus = async () => {
      try {
        const response = await getPaymentStatus(paymentId);
        if (cancelled) return;
        const status = (response.payment?.status as PaymentStatus | undefined) ?? null;
        if (status == null || status === 'PENDING') {
          timer = window.setTimeout(() => {
            void pollStatus();
          }, 4000);
          return;
        }
        finishWithVariant(mapPaymentStatusToResultVariant(status) ?? 'error');
      } catch {
        if (cancelled) return;
        finishWithVariant('error');
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [location.pathname, location.search, navigate, finalizeFlightChangePayment]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-4 text-stone-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading booking data...
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!bookingLookup || flights.length === 0) {
    return (
      <div className="min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="w-full rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <PlaneTakeoff className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-950">
              No booking information
            </h1>
            <p className="mt-3 text-base leading-7 text-stone-600">
              {bootstrapError ??
                'Go back to Manage booking and look up your booking before changing flights.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/manage-booking')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Manage booking
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const pnr = bookingLookup.booking.pnrCode;
  const statusLabel = bookingLookup.booking.statusLabel || 'Confirmed';
  const newFlightsError =
    newFlightsQuery.error instanceof Error
      ? newFlightsQuery.error.message
      : newFlightsQuery.isError
        ? 'Unable to load flights.'
        : null;

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="mx-auto min-h-svh w-full max-w-400 px-6 pb-16 pt-24 sm:pt-28 md:px-8">
        <div className="mb-8">
          <div className="mb-2 text-[0.72rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            Booking change
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">
            Change your flight
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
            Review your itinerary, choose a replacement flight, and complete the booking update with the existing content and flow unchanged.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
          <span className="font-medium">Booking reference:</span>
          <span className="rounded-full border border-luxury-gold/20 bg-white px-3 py-1 font-black tracking-[0.16em] text-midnight-burgundy">
            {pnr}
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {statusLabel}
          </span>
        </div>

        <div className="min-w-0">
          {step === 1 ? (
            <ChooseFlightStep
              flights={flights}
              selectedFlightId={selectedFlightId}
              onSelect={(id) => setSelectedFlightId(id)}
              onContinue={() => setStep(2)}
              onBack={() => navigate('/manage-booking')}
            />
          ) : null}

          {step === 2 && selectedFlight ? (
            <ChooseNewFlightStep
              currentFlight={selectedFlight}
              calendarDays={calendarDays}
              selectedDate={activeCalendarDate}
              options={newFlightOptions}
              loading={newFlightsQuery.isPending && !newFlightsQuery.data}
              errorMessage={newFlightsError ?? quoteError}
              continuing={quoting}
              selectedOptionId={selectedNewOptionId}
              passengerSummary={passengerSummary}
              onSelect={(optionId) => {
                setSelectedNewOptionId(optionId);
                setFlightChangeQuote(null);
                setQuoteError(null);
              }}
              onSelectDate={handleSelectCalendarDate}
              onBack={() => setStep(1)}
              onContinue={() => void handleRequestFlightChangeQuote()}
              onRefresh={() => void newFlightsQuery.refetch()}
              onShiftWindow={handleShiftCalendarWindow}
            />
          ) : null}

          {step === 3 && selectedFlight && selectedNewOption && quotedSettlement ? (
            <ConfirmChangeStep
              currentFlight={selectedFlight}
              newFlight={selectedNewOption}
              passengers={passengerItems}
              settlement={quotedSettlement}
              currency={flightChangeQuote?.currency ?? selectedNewOption.currency}
              extrasSummary={extrasSummary}
              continuing={confirmingChange}
              errorMessage={quoteError}
              onBack={() => setStep(2)}
              onContinue={() => void handleContinueFromQuote()}
            />
          ) : null}

          {step === 4 && selectedFlight && selectedNewOption && activeSettlement ? (
            <PaymentStep
              settlement={activeSettlement}
              currency={flightChangeQuote?.currency ?? selectedNewOption.currency}
              paymentMethods={paymentMethods}
              paymentMethodsLoading={paymentMethodsQuery.isLoading}
              paying={paying}
              errorMessage={paymentError}
              passengerName={passengerItems[0]?.fullName ?? ''}
              onBack={() => setStep(3)}
              onConfirm={(methodCode) => void handlePayment(methodCode)}
            />
          ) : null}

          {step === 5 && completedStepData ? (
            <CompleteStep
              pnr={completedStepData.pnr}
              currentFlight={completedStepData.currentFlight}
              newFlight={completedStepData.newFlight}
            />
          ) : null}
        </div>
      </main>
      <SiteFooter />
      {activePayment ? (
        <PaymentCard
          data={activePayment}
          onClose={closeFlightChangePaymentCard}
          onRegenerate={() => void regenerateFlightChangePayment()}
          onCheckStatus={() => void checkFlightChangePaymentStatus()}
          onCancel={() => void cancelCreatedFlightChangePayment()}
          onExpired={() => void handleFlightChangePaymentExpired()}
          checkingStatus={checkingPaymentStatus}
          canceling={cancelingPayment}
          regenerating={regeneratingPayment}
          statusOverride={paymentStatusOverride}
          errorMessage={paymentError}
        />
      ) : null}
    </div>
  );
}
