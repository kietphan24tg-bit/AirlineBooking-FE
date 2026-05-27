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
  { id: 1, label: 'Chọn chuyến bay' },
  { id: 2, label: 'Chọn chuyến mới' },
  { id: 3, label: 'Xác nhận thay đổi' },
  { id: 4, label: 'Thanh toán' },
  { id: 5, label: 'Hoàn tất' },
] as const;

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDayMonth(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatWeekday(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ngày bay';
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '');
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
  return `${safeAmount.toLocaleString('vi-VN')} ${currency}`;
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
      return 'Thanh toan khong thanh cong. Vui long thu lai hoac chon phuong thuc khac.';
    case 'payment_cancelled':
      return 'Giao dich da bi huy truoc khi hoan tat. Vui long tao lai giao dich de tiep tuc.';
    case 'payment_expired':
      return 'Ma thanh toan da het han. Vui long tao ma moi de tiep tuc.';
    default:
      return 'Khong the xac nhan trang thai thanh toan luc nay. Vui long thu lai.';
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
  if (normalized === 'ADULT') return 'Người lớn';
  if (normalized === 'CHILD') return 'Trẻ em';
  if (normalized === 'INFANT') return 'Em bé';
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

function mapFlightLegToOption(leg: FlightLeg): NewFlightOption | null {
  const cheapestFare = [...leg.cabinFares]
    .filter((fare) => fare.selectable)
    .sort((a, b) => a.priceAmount - b.priceAmount)[0];

  if (!cheapestFare || typeof cheapestFare.fareId !== 'number') return null;

  return {
    id: `${leg.id}:${cheapestFare.fareId}`,
    flightId: Number(leg.id),
    fareId: cheapestFare.fareId,
    flightNumber: leg.flightNumber,
    aircraft: leg.aircraft,
    departureCode: leg.departureCode,
    arrivalCode: leg.arrivalCode,
    departureTime: leg.departureTime,
    arrivalTime: leg.arrivalTime,
    durationLabel: leg.durationLabel,
    cabin: cabinLabel(cheapestFare.cabin),
    fareName: cheapestFare.fareCode ?? cheapestFare.cabin,
    priceAmount: cheapestFare.priceAmount,
    priceLabel: cheapestFare.priceLabel,
    currency: cheapestFare.currency ?? 'VND',
  };
}

function ChangeFlightStepper({ currentStepId }: { currentStepId: number }) {
  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-4 border-b border-stone-200 pb-4">
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
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : status === 'active'
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {status === 'completed' ? <Check className="h-3.5 w-3.5" /> : step.id}
                </div>
                <span
                  className={`whitespace-nowrap text-sm ${
                    status === 'active' ? 'font-bold text-red-700' : 'font-medium text-stone-700'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < CHANGE_STEP_ITEMS.length - 1 ? (
                <div className="h-px w-10 bg-stone-200 md:w-16" />
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
      className={`rounded-xl border bg-white transition-colors ${
        selected ? 'border-red-300 bg-red-50/20' : 'border-stone-200'
      }`}
    >
      <div className="flex flex-col md:flex-row">
        <div
          className={`flex w-full items-start gap-3 border-b border-stone-100 p-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r ${
            selected ? 'bg-red-50/40' : ''
          }`}
        >
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Chọn chuyến bay ${index + 1}`}
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
              selected
                ? 'border-red-600 bg-red-600'
                : 'border-stone-300 bg-white hover:border-red-400'
            }`}
          >
            {selected ? <span className="block h-2 w-2 rounded-full bg-white" /> : null}
          </button>

          <div className="flex flex-col items-start">
            <span className="mb-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
              Chuyến bay {index + 1}
            </span>
            <div className="text-base font-bold text-stone-950">{flight.flightNumber}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-900">
              {flight.departureCode}
              <ArrowRight className="h-3 w-3 text-stone-400" />
              {flight.arrivalCode}
            </div>
            <div className="mt-1.5 text-xs text-stone-500">
              {flight.departureTime} - {flight.arrivalTime} • {flight.departureDate}
            </div>
            {!flight.changeable ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                <Info className="h-3 w-3" />
                Không được đổi
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 p-4 md:grid-cols-4">
          <div className="flex flex-col text-sm">
            <div className="text-base font-bold text-stone-950">{flight.departureTime}</div>
            <div className="mt-0.5 font-semibold text-stone-900">{flight.departureCode}</div>
            <div className="text-[11px] text-stone-500">{flight.departureDate}</div>
            <div className="truncate text-[11px] text-stone-500">{flight.departureCity}</div>
            {flight.departureTerminal ? (
              <div className="mt-0.5 text-[11px] font-medium text-stone-500">
                Sân bay {flight.departureTerminal}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center justify-center px-2 text-center">
            <Plane className="mb-1 h-5 w-5 shrink-0 text-stone-400" />
            <span className="whitespace-nowrap text-[11px] text-stone-500">
              {flight.durationLabel}
            </span>
          </div>

          <div className="flex flex-col text-sm">
            <div className="text-base font-bold text-stone-950">{flight.arrivalTime}</div>
            <div className="mt-0.5 font-semibold text-stone-900">{flight.arrivalCode}</div>
            <div className="text-[11px] text-stone-500">{flight.arrivalDate}</div>
            <div className="truncate text-[11px] text-stone-500">{flight.arrivalCity}</div>
            {flight.arrivalTerminal ? (
              <div className="mt-0.5 text-[11px] font-medium text-stone-500">
                Sân bay {flight.arrivalTerminal}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col text-sm">
            <div className="mb-1 text-[11px] text-stone-500">Hạng vé</div>
            <div className="text-[11px] font-semibold text-stone-950">{flight.fareName}</div>
            <div className="mb-1 mt-2 text-[11px] text-stone-500">Phí đổi</div>
            <div className="text-[11px] font-semibold text-stone-900">
              {flight.changeable ? formatMoney(flight.changeFee, flight.currency) : 'Không áp dụng'}
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
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">
        Quy trình thay đổi chuyến bay
      </h2>
      <ChangeFlightStepper currentStepId={1} />

      <div className="rounded-[16px] border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-5">
          <h3 className="text-lg font-semibold text-stone-950">1. Chọn chuyến bay cần thay đổi</h3>
          <p className="mt-1 text-sm text-stone-500">
            Chọn chuyến bay bạn muốn thay đổi trong hành trình của mình.
          </p>
        </div>

        <div className="space-y-4 bg-stone-50/50 p-5">
          {flights.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-500">
              Không tìm thấy chuyến bay nào trong đặt chỗ này.
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

        <div className="flex items-start gap-2 border-t border-stone-100 bg-sky-50/60 px-5 py-3 text-xs text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <p>
            Lưu ý: Phí thay đổi và chênh lệch giá vé (nếu có) sẽ được hiển thị ở bước tiếp theo.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <button
            type="button"
            disabled={!selectedFlightId}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tiếp tục
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
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">
        Quy trình thay đổi chuyến bay
      </h2>
      <ChangeFlightStepper currentStepId={2} />

      <div className="overflow-hidden rounded-[16px] border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-950">2. Chọn chuyến bay mới</h3>
              <p className="mt-1 text-sm text-stone-500">
                Chọn chuyến bay thay thế phù hợp cho hành trình bạn muốn thay đổi.
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tải lại
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px]">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Chuyến bay cần thay đổi
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="min-w-[92px]">
                  <div className="text-2xl font-bold tracking-tight text-stone-950">
                    {currentFlight.departureCode}
                  </div>
                  <div className="mt-1 text-sm font-medium text-stone-700">
                    {currentFlight.departureTime}
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-3 text-stone-400">
                  <div className="h-px flex-1 bg-stone-200" />
                  <Plane className="h-4 w-4 shrink-0" />
                  <div className="h-px flex-1 bg-stone-200" />
                </div>
                <div className="min-w-[92px] text-left lg:text-right">
                  <div className="text-2xl font-bold tracking-tight text-stone-950">
                    {currentFlight.arrivalCode}
                  </div>
                  <div className="mt-1 text-sm font-medium text-stone-700">
                    {currentFlight.arrivalTime}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                <span className="font-semibold text-stone-700">{currentFlight.flightNumber}</span>
                <span>{currentFlight.departureDate}</span>
                <span>Hạng vé {currentFlight.fareName}</span>
                <span>{currentFlight.durationLabel}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Hành khách
              </div>
              <div className="mt-3 text-sm font-semibold text-stone-950">{passengerSummary}</div>
              <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                Kết quả đang hiển thị theo dữ liệu gần nhất của hành trình hiện tại.
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onShiftWindow(-1)}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-300"
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
                  className={`min-w-[132px] rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-red-300 bg-red-50 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.08)]'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold ${
                      selected ? 'text-red-700' : 'text-stone-600'
                    }`}
                  >
                    {formatWeekday(day.date)}
                  </div>
                  <div
                    className={`mt-1 text-sm font-bold ${
                      selected ? 'text-red-700' : 'text-stone-900'
                    }`}
                  >
                    {formatDayMonth(day.date)}
                  </div>
                  <div className="mt-1 text-xs text-stone-600">
                    {day.lowestPrice == null
                      ? 'Chưa có giá'
                      : formatMoney(day.lowestPrice, day.currency ?? 'VND')}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onShiftWindow(1)}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-300"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="font-medium text-stone-600">
              {loading
                ? 'Đang tìm chuyến bay phù hợp...'
                : `${selectedCalendarDay?.flightCount ?? options.length} lựa chọn phù hợp`}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700">
              Sắp xếp: Giá thấp nhất
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-stone-50/50 p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-200 bg-white px-5 py-10 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải các chuyến bay phù hợp...
            </div>
          ) : errorMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{errorMessage}</p>
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-500">
              Không có chuyến bay thay thế nào cho hành trình này. Vui lòng chọn ngày khác hoặc liên
              hệ tổng đài.
            </div>
          ) : (
            options.map((option) => {
              const selected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className={`w-full rounded-2xl border bg-white p-4 text-left transition-all ${
                    selected
                      ? 'border-red-300 bg-red-50/40 shadow-[0_10px_30px_rgba(220,38,38,0.08)]'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                    <div className="flex items-center justify-center md:self-start">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {selected ? <span className="block h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-semibold text-stone-500">{option.flightNumber}</span>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                          {option.aircraft}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          {option.fareName}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[auto_minmax(84px,1fr)_auto] sm:items-center">
                        <div>
                          <div className="text-2xl font-bold tracking-tight text-stone-950">
                            {option.departureTime}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-stone-900">
                            {option.departureCode}
                          </div>
                        </div>

                        <div className="flex min-w-[84px] flex-col items-center justify-center text-stone-500">
                          <div className="flex w-full items-center gap-2">
                            <div className="h-px flex-1 bg-stone-200" />
                            <Plane className="h-4 w-4 shrink-0" />
                            <div className="h-px flex-1 bg-stone-200" />
                          </div>
                          <span className="mt-1 text-xs">{option.durationLabel}</span>
                        </div>

                        <div className="sm:text-right">
                          <div className="text-2xl font-bold tracking-tight text-stone-950">
                            {option.arrivalTime}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-stone-900">
                            {option.arrivalCode}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        {option.cabin}
                      </div>
                      <div className="mt-1 text-lg font-bold text-red-600">{option.priceLabel}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        Giá áp dụng cho hành khách đã chọn
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <button
            type="button"
            disabled={!selectedOptionId || continuing}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Tiếp tục
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
      ? 'text-red-600'
      : settlement.mode === 'REFUND'
        ? 'text-emerald-600'
        : 'text-stone-700';
  const fareDifferenceTone =
    settlement.fareDifference > 0
      ? 'text-red-600'
      : settlement.fareDifference < 0
        ? 'text-emerald-600'
        : 'text-stone-900';
  const changeFeeAmount = Math.max(settlement.changeFee, 0);
  const settlementLabel =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Cần thanh toán thêm'
      : settlement.mode === 'REFUND'
        ? 'Hoàn tiền'
        : 'Không thay đổi';
  const settlementCaption =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Phát sinh thêm cho thay đổi chuyến bay'
      : settlement.mode === 'REFUND'
        ? 'Khoản hoàn sẽ được xử lý sau khi xác nhận'
        : extrasSummary;
  const totalLabel =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Tổng cần thanh toán'
      : settlement.mode === 'REFUND'
        ? 'Tổng hoàn tiền'
        : 'Không phát sinh thanh toán';
  const continueLabel =
    settlement.mode === 'COLLECT_PAYMENT'
      ? 'Tiếp tục: Thanh toán'
      : settlement.mode === 'REFUND'
        ? 'Tiếp tục: Hoàn tiền'
        : 'Xác nhận thay đổi';

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">
        Quy trình thay đổi chuyến bay
      </h2>
      <ChangeFlightStepper currentStepId={3} />

      <div className="rounded-[16px] border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-5">
          <h3 className="text-lg font-semibold text-stone-950">3. Xác nhận thay đổi</h3>
          <p className="mt-1 text-sm text-stone-500">
            Vui lòng kiểm tra lại thông tin trước khi tiếp tục.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-stone-200 p-4">
            <div className="text-sm font-semibold text-stone-950">Chuyến bay sẽ thay đổi</div>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
              <article className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Cũ
                </div>
                <div className="mt-2 text-base font-bold text-stone-950">
                  {currentFlight.flightNumber}
                </div>
                <div className="mt-1 text-sm font-semibold text-stone-900">
                  {currentFlight.departureCode} → {currentFlight.arrivalCode}
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {currentFlight.departureTime} - {currentFlight.arrivalTime} |{' '}
                  {currentFlight.departureDate}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                  {currentFlight.fareName}
                </div>
              </article>

              <div className="flex items-center justify-center text-stone-400">
                <ArrowRight className="h-5 w-5" />
              </div>

              <article className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Mới
                </div>
                <div className="mt-2 text-base font-bold text-stone-950">
                  {newFlight.flightNumber}
                </div>
                <div className="mt-1 text-sm font-semibold text-stone-900">
                  {newFlight.departureCode} → {newFlight.arrivalCode}
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {newFlight.departureTime} - {newFlight.arrivalTime}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                  {newFlight.fareName}
                </div>
              </article>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 p-4">
            <div className="text-sm font-semibold text-stone-950">Thông tin hành khách</div>
            <div className="mt-4 space-y-3">
              {passengers.map((passenger, index) => (
                <div
                  key={passenger.id}
                  className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/50 px-4 py-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-stone-500">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-950">{passenger.fullName}</div>
                    <div className="text-xs text-stone-500">{passenger.typeLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 p-4">
            <div className="text-sm font-semibold text-stone-950">Chi tiết thanh toán</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-stone-600">
                <span>Giá vé gốc</span>
                <span className="font-semibold text-stone-900">
                  {formatMoney(settlement.originalFareAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Giá vé mới</span>
                <span className="font-semibold text-stone-900">
                  {formatMoney(settlement.newFareAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Chênh lệch giá vé</span>
                <span className={`font-semibold ${fareDifferenceTone}`}>
                  {settlement.fareDifference === 0
                    ? formatMoney(0, currency)
                    : `${settlement.fareDifference > 0 ? '+' : '−'}${formatMoney(
                        Math.abs(settlement.fareDifference),
                        currency
                      )}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Phí thay đổi</span>
                <span className="font-semibold text-stone-900">
                  {formatMoney(changeFeeAmount, currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-red-700">
                    {settlementLabel}
                  </div>
                  <div className="mt-1 text-sm text-stone-500">{settlementCaption}</div>
                </div>
                <div className={`text-xl font-bold ${amountTone}`}>
                  {settlement.mode === 'NO_CHANGE'
                    ? '—'
                    : formatMoney(Math.abs(settlement.netAmount), currency)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-base font-bold text-stone-950">
              <span>{totalLabel}</span>
              <span className={amountTone}>
                {settlement.mode === 'NO_CHANGE'
                  ? '—'
                  : formatMoney(Math.abs(settlement.netAmount), currency)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <p>
              Nếu tiếp tục, ghế và các dịch vụ đi kèm hiện có sẽ được rà soát lại theo điều kiện vé
              của chuyến bay mới.
            </p>
          </div>
          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{errorMessage}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <button
            type="button"
            disabled={continuing}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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
  const hasPaymentMethods = paymentMethods.length > 0;

  useEffect(() => {
    if (isRefund || !hasPaymentMethods) return;
    setSelectedPaymentMethod((current) =>
      current && paymentMethods.some((method) => method.code === current)
        ? current
        : paymentMethods[0]?.code || ''
    );
  }, [hasPaymentMethods, isRefund, paymentMethods]);

  const primaryMethod = paymentMethods[0] ?? null;
  const secondaryMethod = paymentMethods[1] ?? null;
  const tertiaryMethod = paymentMethods[2] ?? null;
  const quaternaryMethod = paymentMethods[3] ?? null;

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">
        Quy trình thay đổi chuyến bay
      </h2>
      <ChangeFlightStepper currentStepId={4} />

      <div className="rounded-[16px] border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-5">
          <h3 className="text-lg font-semibold text-stone-950">
            {isRefund ? '4. Hoàn tiền' : '4. Thanh toán bổ sung'}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {isRefund
              ? 'Khoản chênh lệch giá vé sẽ được hoàn về phương thức thanh toán bạn đã sử dụng khi đặt vé.'
              : 'Thanh toán khoản chênh lệch giá vé và phí đổi vé để xác nhận chuyến bay mới của bạn.'}
          </p>
        </div>

        {isRefund ? (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <div className="text-lg font-bold text-stone-950">Hoàn tiền tự động</div>
                <p className="text-sm leading-6 text-stone-600">
                  Thay đổi chuyến bay đã được xác nhận. Chúng tôi sẽ tự động xử lý hoàn tiền về
                  phương thức thanh toán gốc — bạn không cần thao tác thêm.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-stone-500">Số tiền hoàn lại</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatMoney(amount, currency)}
                </span>
              </div>
              <div className="border-t border-stone-200" />
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-stone-500">Phương thức</span>
                <span className="text-sm font-bold text-stone-900">{paymentMethodLabel}</span>
              </div>
              <div className="border-t border-stone-200" />
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-stone-500">Người nhận</span>
                <span className="text-sm font-semibold text-stone-900">{passengerName || '—'}</span>
              </div>
              <div className="border-t border-stone-200" />
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-stone-500">Thời gian xử lý</span>
                <span className="text-sm font-semibold text-stone-900">7 – 14 ngày làm việc</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-xs text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <p className="leading-5">
                Tiến trình hoàn tiền có thể xem trong phần Quản lý đặt chỗ. Nếu chưa nhận được sau
                thời hạn, vui lòng gọi 1900 1234.
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(event) => setAgreedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
              />
              <span className="leading-5">
                Tôi đã đọc và đồng ý với chính sách hoàn tiền cùng các điều khoản đổi vé của
                SOVEREIGN.
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-red-700">Bạn cần thanh toán thêm</div>
                <p className="text-sm text-stone-700">
                  Vui lòng thanh toán để xác nhận thay đổi chuyến bay.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <h4 className="text-base font-bold text-stone-950">Chi tiết thanh toán</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-600">Giá vé gốc</span>
                  <span className="font-semibold text-stone-900">
                    {formatMoney(settlement.originalFareAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-600">Giá vé mới</span>
                  <span className="font-semibold text-stone-900">
                    {formatMoney(settlement.newFareAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-600">Chênh lệch giá vé</span>
                  <span className="font-semibold text-stone-900">
                    {formatMoney(fareDifferenceAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-600">Phí thay đổi</span>
                  <span className="font-semibold text-stone-900">
                    {formatMoney(changeFeeAmount, currency)}
                  </span>
                </div>
              </div>
              <div className="border-t border-stone-200" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-stone-950">Cần thanh toán thêm</span>
                  <span className="text-xl font-bold tracking-tight text-red-600">
                    {formatMoney(amount, currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Vui lòng thanh toán để xác nhận thay đổi.
                </p>
              </div>
            </div>

            <div className="border-t border-stone-200" />

            <div className="space-y-3">
              <h4 className="text-base font-bold text-stone-950">Chọn phương thức thanh toán</h4>
              <div className="space-y-2.5">
                <PaymentMethodOption
                  selected={selectedPaymentMethod === (primaryMethod?.code ?? '')}
                  onClick={() => primaryMethod && setSelectedPaymentMethod(primaryMethod.code)}
                  subtitle={primaryMethod?.provider ?? null}
                  title="Thẻ tín dụng / Thẻ ghi nợ"
                  trailing={null}
                />
                <PaymentMethodOption
                  selected={selectedPaymentMethod === (secondaryMethod?.code ?? '')}
                  onClick={() => secondaryMethod && setSelectedPaymentMethod(secondaryMethod.code)}
                  subtitle={secondaryMethod?.provider ?? null}
                  title="Ví điện tử"
                  trailing={null}
                />
                <PaymentMethodOption
                  selected={selectedPaymentMethod === (tertiaryMethod?.code ?? '')}
                  onClick={() => tertiaryMethod && setSelectedPaymentMethod(tertiaryMethod.code)}
                  subtitle={tertiaryMethod?.provider ?? null}
                  title="Chuyển khoản ngân hàng"
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

            <label className="flex items-start gap-2.5 pt-1 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(event) => setAgreedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-red-600"
              />
              <span className="leading-5">
                Tôi đồng ý với Điều khoản giao dịch và Chính sách đổi vé của SOVEREIGN.
              </span>
            </label>
          </div>
        )}

        {errorMessage ? (
          <div className="border-t border-stone-100 px-5 py-3">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-stone-100 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <button
            type="button"
            disabled={paying || !agreedTerms || (!isRefund && !selectedPaymentMethod)}
            onClick={() => onConfirm(selectedPaymentMethod)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${
              isRefund ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
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
              ? `Xác nhận hoàn tiền ${formatMoney(amount, currency)}`
              : `Thanh toán ${formatMoney(amount, currency)}`}
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
        Quy trình thay đổi chuyến bay
      </h2>
      <ChangeFlightStepper currentStepId={5} />

      <div className="rounded-[20px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-2xl font-bold text-emerald-800">Thay đổi chuyến bay thành công</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Mã đặt chỗ <span className="font-semibold text-stone-950">{pnr}</span> đã được cập nhật
          với chuyến bay mới.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Chuyến cũ
            </div>
            <div className="mt-2 text-base font-bold text-stone-950">
              {currentFlight.flightNumber}
            </div>
            <div className="mt-1 text-sm text-stone-700">
              {currentFlight.departureCode} → {currentFlight.arrivalCode}
            </div>
            <div className="mt-1 text-xs text-stone-500">
              {currentFlight.departureTime} - {currentFlight.arrivalTime} •{' '}
              {currentFlight.departureDate}
            </div>
          </article>

          <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Chuyến mới
            </div>
            <div className="mt-2 text-base font-bold text-stone-950">{newFlight.flightNumber}</div>
            <div className="mt-1 text-sm text-stone-700">
              {newFlight.departureCode} → {newFlight.arrivalCode}
            </div>
            <div className="mt-1 text-xs text-stone-500">
              {newFlight.departureTime} - {newFlight.arrivalTime}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <Home className="h-4 w-4" />
            Về trang chủ
          </button>
          <button
            type="button"
            onClick={() => navigate('/manage-booking')}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Quản lý đặt chỗ
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
          error instanceof Error ? error.message : 'Không thể tải dữ liệu đặt chỗ mẫu.'
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
      adultCount > 0 ? `${adultCount} người lớn` : null,
      childCount > 0 ? `${childCount} trẻ em` : null,
      infantCount > 0 ? `${infantCount} em bé` : null,
    ]
      .filter(Boolean)
      .join(', ') || '1 người lớn';
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
    if (!bookingLookup) return 'Không có tiện ích đi kèm';

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
        ? `Không có tiện ích đi kèm cho ${passengerCount} hành khách`
        : 'Không có tiện ích đi kèm';
    }

    return `${extrasCount} tiện ích trên ${passengerCount} hành khách`;
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
      .map(mapFlightLegToOption)
      .filter((option): option is NewFlightOption => option != null)
      .filter((option) => option.flightNumber !== selectedFlight?.flightNumber);
  }, [activeCalendarDay, selectedFlight?.flightNumber]);

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
        throw new Error('Khong tim thay ticket hop le de bao gia doi chuyen.');
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
      setQuoteError(error instanceof Error ? error.message : 'Khong the bao gia doi chuyen bay.');
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
        throw new Error(confirm.errorMessage ?? 'Khong the xac nhan doi chuyen bay.');
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
      setQuoteError(error instanceof Error ? error.message : 'Khong the xac nhan doi chuyen bay.');
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
      setPaymentError('Khong tim thay phuong thuc thanh toan hop le cho doi chuyen bay.');
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
        error instanceof Error ? error.message : 'Khong the tao lien ket thanh toan.'
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
          : 'Khong the kiem tra trang thai thanh toan. Vui long thu lai.'
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
        error instanceof Error ? error.message : 'Khong the huy giao dich thanh toan.'
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
      <div className="min-h-screen bg-[#faf8f4] text-stone-900 antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-4 text-stone-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải dữ liệu đặt chỗ...
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!bookingLookup || flights.length === 0) {
    return (
      <div className="min-h-screen bg-[#faf8f4] text-stone-900 antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="w-full rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <PlaneTakeoff className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-950">
              Chưa có thông tin đặt chỗ
            </h1>
            <p className="mt-3 text-base leading-7 text-stone-600">
              {bootstrapError ?? 'Quay lại Quản lý đặt chỗ và tìm đặt chỗ trước khi đổi chuyến.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/manage-booking')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại Quản lý đặt chỗ
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const pnr = bookingLookup.booking.pnrCode;
  const statusLabel = bookingLookup.booking.statusLabel || 'Đã xác nhận';
  const newFlightsError =
    newFlightsQuery.error instanceof Error
      ? newFlightsQuery.error.message
      : newFlightsQuery.isError
        ? 'Không thể tải danh sách chuyến bay.'
        : null;

  return (
    <div className="min-h-screen bg-[#faf8f4] text-stone-900 antialiased">
      <SiteHeader />
      <main className="mx-auto min-h-svh w-full max-w-400 px-6 pb-16 pt-24 sm:pt-28 md:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
          <span className="font-medium text-stone-500">Mã đặt chỗ:</span>
          <span className="font-bold text-stone-900">{pnr}</span>
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
