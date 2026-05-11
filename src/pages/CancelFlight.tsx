import { AlertTriangle, ArrowRight, CheckCircle2, Home, LoaderCircle, Plane, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    ADULT: 'Người lớn',
    CHILD: 'Trẻ em',
    INFANT: 'Em bé',
  };
  return map[type] ?? type;
}

function StepIndicator({ step }: { step: CancelStep }) {
  const steps = [
    { num: 1, label: 'Chọn chuyến bay' },
    { num: 2, label: 'Xác nhận thông tin' },
    { num: 3, label: 'Kết quả' },
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
                      ? 'bg-green-500 text-white'
                      : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {done ? '✓' : item.num}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${
                  active
                    ? 'text-primary'
                    : done
                      ? 'text-green-600'
                      : 'text-on-surface-variant'
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-3 h-px flex-1 ${
                  step > item.num ? 'bg-green-400' : 'bg-surface-container-high'
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
      className={`mt-3 flex items-stretch gap-0 overflow-hidden rounded-xl border transition-all ${
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-surface-container-high bg-white'
      }`}
    >
      <div className="flex min-w-[90px] flex-col items-center justify-center bg-primary/10 px-3 py-3 text-center">
        <span className="text-[10px] font-black uppercase text-primary">{flight.label}</span>
        <span className="mt-1 text-[10px] text-on-surface-variant">{flight.date}</span>
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 px-4 py-3">
        {selectable ? (
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
              selected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
            }`}
          >
            {selected ? (
              <svg
                className="h-3 w-3 text-white"
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
          <p className="text-sm font-black text-on-surface">{flight.time}</p>
          <p className="text-base font-black text-on-surface">{flight.fromCode}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.fromCity}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.fromTerminal}</p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 px-2">
          <p className="text-[10px] text-on-surface-variant">{flight.flightNo}</p>
          <div className="flex w-full items-center gap-1">
            <div className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
            <Plane className="h-4 w-4 text-primary" />
            <div className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
          </div>
          <p className="text-[10px] font-semibold uppercase text-on-surface-variant">{flight.cabin}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-on-surface">{flight.arrivalTime}</p>
          <p className="text-base font-black text-on-surface">{flight.toCode}</p>
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
      className="w-full text-left transition-transform hover:scale-[1.005] active:scale-[0.995]"
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
      <p className="mb-4 text-base font-bold text-on-surface">Tóm tắt hủy chuyến</p>

      {selectedCount === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-container-high px-4 py-5 text-sm text-on-surface-variant">
          Chọn ít nhất một chuyến bay của hành khách để xem preview hoàn tiền.
        </div>
      ) : null}

      {selectedCount > 0 && previewLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-surface-container-high bg-surface-low px-4 py-5 text-sm text-on-surface-variant">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
          Đang cập nhật preview...
        </div>
      ) : null}

      {previewError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {previewError}
        </div>
      ) : null}

      {confirmError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {confirmError}
        </div>
      ) : null}

      {preview ? (
        <>
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Hành khách hủy ({preview.items.length})
            </p>
            {preview.items.map((item, index) => (
              <p key={`${item.passengerId}-${index}`} className="text-sm text-on-surface">
                {index + 1}. {item.passengerName}
              </p>
            ))}
          </div>

          <div className="my-3 border-t border-surface-container-high" />

          <div className="mb-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Chuyến bay hủy
            </p>
            {preview.items.map((item) => (
              <div key={`${item.passengerId}-${item.flightIds.join('-')}`} className="mb-2">
                <p className="text-[12px] font-semibold text-on-surface">{item.passengerName}</p>
                {item.flightIds.map((flightId) => {
                  const flight = flightsById.get(flightId);
                  if (!flight) return null;
                  return (
                    <p key={`${item.passengerId}-${flightId}`} className="text-[12px] text-on-surface-variant">
                      {flight.label}: {flight.fromCode} - {flight.toCode} ({flight.flightNo})
                    </p>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-surface-container-high" />

          <div className="mb-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Hoàn tiền dự kiến
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tổng tiền vé</span>
                <span className="text-on-surface">
                  {formatMoney(preview.summary.fareGross, preview.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Hoàn ghế</span>
                <span className="text-on-surface">
                  {formatMoney(preview.summary.seatRefund, preview.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Hoàn dịch vụ</span>
                <span className="text-on-surface">
                  {formatMoney(preview.summary.serviceRefund, preview.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Phí hủy</span>
                <span className="text-red-500">
                  -{formatMoney(preview.summary.refundFee, preview.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="my-3 border-t-2 border-surface-container-high" />

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface">Tổng tiền hoàn</span>
            <span className="text-lg font-black text-primary">
              {formatMoney(preview.summary.netRefund, preview.currency)}
            </span>
          </div>

          {showConfirmAction ? (
            <>
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-[10px] text-amber-800">
                  Preview đã được lấy thành công. Bấm xác nhận để gửi yêu cầu hủy thật.
                </p>
              </div>

              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Xác nhận hủy
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
  const flightsById = useMemo(() => new Map(flights.map((flight) => [flight.flightId, flight])), [flights]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Mã đặt chỗ (PNR)
              </p>
              <p className="mt-1 text-lg font-black text-on-surface">{booking.pnr}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Trạng thái
              </p>
              <p className="mt-1 text-sm font-bold text-green-600">{booking.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Ngày đặt
              </p>
              <p className="mt-1 text-sm font-bold text-on-surface">{booking.bookingDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Tổng tiền
              </p>
              <p className="mt-1 text-sm font-black text-primary">{booking.totalPrice}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
          <p className="mb-1 text-base font-bold text-on-surface">
            Chọn chuyến bay muốn hủy theo từng hành khách
          </p>
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-[12px] text-amber-800">
              Mọi thay đổi sẽ gọi preview để cập nhật ngay tổng tiền hoàn bên phải.
            </p>
          </div>

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
                      {passengerTypeVi(passenger.type)} | {passenger.dob} | Hành lý: {passenger.baggage}
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
              Quay lại
            </button>
            <button
              type="button"
              disabled={!preview || previewLoading}
              onClick={onNext}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {previewLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Tiếp tục
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
  const flightsById = useMemo(() => new Map(flights.map((flight) => [flight.flightId, flight])), [flights]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
        <p className="mb-4 text-base font-bold text-on-surface">Thông tin hủy chuyến</p>

        <div className="mb-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-on-surface-variant">PNR</span>
            <span className="text-sm font-black text-primary">{booking.pnr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-on-surface-variant">Hành khách hủy</span>
            <span className="text-sm font-bold text-on-surface">{preview.items.length} người</span>
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
          <p className="mb-3 text-sm font-bold text-on-surface">Chuyến bay hủy</p>
          {preview.items.map((item, index) => (
            <div key={`${item.passengerId}-${item.flightIds.join('-')}`} className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                {index + 1}. {item.passengerName} - {item.flightIds.length} chặng
              </p>
              {item.flightIds.map((flightId) => {
                const flight = flightsById.get(flightId);
                if (!flight) return null;
                return (
                  <FlightRow
                    key={`${item.passengerId}-${flightId}`}
                    flight={flight}
                  />
                );
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
            Quay lại
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
}: {
  booking: { pnr: string };
  preview: BookingCancellationPreviewResponse;
}) {
  const navigate = useNavigate();

  return (
    <div className="glass-panel rounded-2xl border border-surface-container-high p-8 text-center shadow-sm">
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
      </div>

      <h2 className="mb-1 text-xl font-black text-on-surface">Hủy chuyến bay thành công!</h2>
      <p className="mb-8 text-sm text-on-surface-variant">
        Đây vẫn là kết quả mock UI. Preview đã nối, nhưng submit hủy thật chưa được nối.
      </p>

      <div className="mx-auto mb-8 grid max-w-lg grid-cols-2 gap-5 text-left">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            PNR
          </p>
          <p className="text-lg font-black text-on-surface">{booking.pnr}</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Tổng tiền hoàn
          </p>
          <p className="text-lg font-black text-primary">
            {formatMoney(preview.summary.netRefund, preview.currency)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Hành khách hủy
          </p>
          {preview.items.map((item, index) => (
            <p key={`${item.passengerId}-${index}`} className="text-sm text-on-surface">
              {index + 1}. {item.passengerName}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Thời gian hoàn tiền
          </p>
          <p className="text-sm text-on-surface">Trong vòng 7 - 30 ngày làm việc</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-3 text-sm font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
      >
        <Home className="h-4 w-4" />
        Về trang chủ
      </button>
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
  const previewRequestSeqRef = useRef(0);

  useEffect(() => {
    if (!bookingLookup) return;

    const normalizedPnr = bookingLookup.booking.pnrCode.trim().toUpperCase();
    const normalizedLastName = foldAsciiUpper(bookingLookup.passengers[0]?.lastName ?? '');

    if (normalizedPnr !== 'ABC123' || normalizedLastName !== 'NGUYEN') return;

    let variant: 'CONFIRMED' | 'PENDING_PAYMENT' | 'CHECKED_IN_LOCKED' | 'CANCELLED' =
      'CONFIRMED';

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
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải mock booking.');
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [bookingLookup, setBookingLookup, setManageOptions, setMockManageBookingMode]);

  const booking = useMemo(
    () => ({
      pnr: bookingLookup?.booking?.pnrCode ?? 'ABC123',
      status: bookingLookup?.booking?.statusLabel ?? 'Đã xác nhận',
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
        label: index === 0 ? 'Chuyến đi' : `Chặng ${index + 1}`,
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
        setPreviewError(error instanceof Error ? error.message : 'Không thể preview hủy chuyến.');
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
      setConfirmError(error instanceof Error ? error.message : 'Không thể xác nhận hủy chuyến.');
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
            <p className="mt-4 text-sm text-on-surface-variant">Đang tải mock booking...</p>
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
            <h1 className="font-headline text-2xl font-black text-on-surface">
              Chưa có dữ liệu booking
            </h1>
            <p className="mt-3 text-sm text-on-surface-variant">
              {errorMessage ?? 'Quay lại trang quản lý đặt chỗ và tìm booking trước khi hủy.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/manage-booking?mockManageBooking=1')}
              className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              Về quản lý đặt chỗ
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
      <main className="mx-auto min-h-svh max-w-5xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <XCircle className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-black text-on-surface md:text-3xl">
            Hủy chuyến bay
          </h1>
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
          <Step3 booking={booking} preview={confirmedCancellation} />
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
