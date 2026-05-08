import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Home,
  Plane,
  ShieldCheck,
  SquareCheckBig,
  Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MockPassenger {
  id: string;
  name: string;
  type: 'Người lớn' | 'Trẻ em' | 'Em bé';
  dob: string;
  seat: string;
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_FLIGHT = {
  flightNumber: 'VJ123',
  aircraft: 'AIRBUS A321 · Bay thẳng',
  departureTime: '08:30',
  departureCode: 'SGN',
  departureCity: 'TP. Hồ Chí Minh',
  departureAirport: 'Tân Sơn Nhất',
  arrivalTime: '10:05',
  arrivalCode: 'HAN',
  arrivalCity: 'Hà Nội',
  arrivalAirport: 'Nội Bài',
  duration: '1h 35m',
  dateLabel: 'Thứ 3, 28/05/2024',
  cabin: 'Eco Economy',
  checkinAvailable: true,
  checkinOpen: '00:00 · 26/05/2024',
  checkinClose: '07:30 · 28/05/2024',
};

const MOCK_BOOKING = {
  pnr: 'ABC123',
  lastName: 'NGUYỄN',
  totalPassengers: 3,
};

const MOCK_PASSENGERS: MockPassenger[] = [
  { id: 'p1', name: 'NGUYỄN VĂN A', type: 'Người lớn', dob: '01/01/1990', seat: '10A' },
  { id: 'p2', name: 'TRẦN THỊ B', type: 'Người lớn', dob: '15/05/1992', seat: '10B' },
  { id: 'p3', name: 'NGUYỄN BẢO C', type: 'Trẻ em', dob: '10/10/2015', seat: '10C' },
];

const NOTES = [
  {
    icon: Clock,
    text: 'Quầy làm thủ tục tại sân bay sẽ đóng 40 phút trước giờ khởi hành.',
  },
  {
    icon: ShieldCheck,
    text: 'Hành khách đã check-in trực tuyến vẫn cần đến cửa an ninh theo giờ quy định.',
  },
  {
    icon: Briefcase,
    text: 'Bạn chỉ được mang 01 kiện hành lý xách tay (7kg) và 01 phụ kiện nhỏ.',
  },
];

const BENEFITS = [
  {
    icon: Ticket,
    title: 'Tiết kiệm thời gian',
    desc: 'Không cần xếp hàng chờ làm thủ tục tại sân bay',
  },
  {
    icon: ClipboardList,
    title: 'Chọn ghế ngồi yêu thích',
    desc: 'Miễn phí hoặc trả phí tùy theo loại vé',
  },
  {
    icon: ArrowRight,
    title: 'Chủ động hơn',
    desc: 'Bạn có thể check-in mọi lúc, mọi nơi',
  },
  {
    icon: Plane,
    title: 'Thẻ lên máy bay',
    desc: 'Nhận thẻ lên máy bay để đi thẳng ra cửa lên máy bay',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlightInfoCard() {
  return (
    <div className="glass-panel mb-4 rounded-2xl border border-surface-container-high p-5 shadow-sm">
      <p className="mb-4 text-base font-bold text-on-surface">Thông tin chuyến bay</p>
      <div className="flex flex-wrap items-center gap-4">
        {/* Flight number & aircraft */}
        <div className="min-w-24">
          <p className="text-lg font-black text-on-surface">{MOCK_FLIGHT.flightNumber}</p>
          <p className="text-[11px] text-on-surface-variant">{MOCK_FLIGHT.aircraft}</p>
        </div>

        {/* Divider */}
        <div className="hidden h-10 w-px bg-surface-container-high sm:block" />

        {/* Route */}
        <div className="flex flex-1 items-center gap-2">
          {/* Departure */}
          <div className="text-left">
            <p className="text-2xl font-black text-on-surface">{MOCK_FLIGHT.departureTime}</p>
            <p className="text-sm font-bold text-on-surface">{MOCK_FLIGHT.departureCode}</p>
            <p className="text-[11px] text-on-surface-variant">{MOCK_FLIGHT.departureCity}</p>
          </div>

          {/* Duration arrow */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center gap-1">
              <div className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
              <Plane className="h-4 w-4 rotate-0 text-primary" />
              <div className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
            </div>
            <p className="text-[11px] text-on-surface-variant">{MOCK_FLIGHT.duration}</p>
          </div>

          {/* Arrival */}
          <div className="text-right">
            <p className="text-2xl font-black text-on-surface">{MOCK_FLIGHT.arrivalTime}</p>
            <p className="text-sm font-bold text-on-surface">{MOCK_FLIGHT.arrivalCode}</p>
            <p className="text-[11px] text-on-surface-variant">{MOCK_FLIGHT.arrivalCity}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-10 w-px bg-surface-container-high sm:block" />

        {/* Date & Cabin */}
        <div className="text-right">
          <p className="text-sm font-semibold text-on-surface">{MOCK_FLIGHT.dateLabel}</p>
          <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {MOCK_FLIGHT.cabin}
          </p>
        </div>
      </div>
    </div>
  );
}

function PassengerList({
  passengers,
  selected,
  onToggle,
  onCheckin,
  onBack,
}: {
  passengers: MockPassenger[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onCheckin: () => void;
  onBack: () => void;
}) {
  return (
    <div className="glass-panel mb-4 rounded-2xl border border-surface-container-high p-5 shadow-sm">
      <p className="text-base font-bold text-on-surface">Danh sách hành khách</p>
      <p className="mb-4 text-[12px] text-on-surface-variant">Chọn hành khách làm thủ tục</p>

      <div className="flex flex-col gap-3">
        {passengers.map((p, idx) => {
          const isSelected = selected.has(p.id);
          return (
            <button
              key={p.id}
              id={`passenger-item-${p.id}`}
              onClick={() => onToggle(p.id)}
              className={`group flex w-full cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 transition-all hover:border-primary/40 hover:bg-primary/5
                ${isSelected ? 'border-primary/30 bg-primary/5' : 'border-surface-container-high bg-white'}
              `}
            >
              {/* Checkbox */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all
                  ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}
                `}
              >
                {isSelected && (
                  <svg
                    className="h-3.5 w-3.5 text-white"
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-sm font-bold text-on-surface-variant">
                {idx + 1}
              </div>

              {/* Passenger info */}
              <div className="flex-1 flex flex-row justify-between items-center">
                <p className="text-sm font-bold text-on-surface">{p.name}</p>
                <div className="flex flex-row justify-end items-center w-100 gap-20">
                  <p className="text-[11px] text-on-surface-variant">{p.type}</p>
                  <p className="text-[11px] text-on-surface-variant">Ngày sinh: {p.dob}</p>
                  <p className="text-[11px] text-on-surface-variant">Ghế: {p.seat}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          id="checkin-back-btn"
          onClick={onBack}
          className="rounded-xl border border-surface-container-high bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-low active:scale-95"
        >
          Quay lại
        </button>
        <button
          id="checkin-continue-btn"
          disabled={selected.size === 0}
          onClick={onCheckin}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check-in ngay
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CheckinStatusSidebar() {
  return (
    <div className="flex flex-col gap-4">
      {/* Check-in availability card */}
      <div className="glass-panel rounded-2xl border border-surface-container-high p-4 shadow-sm">
        <div className="mb-3 flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <p className="text-sm font-bold text-green-600">Check-in khả dụng</p>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-[11px] text-on-surface-variant">Thời gian check-in</p>
          <p className="text-lg font-black text-primary">{MOCK_FLIGHT.checkinOpen}</p>
          <p className="text-[11px] text-on-surface-variant">đến</p>
          <p className="text-lg font-black text-primary">{MOCK_FLIGHT.checkinClose}</p>
        </div>
      </div>

      {/* Booking info */}
      <div className="glass-panel rounded-2xl border border-surface-container-high p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-on-surface">Thông tin đặt chỗ</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">Mã đặt chỗ (PNR)</span>
            <span className="text-sm font-black text-primary">{MOCK_BOOKING.pnr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">Họ</span>
            <span className="text-sm font-bold text-on-surface">{MOCK_BOOKING.lastName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">Tổng số hành khách</span>
            <span className="text-sm font-bold text-on-surface">
              {MOCK_BOOKING.totalPassengers}
            </span>
          </div>
        </div>
        <button
          id="booking-detail-btn"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-surface-container-high py-2 text-[12px] font-semibold text-on-surface transition-all hover:bg-surface-low active:scale-95"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Chi tiết đặt chỗ
        </button>
      </div>
    </div>
  );
}

function BenefitsBar() {
  return (
    <div>
      {/* Notes */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-bold text-amber-800">Lưu ý</p>
        </div>
        <div>
          {NOTES.map((note, i) => (
            <div key={i} className="flex items-start gap-2">
              <note.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-[15px] leading-snug text-amber-800">{note.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        {BENEFITS.map((b, i) => (
          <div
            key={i}
            className="glass-panel flex items-start gap-3 rounded-2xl border border-surface-container-high p-4 shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <b.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface">{b.title}</p>
              <p className="text-[11px] leading-snug text-on-surface-variant">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Checkin Success Screen ───────────────────────────────────────────────────

function CheckinSuccess({ checkedIn }: { checkedIn: MockPassenger[] }) {
  const navigate = useNavigate();
  return (
    <div className="glass-panel rounded-2xl border border-surface-container-high p-8 shadow-sm text-center animate-moving-up">
      {/* Success icon */}
      <div className="flex justify-center mb-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-on-surface mb-1">Check-in thành công!</h2>
      <p className="text-sm text-on-surface-variant mb-8">
        Thẻ lên máy bay của bạn đã sẵn sàng. Chúc bạn có chuyến bay tuyệt vời!
      </p>

      {/* Boarding pass summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left max-w-2xl mx-auto">
        {checkedIn.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-surface-container-high bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">
                ✓ Đã check-in
              </span>
            </div>
            <p className="text-sm font-black text-on-surface mb-1">{p.name}</p>
            <p className="text-[11px] text-on-surface-variant mb-3">
              {p.type} · Ngày sinh: {p.dob}
            </p>
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] text-on-surface-variant">Chuyến bay</p>
                <p className="text-sm font-black text-on-surface">{MOCK_FLIGHT.flightNumber}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-on-surface-variant">Khởi hành</p>
                <p className="text-sm font-black text-on-surface">{MOCK_FLIGHT.departureTime}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-on-surface-variant">Ghế</p>
                <p className="text-sm font-black text-primary">{p.seat}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-on-surface-variant border-t border-dashed border-surface-container-high pt-3">
              <span>
                {MOCK_FLIGHT.departureCode} → {MOCK_FLIGHT.arrivalCode}
              </span>
              <span>{MOCK_FLIGHT.dateLabel}</span>
              <span>{MOCK_FLIGHT.cabin}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Flight info strip */}
      <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-surface-container-high bg-surface-low px-6 py-4 mb-8 max-w-2xl mx-auto">
        <div className="text-center">
          <p className="text-[10px] text-on-surface-variant">Số hiệu</p>
          <p className="text-base font-black text-on-surface">{MOCK_FLIGHT.flightNumber}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-on-surface-variant">Khởi hành</p>
          <p className="text-base font-black text-on-surface">
            {MOCK_FLIGHT.departureCode} {MOCK_FLIGHT.departureTime}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-on-surface-variant">Đến</p>
          <p className="text-base font-black text-on-surface">
            {MOCK_FLIGHT.arrivalCode} {MOCK_FLIGHT.arrivalTime}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-on-surface-variant">Ngày</p>
          <p className="text-base font-black text-on-surface">{MOCK_FLIGHT.dateLabel}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-on-surface-variant">Hạng</p>
          <p className="text-base font-black text-on-surface">{MOCK_FLIGHT.cabin}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          id="checkin-download-boarding"
          className="flex items-center gap-2 rounded-xl border border-surface-container-high bg-white px-6 py-3 text-sm font-bold text-on-surface transition-all hover:bg-surface-low active:scale-95"
        >
          <Download className="h-4 w-4" />
          Tải thẻ lên máy bay
        </button>
        <button
          id="checkin-go-home"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
        >
          <Home className="h-4 w-4" />
          Về trang chủ
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Checkin() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set(MOCK_PASSENGERS.map((p) => p.id)));
  const [success, setSuccess] = useState(false);

  function togglePassenger(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const checkedInPassengers = MOCK_PASSENGERS.filter((p) => selected.has(p.id));

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-7xl min-h-svh px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <SquareCheckBig className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-black text-on-surface md:text-3xl">
            Check-in trực tuyến
          </h1>
        </div>
        {success ? (
          <CheckinSuccess checkedIn={checkedInPassengers} />
        ) : (
          <>
            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
              {/* Left column */}
              <div>
                <FlightInfoCard />
                <PassengerList
                  passengers={MOCK_PASSENGERS}
                  selected={selected}
                  onToggle={togglePassenger}
                  onCheckin={() => setSuccess(true)}
                  onBack={() => navigate(-1)}
                />
              </div>

              {/* Right sidebar */}
              <div>
                <CheckinStatusSidebar />
              </div>
            </div>

            {/* Benefits bar */}
            <BenefitsBar />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
