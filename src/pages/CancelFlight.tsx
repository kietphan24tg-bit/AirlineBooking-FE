import { AlertTriangle, ArrowRight, CheckCircle2, Home, Plane, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type CancelStep = 1 | 2 | 3;

interface MockPassenger {
  id: string;
  name: string;
  type: 'Người lớn' | 'Trẻ em';
  dob: string;
  baggage: string;
}

interface MockFlight {
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

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BOOKING = {
  pnr: 'ABC123',
  status: 'Đã xác nhận',
  bookingDate: '20/05/2024',
  totalPrice: '5,217,000',
};

const MOCK_PASSENGERS: MockPassenger[] = [
  { id: 'p1', name: 'NGUYEN VAN A', type: 'Người lớn', dob: '01/01/1990', baggage: '20kg' },
  { id: 'p2', name: 'TRAN THI B', type: 'Người lớn', dob: '18/02/1992', baggage: '10kg' },
  { id: 'p3', name: 'LE VAN C', type: 'Trẻ em', dob: '05/06/2016', baggage: '10kg' },
  { id: 'p4', name: 'PHAM THI D', type: 'Trẻ em', dob: '20/08/2019', baggage: '7kg' },
];

const MOCK_FLIGHTS_P1: MockFlight[] = [
  {
    label: 'Chuyến đi',
    date: '31/05/2024',
    time: '08:30',
    fromCode: 'SGN',
    fromCity: 'TP. Hồ Chí Minh',
    fromTerminal: 'Nhà ga T1',
    toCode: 'HAN',
    toCity: 'Hà Nội',
    toTerminal: 'Nhà ga T1',
    flightNo: 'VJ123 ECO',
    cabin: 'ECO',
    arrivalTime: '10:35',
  },
];

const MOCK_FLIGHTS_P2: MockFlight[] = [
  {
    label: 'Chuyến đi',
    date: '31/05/2024',
    time: '08:30',
    fromCode: 'SGN',
    fromCity: 'TP. Hồ Chí Minh',
    fromTerminal: 'Nhà ga T1',
    toCode: 'HAN',
    toCity: 'Hà Nội',
    toTerminal: 'Nhà ga T1',
    flightNo: 'VJ123 ECO',
    cabin: 'ECO',
    arrivalTime: '10:35',
  },
  {
    label: 'Chuyến về',
    date: '02/06/2024',
    time: '19:20',
    fromCode: 'HAN',
    fromCity: 'Hà Nội',
    fromTerminal: 'Nhà ga T1',
    toCode: 'SGN',
    toCity: 'TP. Hồ Chí Minh',
    toTerminal: 'Nhà ga T1',
    flightNo: 'VJ124 ECO',
    cabin: 'ECO',
    arrivalTime: '21:35',
  },
];

const REFUND = {
  ticketTotal: '4,750,000',
  taxFee: '217,000',
  cancelFee: '-950,000',
  totalRefund: '4,017,000',
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: CancelStep }) {
  const steps = [
    { num: 1, label: 'Chọn hành khách' },
    { num: 2, label: 'Xác nhận thông tin' },
    { num: 3, label: 'Kết quả' },
  ];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => {
        const active = step === s.num;
        const done = step > s.num;
        return (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all
                  ${active ? 'bg-primary text-white' : done ? 'bg-green-500 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}
              >
                {done ? '✓' : s.num}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap
                  ${active ? 'text-primary' : done ? 'text-green-600' : 'text-on-surface-variant'}`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px flex-1 mx-3 ${step > s.num ? 'bg-green-400' : 'bg-surface-container-high'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Flight Row ───────────────────────────────────────────────────────────────

function FlightRow({ flight }: { flight: MockFlight }) {
  return (
    <div className="flex items-stretch gap-0 mt-3 rounded-xl border border-surface-container-high overflow-hidden">
      {/* Label + date */}
      <div className="flex flex-col items-center justify-center bg-primary/10 px-3 py-3 min-w-[90px] text-center">
        <span className="text-[10px] font-black uppercase text-primary">{flight.label}</span>
        <span className="text-[10px] text-on-surface-variant mt-1">{flight.date}</span>
      </div>
      {/* Route */}
      <div className="flex flex-1 items-center justify-between px-4 py-3 gap-2">
        {/* Departure */}
        <div className="text-left">
          <p className="text-sm font-black text-on-surface">{flight.time}</p>
          <p className="text-base font-black text-on-surface">{flight.fromCode}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.fromCity}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.fromTerminal}</p>
        </div>
        {/* Middle arrow */}
        <div className="flex flex-col items-center gap-1 flex-1 px-2">
          <p className="text-[10px] text-on-surface-variant">{flight.flightNo}</p>
          <div className="flex w-full items-center gap-1">
            <div className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
            <Plane className="h-4 w-4 text-primary" />
            <div className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
          </div>
        </div>
        {/* Arrival */}
        <div className="text-right">
          <p className="text-sm font-black text-on-surface">{flight.arrivalTime}</p>
          <p className="text-base font-black text-on-surface">{flight.toCode}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.toCity}</p>
          <p className="text-[10px] text-on-surface-variant">{flight.toTerminal}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Select Passengers ────────────────────────────────────────────────

function Step1({
  selected,
  onToggle,
  onBack,
  onNext,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Booking summary card */}
      <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Mã đặt chỗ (PNR)
            </p>
            <p className="mt-1 text-lg font-black text-on-surface">{MOCK_BOOKING.pnr}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Trạng thái
            </p>
            <p className="mt-1 text-sm font-bold text-green-600">{MOCK_BOOKING.status}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Ngày đặt
            </p>
            <p className="mt-1 text-sm font-bold text-on-surface">{MOCK_BOOKING.bookingDate}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Tổng tiền
            </p>
            <p className="mt-1 text-sm font-black text-primary">{MOCK_BOOKING.totalPrice} VND</p>
            <button className="text-[11px] text-primary underline mt-0.5">
              Chi tiết thanh toán ▾
            </button>
          </div>
        </div>
      </div>

      {/* Passenger selection card */}
      <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
        <p className="text-base font-bold text-on-surface mb-1">Chọn hành khách muốn hủy</p>

        {/* Warning note */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800">
            <strong>Lưu ý:</strong> Nếu hủy 1 phần hành khách, những hành khách còn lại trong đặt
            chỗ sẽ được giữ nguyên.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {MOCK_PASSENGERS.map((p, idx) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                id={`cancel-passenger-${p.id}`}
                onClick={() => onToggle(p.id)}
                className={`group flex w-full cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 transition-all hover:border-primary/40 hover:bg-primary/5
                  ${isSelected ? 'border-primary/30 bg-primary/5' : 'border-surface-container-high bg-white'}`}
              >
                {/* Checkbox */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all
                    ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Number badge */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-black text-on-surface-variant">
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-row items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface">{p.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {p.type} | {p.dob}
                    </p>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Hành lý: {p.baggage}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            id="cancel-step1-back"
            onClick={onBack}
            className="rounded-xl border border-surface-container-high bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-low active:scale-95"
          >
            Quay lại
          </button>
          <button
            id="cancel-step1-next"
            disabled={selected.size === 0}
            onClick={onNext}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Confirm Cancellation ─────────────────────────────────────────────

function Step2({
  selected,
  onBack,
  onConfirm,
}: {
  selected: Set<string>;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const cancelledPassengers = MOCK_PASSENGERS.filter((p) => selected.has(p.id));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      {/* Left: Cancellation detail */}
      <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm">
        <p className="text-base font-bold text-on-surface mb-4">Thông tin hủy chuyến</p>

        <div className="space-y-2 mb-5">
          <div className="flex justify-between">
            <span className="text-sm text-on-surface-variant">Mã đặt chỗ (PNR)</span>
            <span className="text-sm font-black text-primary">{MOCK_BOOKING.pnr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-on-surface-variant">Hành khách hủy</span>
            <span className="text-sm font-bold text-on-surface">
              {cancelledPassengers.length} người
            </span>
          </div>
          <div className="text-sm text-on-surface-variant pl-0">
            {cancelledPassengers.map((p, i) => (
              <p key={p.id} className="text-sm text-on-surface ml-2">
                {i + 1}. {p.name}
              </p>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-container-high pt-4">
          <p className="text-sm font-bold text-on-surface mb-3">Chuyến bay hủy</p>

          {/* Passenger 1 flights */}
          {selected.has('p1') && (
            <div className="mb-4">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">
                1. NGUYEN VAN A — {MOCK_FLIGHTS_P1.length} chặng
              </p>
              {MOCK_FLIGHTS_P1.map((f, i) => (
                <FlightRow key={i} flight={f} />
              ))}
            </div>
          )}

          {/* Passenger 2 flights */}
          {selected.has('p2') && (
            <div className="mb-4">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">
                2. TRAN THI B — {MOCK_FLIGHTS_P2.length} chặng
              </p>
              {MOCK_FLIGHTS_P2.map((f, i) => (
                <FlightRow key={i} flight={f} />
              ))}
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="mt-5">
          <button
            id="cancel-step2-back"
            onClick={onBack}
            className="rounded-xl border border-surface-container-high bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-low active:scale-95"
          >
            Quay lại
          </button>
        </div>
      </div>

      {/* Right sidebar: Summary */}
      <div className="glass-panel rounded-2xl border border-surface-container-high p-5 shadow-sm self-start">
        <p className="text-base font-bold text-on-surface mb-4">Tóm tắt hủy chuyến</p>

        {/* Cancelled passengers */}
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">
            Hành khách hủy ({cancelledPassengers.length})
          </p>
          {cancelledPassengers.map((p, i) => (
            <p key={p.id} className="text-sm text-on-surface">
              • {i + 1}. {p.name}
            </p>
          ))}
        </div>

        <div className="border-t border-surface-container-high my-3" />

        {/* Cancelled flights summary */}
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">
            Chuyến bay hủy
          </p>
          {selected.has('p1') && (
            <p className="text-[12px] text-on-surface">
              • NGUYEN VAN A: {MOCK_FLIGHTS_P1.length} chặng
            </p>
          )}
          {selected.has('p2') && (
            <p className="text-[12px] text-on-surface">
              • TRAN THI B: {MOCK_FLIGHTS_P2.length} chặng
            </p>
          )}
        </div>

        <div className="border-t border-surface-container-high my-3" />

        {/* Refund details */}
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-2">
            Chi tiết hoàn tiền dự kiến
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Tổng tiền vé</span>
              <span className="text-on-surface">{REFUND.ticketTotal} VND</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Thuế, phí</span>
              <span className="text-on-surface">{REFUND.taxFee} VND</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Phí hủy</span>
              <span className="text-red-500">{REFUND.cancelFee} VND</span>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-surface-container-high my-3" />

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-on-surface">Tổng tiền hoàn</span>
          <span className="text-lg font-black text-primary">{REFUND.totalRefund} VND</span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-4">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800">
            Số tiền hoàn thực tế có thể thay đổi tùy theo quy định giá vé và thời điểm hủy.
          </p>
        </div>

        {/* Confirm button */}
        <button
          id="cancel-step2-confirm"
          onClick={onConfirm}
          className="w-full rounded-xl bg-primary py-3 text-sm font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
        >
          Xác nhận hủy
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Result ───────────────────────────────────────────────────────────

function Step3({ selected }: { selected: Set<string> }) {
  const navigate = useNavigate();
  const cancelledPassengers = MOCK_PASSENGERS.filter((p) => selected.has(p.id));

  return (
    <div className="glass-panel rounded-2xl border border-surface-container-high p-8 shadow-sm text-center">
      {/* Success icon */}
      <div className="flex justify-center mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
      </div>

      <h2 className="text-xl font-black text-on-surface mb-1">Hủy chuyến bay thành công!</h2>
      <p className="text-sm text-on-surface-variant mb-8">
        Chúng tôi đã gửi thông tin hủy chuyến đến email của bạn.
      </p>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-5 text-left mb-8 max-w-lg mx-auto">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Mã đặt chỗ (PNR)
          </p>
          <p className="text-lg font-black text-on-surface">{MOCK_BOOKING.pnr}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Tổng tiền hoàn
          </p>
          <p className="text-lg font-black text-primary">{REFUND.totalRefund} VND</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Hành khách hủy
          </p>
          {cancelledPassengers.map((p, i) => (
            <p key={p.id} className="text-sm text-on-surface">
              {i + 1}. {p.name}
            </p>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Thời gian hoàn tiền dự kiến
          </p>
          <p className="text-sm text-on-surface">Trong vòng 7 – 30 ngày làm việc</p>
        </div>
      </div>

      <button
        id="cancel-go-home"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-3 text-sm font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
      >
        <Home className="h-4 w-4" />
        Về trang chủ
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CancelFlight() {
  const navigate = useNavigate();
  const [step, setStep] = useState<CancelStep>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function togglePassenger(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="mx-auto max-w-5xl min-h-svh px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <XCircle className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-black text-on-surface md:text-3xl">
            Hủy chuyến bay
          </h1>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* Step content */}
        {step === 1 && (
          <Step1
            selected={selected}
            onToggle={togglePassenger}
            onBack={() => navigate('/manage-booking')}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2 selected={selected} onBack={() => setStep(1)} onConfirm={() => setStep(3)} />
        )}
        {step === 3 && <Step3 selected={selected} />}
      </main>

      <SiteFooter />
    </div>
  );
}
