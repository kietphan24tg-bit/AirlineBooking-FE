import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Headphones,
  Home,
  LoaderCircle,
  Plane,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import {
  bookingService,
  resetMockManageBookingVariant,
  resolveMockManageBookingVariant,
} from '../services/booking.service';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  BookingCancellationConfirmResponse,
  BookingCancellationPreviewResponse,
  BookingLookupResponse,
} from '../types/booking.types';

type CancelStep = 1 | 2 | 3;

interface CancelPassenger {
  id: string;
  passengerId: number;
  name: string;
  type: string;
  dob: string;
  baggage: string;
}

interface CancelFlightLeg {
  flightId: number;
  label: string;
  date: string;
  time: string;
  fromCode: string;
  fromCity: string;
  fromTerminal: string;
  toCode: string;
  toCity: string;
  toTerminal: string;
  flightNo: string;
  cabin: string;
  arrivalTime: string;
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

function selectionKey(passengerId: number, flightId: number): string {
  return `${passengerId}:${flightId}`;
}

function foldAsciiUpper(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase();
}

function passengerTypeVi(type: string): string {
  const map: Record<string, string> = {
    ADULT: 'Adult',
    CHILD: 'Child',
    INFANT: 'Infant',
  };
  return map[type] ?? type;
}

function StepIndicator({ step }: { step: CancelStep }) {
  const steps = [
    { num: 1, label: 'Select flights' },
    { num: 2, label: 'Confirm details' },
    { num: 3, label: 'Result' },
  ];
  return (
    <div className="mb-6 flex items-center gap-0">
      {steps.map((item, index) => {
        const active = step === item.num;
        const done = step > item.num;
        return (
          <div key={item.num} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                  active
                    ? 'bg-primary text-white'
                    : done
                      ? 'bg-luxury-gold text-midnight-burgundy'
                      : 'border border-luxury-gold/20 bg-white text-on-surface-variant'
                }`}
              >
                {done ? 'OK' : item.num}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${
                  active
                    ? 'text-primary'
                    : done
                      ? 'text-midnight-burgundy'
                      : 'text-on-surface-variant'
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-3 h-px flex-1 ${
                  step > item.num ? 'bg-luxury-gold/60' : 'bg-luxury-gold/15'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FlightRow({
  flight,
  selected = false,
  selectable = false,
  onToggle,
}: {
  flight: CancelFlightLeg;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <div
      className={`mt-3 flex items-stretch gap-0 overflow-hidden rounded-[22px] border transition-all ${
        selected
          ? 'border-luxury-gold/35 bg-[linear-gradient(180deg,rgba(125,6,51,0.035),rgba(255,255,255,0.98))] shadow-[0_14px_32px_rgba(125,6,51,0.08)]'
          : 'border-luxury-gold/14 bg-white hover:border-luxury-gold/24'
      }`}
    >
      <div
        className={`flex min-w-[104px] flex-col items-center justify-center px-3 py-3 text-center ${
          selected ? 'bg-[linear-gradient(180deg,rgba(212,175,55,0.14),rgba(125,6,51,0.06))]' : 'bg-surface-lowest'
        }`}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-midnight-burgundy">
          {flight.label}
        </span>
        <span className="mt-1 text-[10px] text-on-surface-variant">{flight.date}</span>
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 px-4 py-3">
        {selectable ? (
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
              selected
                ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                : 'border-luxury-gold/25 bg-white'
            }`}
          >
            {selected ? (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
          </div>
        ) : null}
        <div className="text-left">
          <p className="text-[1.1rem] font-black text-on-surface">{flight.time}</p>
          <p className="text-[1.45rem] font-black text-on-surface">{flight.fromCode}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.fromCity}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.fromTerminal}</p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 px-2">
          <p className="text-[10px] text-midnight-burgundy">{flight.flightNo}</p>
          <div className="flex w-full items-center gap-1">
            <div className="h-px flex-1 border-t-2 border-dashed border-luxury-gold/45" />
            <Plane className="h-4 w-4 text-midnight-burgundy" />
            <div className="h-px flex-1 border-t-2 border-dashed border-luxury-gold/45" />
          </div>
          <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
            {flight.cabin}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[1.1rem] font-black text-on-surface">{flight.arrivalTime}</p>
          <p className="text-[1.45rem] font-black text-on-surface">{flight.toCode}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.toCity}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.toTerminal}</p>
        </div>
      </div>
    </div>
  );

  if (!selectable || !onToggle) return content;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left"
    >
      {content}
    </button>
  );
}

function PreviewSummaryCard({
  preview,
  previewLoading,
  previewError,
  selectedCount,
  flightsById,
  showConfirmAction,
  confirmLoading,
  confirmError,
  onConfirm,
}: {
  preview: BookingCancellationPreviewResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  selectedCount: number;
  flightsById: Map<number, CancelFlightLeg>;
  showConfirmAction: boolean;
  confirmLoading?: boolean;
  confirmError?: string | null;
  onConfirm?: () => void;
}) {
  return (
    <div className="glass-panel self-start rounded-2xl border border-surface-container-high p-5 shadow-sm">
      <p className="mb-4 font-headline text-[1.5rem] font-black text-on-surface">
        Cancellation summary
      </p>

      {selectedCount === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-container-high px-4 py-5 text-sm text-on-surface-variant">
          Select at least one passenger flight to preview the refund.
        </div>
      ) : null}

      {selectedCount > 0 && previewLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-surface-container-high bg-surface-low px-4 py-5 text-sm text-on-surface-variant">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
          Updating preview...
        </div>
      ) : null}

      {preview ? (
        <>
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Cancelled passengers ({preview.items.length})
            </p>
            {preview.items.map((item, index) => (
              <p key={`${item.passengerId}-${index}`} className="text-sm text-on-surface">
                {index + 1}. {item.passengerName}
              </p>
            ))}
          </div>

          <div className="my-3 border-t border-luxury-gold/12" />

          <div className="mb-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Cancelled flights
            </p>
            {preview.items.map((item) => (
              <div key={`${item.passengerId}-${item.flightIds.join('-')}`} className="mb-2">
                <p className="text-[12px] font-semibold text-on-surface">{item.passengerName}</p>
                {item.flightIds.map((flightId) => {
                  const flight = flightsById.get(flightId);
                  if (!flight) return null;
                  return (
                    <p
                      key={`${item.passengerId}-${flightId}`}
                      className="text-[12px] text-on-surface-variant"
                    >
                      {flight.label}: {flight.fromCode} - {flight.toCode} ({flight.flightNo})
                    </p>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-luxury-gold/12" />

          <div className="mb-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Estimated refund
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Fare total</span>
                <span className="text-on-surface">
                  {formatMoney(preview.summary.fareGross, preview.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Seat refund</span>
                <span className="text-on-surface">
                  {formatMoney(preview.summary.seatRefund, preview.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Service refund</span>
                <span className="text-on-surface">
                  {formatMoney(preview.summary.serviceRefund, preview.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Cancellation fee</span>
                <span className="text-midnight-burgundy">
                  -{formatMoney(preview.summary.refundFee, preview.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="my-3 border-t-2 border-luxury-gold/18" />

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface">Total refund</span>
            <span className="text-lg font-black text-midnight-burgundy">
              {formatMoney(preview.summary.netRefund, preview.currency)}
            </span>
          </div>

          {showConfirmAction ? (
            <>
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-[10px] text-amber-800">
                  Preview is ready. Click confirm to submit the cancellation request.
                </p>
              </div>

              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-midnight-burgundy py-3 text-sm font-black text-luxury-gold shadow-[0_14px_30px_rgba(125,6,51,0.18)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Confirm cancellation
              </button>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Step1({
  booking,
  passengers,
  flights,
  selectedFlightKeys,
  preview,
  previewLoading,
  previewError,
  onToggleFlight,
  onBack,
  onNext,
}: {
  booking: {
    pnr: string;
    status: string;
    bookingDate: string;
    totalPrice: string;
  };
  passengers: CancelPassenger[];
  flights: CancelFlightLeg[];
  selectedFlightKeys: Set<string>;
  preview: BookingCancellationPreviewResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  onToggleFlight: (passengerId: number, flightId: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const flightsById = useMemo(
    () => new Map(flights.map((flight) => [flight.flightId, flight])),
    [flights]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Booking reference (PNR)
              </p>
              <p className="mt-1 text-lg font-black text-on-surface">{booking.pnr}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Status
              </p>
              <p className="mt-1 text-sm font-bold text-green-600">{booking.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Booking date
              </p>
              <p className="mt-1 text-sm font-bold text-on-surface">{booking.bookingDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Total amount
              </p>
              <p className="mt-1 text-sm font-black text-primary">{booking.totalPrice}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
          <p className="mb-1 text-base font-bold text-on-surface">
            Select the flights to cancel per passenger
          </p>
          <div className="flex flex-col gap-4">
            {passengers.map((passenger, idx) => (
              <div
                key={passenger.id}
                className="rounded-2xl border border-surface-container-high bg-white px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-black text-on-surface-variant">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-on-surface">{passenger.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {passengerTypeVi(passenger.type)} | {passenger.dob} | Baggage:{' '}
                      {passenger.baggage}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  {flights.map((flight) => {
                    const selected = selectedFlightKeys.has(
                      selectionKey(passenger.passengerId, flight.flightId)
                    );
                    return (
                      <FlightRow
                        key={`${passenger.id}-${flight.flightId}`}
                        flight={flight}
                        selected={selected}
                        selectable
                        onToggle={() => onToggleFlight(passenger.passengerId, flight.flightId)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-surface-container-high bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-low active:scale-95"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!preview || previewLoading}
              onClick={onNext}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {previewLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <PreviewSummaryCard
        preview={preview}
        previewLoading={previewLoading}
        previewError={previewError}
        selectedCount={selectedFlightKeys.size}
        flightsById={flightsById}
        showConfirmAction={false}
        confirmLoading={false}
        confirmError={null}
      />
    </div>
  );
}

function Step2({
  booking,
  preview,
  flights,
  confirmLoading,
  confirmError,
  onBack,
  onConfirm,
}: {
  booking: { pnr: string };
  preview: BookingCancellationPreviewResponse;
  flights: CancelFlightLeg[];
  confirmLoading: boolean;
  confirmError: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const flightsById = useMemo(
    () => new Map(flights.map((flight) => [flight.flightId, flight])),
    [flights]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
        <p className="mb-4 text-base font-bold text-on-surface">Cancellation details</p>

        <div className="mb-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-on-surface-variant">PNR</span>
            <span className="text-sm font-black text-primary">{booking.pnr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-on-surface-variant">Cancelled passengers</span>
            <span className="text-sm font-bold text-on-surface">{preview.items.length}</span>
          </div>
          <div className="pl-0 text-sm text-on-surface-variant">
            {preview.items.map((item, index) => (
              <p key={`${item.passengerId}-${index}`} className="ml-2 text-sm text-on-surface">
                {index + 1}. {item.passengerName}
              </p>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-container-high pt-4">
          <p className="mb-3 text-sm font-bold text-on-surface">Cancelled flights</p>
          {preview.items.map((item, index) => (
            <div key={`${item.passengerId}-${item.flightIds.join('-')}`} className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                {index + 1}. {item.passengerName} - {item.flightIds.length} segment(s)
              </p>
              {item.flightIds.map((flightId) => {
                const flight = flightsById.get(flightId);
                if (!flight) return null;
                return <FlightRow key={`${item.passengerId}-${flightId}`} flight={flight} />;
              })}
            </div>
          ))}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-surface-container-high bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-low active:scale-95"
          >
            Back
          </button>
        </div>
      </div>

      <PreviewSummaryCard
        preview={preview}
        previewLoading={false}
        previewError={null}
        selectedCount={preview.items.reduce((sum, item) => sum + item.flightIds.length, 0)}
        flightsById={flightsById}
        showConfirmAction
        confirmLoading={confirmLoading}
        confirmError={confirmError}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function Step3({
  booking,
  preview,
  flights,
  bookingLookup,
}: {
  booking: { pnr: string; bookingDate: string };
  preview: BookingCancellationConfirmResponse;
  flights: CancelFlightLeg[];
  bookingLookup: BookingLookupResponse;
}) {
  const navigate = useNavigate();
  const flightsById = useMemo(
    () => new Map(flights.map((flight) => [flight.flightId, flight])),
    [flights]
  );
  const cancelledFlightIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of preview.items) for (const id of item.flightIds) ids.add(id);
    return Array.from(ids);
  }, [preview.items]);
  const baggage = bookingLookup.itineraries[0]?.fareBenefits;
  const passengersByFlightId = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const item of preview.items) {
      for (const flightId of item.flightIds) {
        const list = map.get(flightId) ?? [];
        list.push(item.passengerName);
        map.set(flightId, list);
      }
    }
    return map;
  }, [preview.items]);
  const [copied, setCopied] = useState(false);

  function handleCopyCode() {
    if (!preview.cancellationCode) return;
    void navigator.clipboard.writeText(preview.cancellationCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  const isFailed = preview.refundStatus === 'FAILED' || preview.cancellationStatus === 'FAILED';
  const canChangeFlight = bookingLookup.actions?.canChangeFlight ?? false;

  return (
    <div className="space-y-5">
      <div
        className={`glass-panel rounded-[28px] border p-7 shadow-[0_18px_44px_rgba(125,6,51,0.08)] ${
          isFailed
            ? 'border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.9),rgba(255,255,255,0.98))]'
            : 'border-luxury-gold/18 bg-[linear-gradient(180deg,rgba(212,175,55,0.08),rgba(255,255,255,0.98))]'
        }`}
      >
        <div className="mb-4 flex">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isFailed ? 'bg-red-100' : 'bg-green-100'
            }`}
          >
            {isFailed ? (
              <XCircle className="h-10 w-10 text-red-500" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            )}
          </div>
        </div>
        <h2
          className={`mb-2 font-headline text-[2rem] font-black ${
            isFailed ? 'text-red-700' : 'text-on-surface'
          }`}
        >
          {isFailed ? 'Cancellation failed!' : 'Cancellation successful!'}
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-on-surface-variant">
          {isFailed
            ? 'Your cancellation request could not be processed.'
            : 'Your flight cancellation request has been processed.'}
        </p>
        {preview.cancellationCode ? (
          <button
            type="button"
            onClick={handleCopyCode}
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-xs font-semibold text-on-surface transition-all active:scale-95 ${
              isFailed ? 'border-red-200 hover:bg-red-50' : 'border-green-200 hover:bg-green-50'
            }`}
          >
            <span className="text-on-surface-variant">Cancellation code:</span>
            <span className={`font-black ${isFailed ? 'text-red-700' : 'text-green-700'}`}>
              {preview.cancellationCode}
            </span>
            <Copy className="h-3.5 w-3.5 text-on-surface-variant" />
            {copied ? <span className="text-[10px] text-green-600">copied</span> : null}
          </button>
        ) : null}
      </div>

      {isFailed && preview.errorMessage ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-bold text-red-700">Failure reason</p>
            <p className="mt-0.5 text-sm text-red-800">{preview.errorMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="glass-panel rounded-[28px] border border-luxury-gold/18 p-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
            <p className="mb-4 font-headline text-[1.5rem] font-black text-on-surface">
              Booking information
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  PNR
                </p>
                <p className="mt-1 text-lg font-black text-midnight-burgundy">{booking.pnr}</p>
              </div>
              <div className="rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Booking date
                </p>
                <p className="mt-1 text-sm font-bold text-on-surface">{booking.bookingDate}</p>
              </div>
              <div className="rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Status
                </p>
                <p
                  className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                    isFailed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isFailed ? 'Confirmed' : 'Cancelled'}
                </p>
              </div>
              <div className="rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {isFailed ? 'Requested at' : 'Cancelled at'}
                </p>
                <p className="mt-1 text-sm font-bold text-on-surface">
                  {formatDateTimeLabel(preview.cancelledAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[28px] border border-luxury-gold/18 p-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
            <p className="mb-3 font-headline text-[1.5rem] font-black text-on-surface">
              {isFailed ? 'Itinerary' : 'Cancelled itinerary'}
            </p>
            <div className="space-y-4">
              {cancelledFlightIds.map((flightId) => {
                const flight = flightsById.get(flightId);
                if (!flight) return null;
                const passengerNames = passengersByFlightId.get(flightId) ?? [];
                return (
                  <div key={flightId}>
                    <FlightRow flight={flight} />
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-2 rounded-[18px] bg-surface-lowest px-4 py-2 text-[11px]">
                      <p className="text-on-surface-variant">
                        Passenger:{' '}
                        <span className="font-bold uppercase text-on-surface">
                          {passengerNames.join(', ')}
                        </span>
                      </p>
                      {baggage ? (
                        <p className="text-on-surface-variant">
                          Baggage:{' '}
                          <span className="font-bold text-on-surface">
                            {baggage.baggageCheckinKg}kg checked, {baggage.baggageHandKg}kg cabin
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isFailed ? (
            <div className="glass-panel rounded-[28px] border border-luxury-gold/18 p-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
              <p className="mb-3 font-headline text-[1.5rem] font-black text-on-surface">
                Refund information
              </p>
              <div className="rounded-[22px] border border-luxury-gold/14 bg-surface-lowest px-4 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold text-on-surface-variant">Total refund</p>
                    <p className="mt-1 text-2xl font-black text-midnight-burgundy">
                      {formatMoney(preview.summary.netRefund, preview.currency)}
                    </p>
                  </div>
                  {preview.refundMethod ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-on-surface-variant">Refund method</span>
                        <span className="text-right font-bold text-on-surface">
                          {preview.refundMethod.maskedAccount
                            ? `${preview.refundMethod.label} (${preview.refundMethod.maskedAccount})`
                            : preview.refundMethod.label}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-on-surface-variant">Estimated time</span>
                        <span className="text-right font-bold text-on-surface">
                          {preview.refundMethod.estimatedDays}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              {preview.refundMethod ? (
                <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-luxury-gold/14 bg-midnight-burgundy/5 px-3 py-2 text-[11px] text-midnight-burgundy">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-midnight-burgundy" />
                  <p>
                    The refund will be processed to your account/card within{' '}
                    {preview.refundMethod.estimatedDays} depending on your card issuer.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isFailed ? (
            <div className="glass-panel rounded-[28px] border border-luxury-gold/18 p-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
              <p className="mb-3 font-headline text-[1.5rem] font-black text-on-surface">
                Suggestions for you
              </p>
              {canChangeFlight ? (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-luxury-gold/12 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-on-surface-variant" />
                    <p className="text-[12px] text-on-surface-variant">
                      You may change to another flight if seats are available and your fare allows.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/manage-booking/cancel')}
                    className="rounded-full border border-midnight-burgundy/20 px-3 py-1.5 text-[12px] font-bold text-midnight-burgundy transition-all hover:bg-midnight-burgundy/5"
                  >
                    Change flight
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-luxury-gold/12 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Headphones className="h-4 w-4 text-on-surface-variant" />
                  <p className="text-[12px] text-on-surface-variant">
                    Contact our hotline <span className="font-bold text-midnight-burgundy">1900 1886</span> for
                    detailed support.
                  </p>
                </div>
                <a
                  href="tel:19001886"
                  className="rounded-full border border-midnight-burgundy/20 px-3 py-1.5 text-[12px] font-bold text-midnight-burgundy transition-all hover:bg-midnight-burgundy/5"
                >
                  Call now
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="glass-panel rounded-[28px] border border-luxury-gold/18 p-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
            <p className="mb-4 font-headline text-[1.5rem] font-black text-on-surface">
              Next actions
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/manage-booking')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-midnight-burgundy px-4 py-3 text-sm font-bold text-luxury-gold shadow-[0_14px_30px_rgba(125,6,51,0.18)] transition-all hover:brightness-110 active:scale-95"
              >
                Manage booking
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-luxury-gold/16 bg-white px-4 py-3 text-sm font-bold text-midnight-burgundy transition-all hover:bg-midnight-burgundy/5 active:scale-95"
              >
                <Home className="h-4 w-4" />
                Back to home
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-[28px] border border-luxury-gold/18 p-4 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-burgundy/8">
                <Headphones className="h-4 w-4 text-midnight-burgundy" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-on-surface">Need support?</p>
                <p className="text-[11px] text-on-surface-variant">
                  Call hotline <span className="font-bold text-midnight-burgundy">1900 1886</span> for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CancelFlight() {
  const navigate = useNavigate();
  const bookingLookup = useBookingStore((state) => state.bookingLookup);
  const setBookingLookup = useBookingStore((state) => state.setBookingLookup);
  const setManageOptions = useBookingStore((state) => state.setManageOptions);
  const setMockManageBookingMode = useBookingStore((state) => state.setMockManageBookingMode);
  const [step, setStep] = useState<CancelStep>(1);
  const [selectedFlightKeys, setSelectedFlightKeys] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<BookingCancellationPreviewResponse | null>(null);
  const [confirmedCancellation, setConfirmedCancellation] =
    useState<BookingCancellationConfirmResponse | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const autoBootstrappedRef = useRef(false);
  const autoResyncedRef = useRef(false);
  const previewRequestSeqRef = useRef(0);

  useEffect(() => {
    if (!bookingLookup) return;

    const normalizedPnr = bookingLookup.booking.pnrCode.trim().toUpperCase();
    const normalizedLastName = foldAsciiUpper(bookingLookup.passengers[0]?.lastName ?? '');

    if (normalizedPnr !== 'ABC123' || normalizedLastName !== 'NGUYEN') return;

    let variant: 'CONFIRMED' | 'PENDING_PAYMENT' | 'CHECKED_IN_LOCKED' | 'CANCELLED' = 'CONFIRMED';

    switch ((bookingLookup.booking.status ?? '').toUpperCase()) {
      case 'PENDING_PAYMENT':
        variant = 'PENDING_PAYMENT';
        break;
      case 'CHECKED_IN':
        variant = 'CHECKED_IN_LOCKED';
        break;
      case 'CANCELLED':
        variant = 'CANCELLED';
        break;
      default:
        variant = 'CONFIRMED';
        break;
    }

    setMockManageBookingMode(true);
    resetMockManageBookingVariant(variant);
  }, [bookingLookup, setMockManageBookingMode]);

  useEffect(() => {
    if (!bookingLookup || autoResyncedRef.current) return;

    const normalizedPnr = bookingLookup.booking.pnrCode.trim().toUpperCase();
    const normalizedLastName = foldAsciiUpper(bookingLookup.passengers[0]?.lastName ?? '');

    if (normalizedPnr !== 'ABC123' || normalizedLastName !== 'NGUYEN') return;

    autoResyncedRef.current = true;
    setBootstrapping(true);
    setSelectedFlightKeys(new Set());
    setPreview(null);
    setPreviewError(null);
    setConfirmError(null);
    setConfirmedCancellation(null);

    void (async () => {
      try {
        resetMockManageBookingVariant('CONFIRMED');
        const lookup = await bookingService.lookupBooking({
          pnrCode: 'ABC123',
          lastName: 'Nguyen',
        });
        setBookingLookup(lookup);
        const options = await bookingService.getManageOptions(lookup.booking.bookingId);
        setManageOptions(options);
      } catch {
        // Keep existing store state if the sample resync fails.
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [bookingLookup, setBookingLookup, setManageOptions]);

  useEffect(() => {
    if (bookingLookup || autoBootstrappedRef.current) return;
    autoBootstrappedRef.current = true;
    setBootstrapping(true);
    setErrorMessage(null);
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
        const message =
          error instanceof Error ? error.message : 'Unable to load the sample booking.';
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [bookingLookup, setBookingLookup, setManageOptions, setMockManageBookingMode]);

  const booking = useMemo(
    () => ({
      pnr: bookingLookup?.booking?.pnrCode ?? 'ABC123',
      status: bookingLookup?.booking?.statusLabel ?? 'Confirmed',
      bookingDate: bookingLookup?.booking?.createdAt
        ? formatDateLabel(bookingLookup.booking.createdAt)
        : '20/05/2026',
      totalPrice: bookingLookup?.booking
        ? `${bookingLookup.booking.totalAmount.toLocaleString('vi-VN')} ${bookingLookup.booking.currency}`
        : '2,270,000 VND',
    }),
    [bookingLookup?.booking]
  );

  const passengers = useMemo<CancelPassenger[]>(
    () =>
      bookingLookup?.passengers?.map((passenger) => ({
        id: String(passenger.passengerId),
        passengerId: passenger.passengerId,
        name: [passenger.lastName, passenger.firstName].filter(Boolean).join(' ').trim(),
        type: passenger.passengerType,
        dob: passenger.dateOfBirth,
        baggage: `${bookingLookup.itineraries[0]?.fareBenefits?.baggageCheckinKg ?? 0}kg`,
      })) ?? [],
    [bookingLookup?.itineraries, bookingLookup?.passengers]
  );

  const flights = useMemo<CancelFlightLeg[]>(
    () =>
      bookingLookup?.itineraries?.map((itinerary, index) => ({
        flightId: itinerary.flightId,
        label: index === 0 ? 'Outbound' : `Segment ${index + 1}`,
        date: formatDateLabel(itinerary.departureTime),
        time: formatTime(itinerary.departureTime),
        fromCode: itinerary.departureAirportCode,
        fromCity: itinerary.departureCity,
        fromTerminal: itinerary.departureTerminal ?? 'N/A',
        toCode: itinerary.arrivalAirportCode,
        toCity: itinerary.arrivalCity,
        toTerminal: itinerary.arrivalTerminal ?? 'N/A',
        flightNo: `${itinerary.flightNumber} ${itinerary.fareName}`,
        cabin: itinerary.cabinClass,
        arrivalTime: formatTime(itinerary.arrivalTime),
      })) ?? [],
    [bookingLookup?.itineraries]
  );

  const selectionPayload = useMemo(() => {
    const byPassenger = new Map<number, number[]>();
    for (const key of selectedFlightKeys) {
      const [passengerIdRaw, flightIdRaw] = key.split(':');
      const passengerId = Number(passengerIdRaw);
      const flightId = Number(flightIdRaw);
      if (!Number.isFinite(passengerId) || !Number.isFinite(flightId)) continue;
      const current = byPassenger.get(passengerId) ?? [];
      current.push(flightId);
      byPassenger.set(passengerId, current);
    }
    return {
      passengers: Array.from(byPassenger.entries()).map(([passengerId, flightIds]) => ({
        passengerId,
        flightIds,
      })),
    };
  }, [selectedFlightKeys]);

  useEffect(() => {
    if (!bookingLookup) return;
    if (selectionPayload.passengers.length === 0) {
      setPreview(null);
      setConfirmedCancellation(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setConfirmError(null);
      return;
    }

    const requestSeq = ++previewRequestSeqRef.current;
    setPreviewLoading(true);
    setPreviewError(null);

    void (async () => {
      try {
        const previewResponse = await bookingService.previewCancellationBySelection(
          bookingLookup.booking.bookingId,
          selectionPayload
        );
        if (requestSeq !== previewRequestSeqRef.current) return;
        setPreview(previewResponse);
        setConfirmedCancellation(null);
      } catch (error) {
        if (requestSeq !== previewRequestSeqRef.current) return;
        setPreview(null);
        const message =
          error instanceof Error ? error.message : 'Unable to preview the cancellation.';
        setPreviewError(message);
        toast.error(message);
      } finally {
        if (requestSeq === previewRequestSeqRef.current) {
          setPreviewLoading(false);
        }
      }
    })();
  }, [bookingLookup, selectionPayload]);

  function toggleFlightSelection(passengerId: number, flightId: number) {
    const key = selectionKey(passengerId, flightId);
    setSelectedFlightKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPreviewError(null);
    setConfirmError(null);
  }

  async function handleConfirmCancellation() {
    if (!bookingLookup || selectionPayload.passengers.length === 0) return;
    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const response = await bookingService.confirmCancellation(
        bookingLookup.booking.bookingId,
        selectionPayload
      );
      setConfirmedCancellation(response);
      setStep(3);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to confirm the cancellation.';
      setConfirmError(message);
      toast.error(message);
    } finally {
      setConfirmLoading(false);
    }
  }

  if (bootstrapping) {
    return (
      <div className="relative min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="glass-panel w-full rounded-2xl border border-surface-container-high p-8 text-center shadow-sm">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-on-surface-variant">Loading sample booking...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!bookingLookup || passengers.length === 0) {
    return (
      <div className="relative min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="glass-panel w-full rounded-2xl border border-surface-container-high p-8 text-center shadow-sm">
            <h1 className="font-headline text-2xl font-black text-on-surface">No booking data</h1>
            <p className="mt-3 text-sm text-on-surface-variant">
              Return to Manage Booking and find a booking before canceling.
            </p>
            <button
              type="button"
              onClick={() => navigate('/manage-booking?mockManageBooking=1')}
              className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              Back to Manage Booking
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="mx-auto min-h-svh w-full max-w-400 px-6 pb-16 pt-24 sm:pt-28 md:px-8">
        <div className="mb-8">
          <div className="mb-2 text-[0.72rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            Booking cancellation
          </div>
          <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <XCircle className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-black text-on-surface md:text-3xl">
            Cancel flight
          </h1>
        </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
            Keep the same cancellation content and confirmation flow, aligned to the shared Sovereign booking management style.
          </p>
        </div>

        <StepIndicator step={step} />

        {step === 1 ? (
          <Step1
            booking={booking}
            passengers={passengers}
            flights={flights}
            selectedFlightKeys={selectedFlightKeys}
            preview={preview}
            previewLoading={previewLoading}
            previewError={previewError}
            onToggleFlight={toggleFlightSelection}
            onBack={() => navigate('/manage-booking')}
            onNext={() => setStep(2)}
          />
        ) : null}
        {step === 2 && preview ? (
          <Step2
            booking={booking}
            preview={preview}
            flights={flights}
            confirmLoading={confirmLoading}
            confirmError={confirmError}
            onBack={() => setStep(1)}
            onConfirm={() => void handleConfirmCancellation()}
          />
        ) : null}
        {step === 3 && confirmedCancellation ? (
          <Step3
            booking={booking}
            preview={confirmedCancellation}
            flights={flights}
            bookingLookup={bookingLookup}
          />
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
