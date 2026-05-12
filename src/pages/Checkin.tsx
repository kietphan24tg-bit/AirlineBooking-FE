import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Armchair,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Headphones,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Plane,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AircraftSeatsMap, { type SeatSelectionValue } from '../components/booking/AircraftSeatsMap';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import { bookingService } from '../services/booking.service';
import { flightService } from '../services/flight.service';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  BookingLookupResponse,
  BookingManageOptionsResponse,
  CheckInConfirmResponse,
  CheckInContinueRequest,
} from '../types/booking.types';

type FlightWindowStatus = 'OPEN' | 'NOT_OPEN' | 'CLOSED';
type SegmentStatus = 'READY' | 'SEAT_SELECTION_REQUIRED' | 'BLOCKED';

interface DerivedPassengerSegment {
  flightId: string;
  eligible: boolean;
  checkInStatus: string;
  seatAssigned: boolean;
  seatNumber: string | null;
  warnings: string[];
}

interface DerivedPassenger {
  id: string;
  name: string;
  type: string;
  dob: string;
  segments: Record<string, DerivedPassengerSegment>;
}

interface DerivedFlight {
  id: string;
  numericId: number;
  flightNumber: string;
  departureCode: string;
  departureCity: string;
  departureTime: string;
  departureTerminal: string | null;
  arrivalCode: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalTerminal: string | null;
  dateLabel: string;
  shortDate: string;
  durationLabel: string;
  cabin: string;
  baggageHandKg: number | null;
  segmentLabel: string;
  journeyType: string;
  segmentStatus: SegmentStatus;
  checkInWindow: {
    status: FlightWindowStatus;
    opensAt: string;
    closesAt: string;
    message: string;
  };
}

interface CheckinNavigationState {
  bookingId?: number;
  pnrCode?: string;
  lastName?: string;
  expiresAt?: string | null;
}

interface BookingDetailFlightItem {
  id: string;
  segmentLabel: string;
  dateLabel: string;
  departureCode: string;
  arrivalCode: string;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  cabinLabel: string;
  statusLabel: string;
}

interface BookingDetailPassengerItem {
  id: string;
  orderLabel: string;
  name: string;
  statusLabel: string;
  seatLabels: string[];
  serviceLabels: string[];
}

interface BookingDetailModalData {
  pnr: string;
  statusLabel: string;
  totalPassengers: number;
  totalAmountLabel: string;
  contactLabel: string;
  flights: BookingDetailFlightItem[];
  passengers: BookingDetailPassengerItem[];
}

interface CheckinConfirmationServiceGroup {
  key: 'baggage' | 'meal' | 'insurance' | 'other';
  label: string;
  items: string[];
}

interface CheckinConfirmationPassengerItem {
  id: string;
  name: string;
  typeLabel: string;
  statusLabel: string;
  seatLabels: string[];
  handBaggageLabels: string[];
  serviceGroups: CheckinConfirmationServiceGroup[];
}

interface CheckinConfirmationData {
  flights: DerivedFlight[];
  passengers: CheckinConfirmationPassengerItem[];
}

interface CheckinBookingSummary {
  pnr: string;
  lastName: string;
  totalPassengers: number;
  expiresAt: string | null;
}

interface SeatConfirmModalProps {
  open: boolean;
  seat: SeatSelectionValue | null;
  passengerName: string | null;
  flight: DerivedFlight | null;
  assigned: { label: string; isYours: boolean } | null;
  currentAssignedSeatNumber: string | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (seat: SeatSelectionValue) => void;
  onCancelSeat: (seat: SeatSelectionValue) => void;
}

const NOTES = [
  'Check-in online thường mở trước giờ khởi hành 24 đến 48 giờ và đóng trước 40 đến 60 phút.',
  'Sau khi check-in, hành khách vẫn cần có mặt đúng giờ tại khu vực kiểm tra an ninh và cửa ra máy bay.',
  'Hành lý xách tay và hành lý ký gửi tiếp tục áp dụng theo điều kiện vé đã đặt.',
];

const BENEFITS = [
  {
    icon: CheckCircle2,
    title: 'Tiết kiệm thời gian',
    desc: 'Không cần xếp hàng chờ làm thủ tục tại sân bay.',
  },
  {
    icon: Ticket,
    title: 'Rõ trạng thái check-in',
    desc: 'Biết ngay chuyến nào đã mở check-in và hành khách nào đủ điều kiện.',
  },
  {
    icon: Briefcase,
    title: 'Kiểm tra ghế ngồi',
    desc: 'Phát hiện sớm trường hợp cần chọn ghế trước khi tiếp tục.',
  },
  {
    icon: ClipboardList,
    title: 'Chuẩn bị bước xác nhận',
    desc: 'Tạo payload chuẩn cho bước tiếp tục check-in với backend.',
  },
];

const CHECKIN_STEPS = [
  { id: 1, label: 'Chọn chuyến bay' },
  { id: 2, label: 'Chọn hành khách' },
  { id: 3, label: 'Xác nhận điều kiện' },
];

const CHECKIN_STEP_ITEMS = [
  { id: 1, label: 'Chọn chuyến bay' },
  { id: 2, label: 'Chọn hành khách' },
  { id: 3, label: 'Chọn ghế ngồi' },
  { id: 4, label: 'Xác nhận thông tin' },
  { id: 5, label: 'Nhận thẻ lên máy bay' },
];

const CHECKIN_BENEFITS = [
  {
    icon: CheckCircle2,
    title: 'Tiết kiệm thời gian',
    desc: 'Không cần xếp hàng chờ làm thủ tục tại sân bay.',
  },
  {
    icon: Armchair,
    title: 'Chọn ghế ngồi yêu thích',
    desc: 'Điều hướng nhanh sang trang chọn ghế khi hành khách chưa có chỗ ngồi.',
  },
  {
    icon: Briefcase,
    title: 'Chủ động hơn',
    desc: 'Bạn có thể check-in mọi lúc, mọi nơi.',
  },
  {
    icon: Ticket,
    title: 'Thẻ lên máy bay',
    desc: 'Nhận thẻ lên máy bay để đi thẳng ra cửa khởi hành.',
  },
];

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '';
  }
  const diff = Math.max(0, endDate.getTime() - startDate.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function formatTerminalLabel(terminal: string | null | undefined): string | null {
  if (!terminal) return null;
  const trimmed = terminal.trim();
  if (!trimmed) return null;
  return /^nhà ga/i.test(trimmed) ? trimmed : `Nhà ga ${trimmed}`;
}

function formatDisplayName(lastName?: string | null, firstName?: string | null): string {
  return [lastName, firstName].filter(Boolean).join(' ').trim();
}

function formatCurrency(amount: number | null | undefined, currency = 'VND'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '--';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatStatusText(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định';
  if (value.includes('_')) {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatPassengerTypeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case 'ADULT':
      return 'Người lớn';
    case 'CHILD':
      return 'Trẻ em';
    case 'INFANT':
      return 'Em bé';
    default:
      return type;
  }
}

function formatCheckInStatusLabel(status: string): string {
  switch (status) {
    case 'READY':
      return 'Sẵn sàng check-in';
    case 'SEAT_SELECTION_REQUIRED':
      return 'Cần chọn ghế';
    case 'ALREADY_CHECKED_IN':
      return 'Đã check-in';
    case 'CHECKIN_NOT_OPEN':
      return 'Chưa mở check-in';
    case 'CHECKIN_CLOSED':
      return 'Đã đóng check-in';
    case 'BOOKING_NOT_CONFIRMED':
      return 'Booking chưa xác nhận';
    case 'TICKET_NOT_ISSUED':
      return 'Vé chưa xuất';
    case 'TICKET_NOT_FOUND':
      return 'Không tìm thấy vé';
    default:
      return status;
  }
}

function formatWindowStatusLabel(status: FlightWindowStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Đã mở check-in';
    case 'NOT_OPEN':
      return 'Chưa mở check-in';
    case 'CLOSED':
      return 'Đã đóng check-in';
    default:
      return status;
  }
}

function formatWindowMessage(flight: DerivedFlight): string {
  if (flight.checkInWindow.status === 'OPEN') {
    return 'Có thể tiếp tục chọn hành khách cho chuyến bay này.';
  }
  if (flight.checkInWindow.status === 'NOT_OPEN') {
    return `Mở từ ${formatTime(flight.checkInWindow.opensAt)} ${formatShortDate(flight.checkInWindow.opensAt)}.`;
  }
  return `Đóng lúc ${formatTime(flight.checkInWindow.closesAt)} ${formatShortDate(flight.checkInWindow.closesAt)}.`;
}

function statusTone(status: string): string {
  switch (status) {
    case 'READY':
      return 'text-emerald-600';
    case 'SEAT_SELECTION_REQUIRED':
      return 'text-amber-600';
    default:
      return 'text-stone-500';
  }
}

function formatServiceLabel(service: {
  serviceType?: string | null;
  serviceName?: string | null;
  optionName?: string | null;
  quantity?: number;
}): string {
  const rawType = service.serviceType?.toUpperCase() ?? '';
  const rawName = service.serviceName?.trim() || service.optionName?.trim() || 'Dịch vụ';
  const quantity = service.quantity && service.quantity > 1 ? ` x${service.quantity}` : '';

  if (rawType.includes('MEAL') || rawName.toLowerCase().includes('meal')) {
    return `Suất ăn: ${rawName}${quantity}`;
  }
  if (rawType.includes('BAG') || rawName.toLowerCase().includes('bag')) {
    return `Hành lý: ${rawName}${quantity}`;
  }
  return `${rawName}${quantity}`;
}

function formatPassengerStatus(
  segments: Array<{ checkInStatus: string }> | undefined
): string {
  if (!segments?.length) return 'Đã xác nhận';
  if (segments.every((segment) => segment.checkInStatus === 'ALREADY_CHECKED_IN')) {
    return 'Đã check-in';
  }
  if (
    segments.some((segment) =>
      ['READY', 'SEAT_SELECTION_REQUIRED', 'ALREADY_CHECKED_IN'].includes(segment.checkInStatus)
    )
  ) {
    return 'Đã xác nhận';
  }
  return formatCheckInStatusLabel(segments[0]?.checkInStatus ?? 'UNKNOWN');
}

function buildCheckInSegments(
  selectedFlights: Set<string>,
  selectedPassengers: Set<string>,
  passengers: DerivedPassenger[]
): CheckInContinueRequest['segments'] {
  return [...selectedFlights]
    .map((flightId) => {
      const passengerIds = [...selectedPassengers]
        .map(Number)
        .filter((passengerId) => {
          const passenger = passengers.find((item) => item.id === String(passengerId));
          return passenger?.segments[flightId]?.eligible;
        });
      return { flightId: Number(flightId), passengerIds };
    })
    .filter((segment) => segment.passengerIds.length > 0);
}

function groupConfirmationServices(
  services: Array<{
    serviceType?: string | null;
    serviceName?: string | null;
    optionName?: string | null;
    quantity?: number;
  }>
): CheckinConfirmationServiceGroup[] {
  const grouped: CheckinConfirmationServiceGroup[] = [
    { key: 'baggage', label: 'Hành lý ký gửi', items: [] },
    { key: 'meal', label: 'Suất ăn', items: [] },
    { key: 'insurance', label: 'Bảo hiểm', items: [] },
    { key: 'other', label: 'Dịch vụ khác', items: [] },
  ];

  for (const service of services) {
    const type = service.serviceType?.toUpperCase() ?? '';
    const label = formatServiceLabel(service);
    if (type.includes('BAG')) {
      grouped[0].items.push(label);
    } else if (type.includes('MEAL') || type.includes('FOOD')) {
      grouped[1].items.push(label);
    } else if (type.includes('INSURANCE')) {
      grouped[2].items.push(label);
    } else {
      grouped[3].items.push(label);
    }
  }

  return grouped;
}

function buildCheckinConfirmationData(
  flights: DerivedFlight[],
  passengers: DerivedPassenger[],
  selectedFlights: Set<string>,
  selectedPassengerIds: Set<string>,
  manageOptions: BookingManageOptionsResponse | null
): CheckinConfirmationData {
  const selectedFlightItems = flights.filter((flight) => selectedFlights.has(flight.id));
  const selectedPassengerItems = passengers.filter((passenger) => selectedPassengerIds.has(passenger.id));
  const servicesByPassengerId = new Map<
    number,
    Array<{
      serviceType?: string | null;
      serviceName?: string | null;
      optionName?: string | null;
      quantity?: number;
    }>
  >();

  for (const service of manageOptions?.serviceSelections ?? []) {
    const bucket = servicesByPassengerId.get(service.passengerId) ?? [];
    bucket.push(service);
    servicesByPassengerId.set(service.passengerId, bucket);
  }

  return {
    flights: selectedFlightItems,
    passengers: selectedPassengerItems.map((passenger) => {
      const serviceGroups = groupConfirmationServices(
        servicesByPassengerId.get(Number(passenger.id)) ?? []
      );

      return {
        id: passenger.id,
        name: passenger.name,
        typeLabel: formatPassengerTypeLabel(passenger.type),
        statusLabel: formatPassengerStatus(Object.values(passenger.segments)),
        seatLabels: selectedFlightItems.map((flight) => {
          const segment = passenger.segments[flight.id];
          return `${flight.segmentLabel}: ${segment?.seatNumber ?? 'Chưa chọn ghế'}`;
        }),
        handBaggageLabels: selectedFlightItems.map((flight) => {
          const baggage = typeof flight.baggageHandKg === 'number' ? `${flight.baggageHandKg}kg` : '--';
          return `${flight.segmentLabel}: ${baggage}`;
        }),
        serviceGroups,
      } satisfies CheckinConfirmationPassengerItem;
    }),
  };
}

function buildBookingDetailModalData(
  bookingLookup: BookingLookupResponse | null,
  manageOptions: BookingManageOptionsResponse | null,
  fallbackPnr: string
): BookingDetailModalData | null {
  if (!bookingLookup) return null;

  const manageItinerariesByFlightId = new Map(
    (manageOptions?.itineraries ?? []).map((itinerary, index) => [itinerary.flightId, { itinerary, index }])
  );
  const manageSegmentsByPassengerId = new Map(
    (manageOptions?.passengers ?? []).map((passenger) => [passenger.passengerId, passenger.segments ?? []])
  );
  const seatAssignmentsByPassengerId = new Map<number, Array<{ flightId: number; seatNumber: string }>>();
  for (const assignment of manageOptions?.seatAssignments ?? []) {
    const bucket = seatAssignmentsByPassengerId.get(assignment.passengerId) ?? [];
    bucket.push({ flightId: assignment.flightId, seatNumber: assignment.seatNumber });
    seatAssignmentsByPassengerId.set(assignment.passengerId, bucket);
  }

  const servicesByPassengerId = new Map<
    number,
    Array<{
      serviceType?: string | null;
      serviceName?: string | null;
      optionName?: string | null;
      quantity?: number;
    }>
  >();
  for (const service of manageOptions?.serviceSelections ?? []) {
    const bucket = servicesByPassengerId.get(service.passengerId) ?? [];
    bucket.push(service);
    servicesByPassengerId.set(service.passengerId, bucket);
  }

  const flights = bookingLookup.itineraries.map((lookupItinerary, index) => {
    const managed = manageItinerariesByFlightId.get(lookupItinerary.flightId);
    const segmentLabel =
      managed?.index === 0 || index === 0
        ? 'Chiều đi'
        : managed?.index === 1 || index === 1
          ? 'Chiều về'
          : `Chặng ${index + 1}`;

    return {
      id: String(lookupItinerary.flightId),
      segmentLabel,
      dateLabel: formatShortDate(lookupItinerary.departureTime),
      departureCode: lookupItinerary.departureAirportCode,
      arrivalCode: lookupItinerary.arrivalAirportCode,
      departureTime: formatTime(lookupItinerary.departureTime),
      arrivalTime: formatTime(lookupItinerary.arrivalTime),
      flightNumber: lookupItinerary.flightNumber,
      cabinLabel:
        managed?.itinerary.fareName ??
        managed?.itinerary.cabinClass ??
        lookupItinerary.fareName ??
        lookupItinerary.cabinClass,
      statusLabel: lookupItinerary.flightStatus
        ? formatStatusText(lookupItinerary.flightStatus)
        : managed?.itinerary.segmentStatus
          ? formatCheckInStatusLabel(managed.itinerary.segmentStatus)
          : 'Chưa xác định',
    } satisfies BookingDetailFlightItem;
  });

  const passengers = bookingLookup.passengers.map((passenger, index) => {
    const managedSegments = manageSegmentsByPassengerId.get(passenger.passengerId) ?? passenger.segments ?? [];
    const seatEntries =
      seatAssignmentsByPassengerId.get(passenger.passengerId) ??
      passenger.selections?.seats?.map((seat) => ({
        flightId: seat.flightId,
        seatNumber: seat.seatNumber,
      })) ??
      passenger.seatAssignments?.map((seat) => ({
        flightId: seat.flightId,
        seatNumber: seat.seatNumber,
      })) ??
      [];
    const serviceEntries =
      servicesByPassengerId.get(passenger.passengerId) ??
      passenger.selections?.services ??
      passenger.serviceSelections ??
      [];

    return {
      id: String(passenger.passengerId),
      orderLabel: `${String(index + 1).padStart(2, '0')}`,
      name: formatDisplayName(passenger.lastName, passenger.firstName),
      statusLabel: formatPassengerStatus(managedSegments),
      seatLabels: flights.map((flight) => {
        const matchedSeat = seatEntries.find((seat) => String(seat.flightId) === flight.id);
        return `${flight.segmentLabel}: ${matchedSeat?.seatNumber ?? 'Chưa chọn'}`;
      }),
      serviceLabels: serviceEntries.length
        ? serviceEntries.map(formatServiceLabel)
        : ['Dịch vụ: Chưa chọn'],
    } satisfies BookingDetailPassengerItem;
  });

  return {
    pnr: bookingLookup.booking.pnrCode || fallbackPnr,
    statusLabel: bookingLookup.booking.statusLabel || formatStatusText(bookingLookup.booking.status),
    totalPassengers: bookingLookup.passengers.length,
    totalAmountLabel: formatCurrency(
      bookingLookup.booking.totalAmount ?? bookingLookup.paymentDetails.price.total,
      bookingLookup.booking.currency || bookingLookup.paymentDetails.price.currency
    ),
    contactLabel: [bookingLookup.primaryContact.email, bookingLookup.primaryContact.phone]
      .filter(Boolean)
      .join(' • '),
    flights,
    passengers,
  };
}

function CheckinStepper({ currentStepId }: { currentStepId: number }) {
  const steps = CHECKIN_STEP_ITEMS.length ? CHECKIN_STEP_ITEMS : CHECKIN_STEPS;

  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-4 border-b border-stone-200 pb-4">
        {steps.map((step, index) => {
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
              {index < steps.length - 1 ? (
                <div className="h-px w-10 bg-stone-200 md:w-16" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlightSelectionList({
  flights,
  selectedFlights,
  onToggleFlight,
  onContinue,
}: {
  flights: DerivedFlight[];
  selectedFlights: Set<string>;
  onToggleFlight: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">Check-in trực tuyến</h2>
      <CheckinStepper currentStepId={1} />

      <div className="rounded-[16px] border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-5">
          <h3 className="text-lg font-semibold text-stone-950">1. Chọn chuyến bay để check-in</h3>
          <p className="mt-1 text-sm text-stone-600">
            Chỉ các chuyến đã mở check-in mới có thể được chọn. Trạng thái hiện tại được lấy từ
            backend.
          </p>
        </div>

        <div className="space-y-4 bg-stone-50/50 p-5">
          {flights.map((flight) => {
            const isSelected = selectedFlights.has(flight.id);
            const isCheckinOpen = flight.checkInWindow.status === 'OPEN';
            return (
              <article
                key={flight.id}
                className={`rounded-xl border bg-white transition-colors ${
                  isSelected ? 'border-amber-400 bg-amber-50/10' : 'border-stone-200'
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  <div
                    className={`flex w-full items-start gap-3 border-b border-stone-100 p-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r ${
                      isSelected ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleFlight(flight.id)}
                      disabled={!isCheckinOpen}
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-red-600 bg-red-600 text-white'
                          : !isCheckinOpen
                            ? 'cursor-not-allowed border-stone-200 bg-stone-100'
                            : 'border-stone-300 bg-white hover:border-red-400'
                      }`}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                    <div className="flex flex-col items-start">
                      <span
                        className={`mb-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          flight.checkInWindow.status === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-700'
                            : flight.checkInWindow.status === 'NOT_OPEN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {formatWindowStatusLabel(flight.checkInWindow.status)}
                      </span>
                      <div className="text-base font-bold text-stone-950">{flight.flightNumber}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                        {flight.departureCode}
                        <ArrowRight className="h-3 w-3 text-stone-400" />
                        {flight.arrivalCode}
                      </div>
                      <div className="mt-1.5 text-xs text-stone-500">
                        {flight.departureTime} - {flight.arrivalTime}
                        {flight.shortDate ? ` • ${flight.shortDate}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-4 p-4 md:grid-cols-4">
                    <div className="flex flex-col text-sm">
                      <div className="mb-1 text-[11px] text-stone-500">Khởi hành</div>
                      <div className="text-base font-bold text-stone-950">{flight.departureTime}</div>
                      <div className="mt-0.5 font-semibold text-stone-900">{flight.departureCode}</div>
                      <div className="truncate text-[11px] text-stone-500">{flight.departureCity}</div>
                      {formatTerminalLabel(flight.departureTerminal) ? (
                        <div className="mt-0.5 text-[11px] font-medium text-stone-500">
                          {formatTerminalLabel(flight.departureTerminal)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-center justify-center px-2 text-center">
                      <Plane className="mb-1 h-5 w-5 shrink-0 text-stone-400" />
                      {flight.durationLabel ? (
                        <span className="whitespace-nowrap text-[11px] text-stone-500">
                          {flight.durationLabel}
                        </span>
                      ) : null}
                      <span className="mt-1 text-[11px] text-stone-400">{flight.journeyType}</span>
                    </div>

                    <div className="flex flex-col text-sm">
                      <div className="mb-1 text-[11px] text-stone-500">Đến</div>
                      <div className="text-base font-bold text-stone-950">{flight.arrivalTime}</div>
                      <div className="mt-0.5 font-semibold text-stone-900">{flight.arrivalCode}</div>
                      <div className="truncate text-[11px] text-stone-500">{flight.arrivalCity}</div>
                      {formatTerminalLabel(flight.arrivalTerminal) ? (
                        <div className="mt-0.5 text-[11px] font-medium text-stone-500">
                          {formatTerminalLabel(flight.arrivalTerminal)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col text-sm">
                      <div className="mb-1 text-[11px] text-stone-500">Hạng vé</div>
                      <div className="text-[11px] font-semibold text-stone-950">{flight.cabin}</div>
                      <div className="mb-1 mt-2 text-[11px] text-stone-500">Trạng thái</div>
                      <div
                        className={`text-[11px] font-semibold ${
                          flight.segmentStatus === 'READY'
                            ? 'text-emerald-600'
                            : flight.segmentStatus === 'SEAT_SELECTION_REQUIRED'
                              ? 'text-amber-600'
                              : 'text-stone-500'
                        }`}
                      >
                        {formatWindowMessage(flight)}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex flex-col items-end border-t border-stone-100 p-5">
          <button
            type="button"
            disabled={selectedFlights.size === 0}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tiếp tục: Chọn hành khách ({selectedFlights.size} chuyến)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function PassengerSelectionPanel({
  passengers,
  selected,
  onToggle,
  onToggleAll,
  flight,
  onBack,
  onCheckin,
  checkingIn,
  submitError,
}: {
  passengers: DerivedPassenger[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  flight: DerivedFlight;
  onBack: () => void;
  onCheckin: () => void;
  checkingIn: boolean;
  submitError: string | null;
}) {
  const eligiblePassengers = passengers.filter((passenger) => passenger.segments[flight.id]?.eligible);
  const isAllSelected =
    eligiblePassengers.length > 0 &&
    eligiblePassengers.every((passenger) => selected.has(passenger.id));

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">Check-in trực tuyến</h2>
      <CheckinStepper currentStepId={2} />

      <div className="rounded-[16px] border border-stone-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-stone-950">2. Chọn hành khách</h3>
            <div className="mt-2 flex items-center justify-between text-sm leading-6 text-stone-600">
              <p>
                Trạng thái hành khách cho chuyến bay{' '}
                <span className="font-semibold text-stone-900">
                  {flight.flightNumber} ({flight.departureCode} → {flight.arrivalCode})
                </span>{' '}
              </p>
              <button
                type="button"
                onClick={onToggleAll}
                className="font-semibold text-sky-600 transition hover:text-sky-700"
              >
                {isAllSelected ? 'Bỏ chọn đủ điều kiện' : 'Chọn tất cả đủ điều kiện'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[760px] w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-stone-500">
                <th className="py-3 font-medium">Hành khách</th>
                <th className="py-3 font-medium">Loại</th>
                <th className="py-3 font-medium">Ngày sinh</th>
                <th className="py-3 font-medium">Ghế</th>
                <th className="py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((passenger) => {
                const segment = passenger.segments[flight.id];
                const isSelected = selected.has(passenger.id);
                const disabled = !segment?.eligible;
                return (
                  <tr key={passenger.id} className="border-b border-stone-100 last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onToggle(passenger.id)}
                          disabled={disabled}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? 'border-red-600 bg-red-600 text-white'
                              : disabled
                                ? 'cursor-not-allowed border-stone-200 bg-stone-100'
                                : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-stone-950">{passenger.name.toUpperCase()}</p>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {passenger.dob} | {passenger.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-stone-700">{passenger.type}</td>
                    <td className="py-4 text-stone-700">{passenger.dob}</td>
                    <td className="py-4 text-stone-700">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-stone-400" />
                        {segment?.seatNumber ?? 'Chưa chọn'}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`font-semibold ${statusTone(segment?.checkInStatus ?? 'UNKNOWN')}`}>
                        {formatCheckInStatusLabel(segment?.checkInStatus ?? 'UNKNOWN')}
                      </div>
                      {segment?.warnings?.length ? (
                        <div className="mt-1 text-xs text-stone-500">
                          {segment.warnings.map(formatCheckInStatusLabel).join(', ')}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {submitError ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>{submitError}</p>
          </div>
        ) : null}



        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || checkingIn}
            onClick={onCheckin}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Tiếp tục: Xác nhận điều kiện ({selected.size} hành khách)
          </button>
        </div>
      </div>
    </section>
  );
}

function EnhancedPassengerSelectionPanel({
  passengers,
  selected,
  onToggle,
  onToggleAll,
  flight,
  onBack,
  onContinue,
  submitError,
}: {
  passengers: DerivedPassenger[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  flight: DerivedFlight;
  onBack: () => void;
  onContinue: () => void;
  submitError: string | null;
}) {
  const eligiblePassengers = passengers.filter((passenger) => passenger.segments[flight.id]?.eligible);
  const isAllSelected =
    eligiblePassengers.length > 0 &&
    eligiblePassengers.every((passenger) => selected.has(passenger.id));
  const cabinBagLabel = `${flight.baggageHandKg ?? 7}kg`;

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">Check-in trực tuyến</h2>
      <CheckinStepper currentStepId={2} />

      <div className="space-y-4">
        <div className="rounded-[20px] border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-stone-950">2. Chọn hành khách</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Chọn hành khách bạn muốn làm thủ tục cho chuyến bay:{' '}
                <span className="font-semibold text-stone-900">
                  {flight.flightNumber} ({flight.departureCode} → {flight.arrivalCode})
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleAll}
              className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
            >
              {isAllSelected ? 'Chọn lại' : 'Chọn tất cả'}
            </button>
          </div>

          <div className="mt-5 overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[13px] md:text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500">
                  <th className="w-10 py-3 pr-2 font-medium" />
                  <th className="w-[30%] py-3 pr-3 font-medium">Hành khách</th>
                  <th className="w-[18%] py-3 pr-3 font-medium">Loại hành khách</th>
                  <th className="w-[13%] py-3 pr-3 font-medium">Ngày sinh</th>
                  <th className="w-[16%] py-3 pr-3 font-medium">Hành lý xách tay</th>
                  <th className="w-[23%] py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((passenger) => {
                  const segment = passenger.segments[flight.id];
                  const isSelected = selected.has(passenger.id);
                  const disabled = !segment?.eligible;

                  return (
                    <tr key={passenger.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-4 pr-2 align-top">
                        <button
                          type="button"
                          onClick={() => onToggle(passenger.id)}
                          disabled={disabled}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? 'border-red-600 bg-red-600 text-white'
                              : disabled
                                ? 'cursor-not-allowed border-stone-200 bg-stone-100'
                                : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                      </td>
                      <td className="py-4 pr-3 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-stone-950 md:text-base">
                              {passenger.name.toUpperCase()}
                            </p>
                            <p className="mt-0.5 break-words text-xs leading-5 text-stone-500">
                              {formatShortDate(passenger.dob)} | {formatPassengerTypeLabel(passenger.type)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-3 align-top text-stone-700">{formatPassengerTypeLabel(passenger.type)}</td>
                      <td className="py-4 pr-3 align-top text-stone-700">{formatShortDate(passenger.dob)}</td>
                      <td className="py-4 pr-3 align-top text-stone-700">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-stone-400" />
                          {cabinBagLabel}
                        </div>
                      </td>
                      <td className="py-4 align-top">
                        <div className={`break-words font-semibold ${statusTone(segment?.checkInStatus ?? 'UNKNOWN')}`}>
                          {formatCheckInStatusLabel(segment?.checkInStatus ?? 'UNKNOWN')}
                        </div>
                        {segment?.warnings?.length ? (
                          <div className="mt-1 break-words text-xs leading-5 text-stone-500">
                            {segment.warnings.map(formatCheckInStatusLabel).join(', ')}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {submitError ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p>{submitError}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
            Tiếp tục: Chọn ghế ngồi ({selected.size} hành khách)
          </button>
        </div>
      </div>
    </section>
  );
}

function CheckinSeatReviewPanel({
  passengers,
  selected,
  flight,
  submitError,
  seatMapLoading,
  seatMapError,
  seatMap,
  selectedSeat,
  assignedSeatBySeatId,
  seatConfirmLoading,
  activePassengerId,
  onActivePassengerChange,
  onSeatPreview,
  onSeatConfirm,
  onSeatCancel,
  onBack,
  onContinue,
}: {
  passengers: DerivedPassenger[];
  selected: Set<string>;
  flight: DerivedFlight;
  submitError: string | null;
  seatMapLoading: boolean;
  seatMapError: string | null;
  seatMap: Parameters<typeof AircraftSeatsMap>[0]['seatMap'];
  selectedSeat: SeatSelectionValue | null;
  assignedSeatBySeatId: ReadonlyMap<number, { label: string; isYours: boolean }> | null;
  seatConfirmLoading: boolean;
  activePassengerId: string | null;
  onActivePassengerChange: (id: string) => void;
  onSeatPreview: (seat: SeatSelectionValue) => void;
  onSeatConfirm: (seat: SeatSelectionValue) => void;
  onSeatCancel: (seat: SeatSelectionValue) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const selectedPassengers = passengers.filter((passenger) => selected.has(passenger.id));
  const missingSeatPassengers = selectedPassengers.filter((passenger) => !passenger.segments[flight.id]?.seatAssigned);
  const hasMissingSeats = missingSeatPassengers.length > 0;
  const activePassenger =
    selectedPassengers.find((passenger) => passenger.id === activePassengerId) ?? selectedPassengers[0] ?? null;

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">Check-in trực tuyến</h2>
      <CheckinStepper currentStepId={3} />

      <div className="space-y-4">
        <div className="rounded-[20px] border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-stone-950">3. Chọn ghế ngồi</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Chọn ghế cho hành khách đã chọn trên chuyến bay{' '}
                <span className="font-semibold text-stone-900">
                  {flight.flightNumber} ({flight.departureCode} → {flight.arrivalCode})
                </span>
                . Chọn một hành khách ở cột bên phải, sau đó chọn ghế trực tiếp trên sơ đồ.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1.18fr)_340px]">
            <div className="min-w-0 rounded-[18px] border border-stone-200 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500">
                <div className="font-semibold text-stone-900">
                  {flight.flightNumber} | {flight.departureCode} → {flight.arrivalCode} | {flight.departureTime} -{' '}
                  {flight.arrivalTime} | {flight.shortDate}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded border border-emerald-300 bg-emerald-50" />
                  Ghế trống
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded border border-amber-300 bg-amber-50" />
                  Ghế trả phí
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded border border-slate-500 bg-slate-200" />
                  Ghế đã chọn
                </div>
              </div>

              <AircraftSeatsMap
                seatMap={seatMap}
                loading={seatMapLoading}
                error={seatMapError}
                selectedSeat={selectedSeat}
                assignedSeatBySeatId={assignedSeatBySeatId}
                seatConfirmLoading={seatConfirmLoading}
                onSeatPreview={onSeatPreview}
                onSeatConfirm={onSeatConfirm}
                onSeatCancel={onSeatCancel}
                showDetailPanel={false}
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-[18px] border border-stone-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-stone-950">
                    Hành khách đã chọn ({selectedPassengers.length}/{selected.size})
                  </h4>
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    Chọn lại hành khách
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedPassengers.map((passenger, index) => {
                    const segment = passenger.segments[flight.id];
                    const seatAssigned = Boolean(segment?.seatAssigned && segment?.seatNumber);
                    const isActive = passenger.id === activePassenger?.id;

                    return (
                      <button
                        key={passenger.id}
                        type="button"
                        onClick={() => onActivePassengerChange(passenger.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-red-300 bg-red-50/60 shadow-sm'
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-950">
                              {index + 1}. {passenger.name.toUpperCase()}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {formatPassengerTypeLabel(passenger.type)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                              seatAssigned ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {segment?.seatNumber ?? 'Chưa chọn ghế'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {activePassenger ? (
                  <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    Đang thao tác cho <span className="font-semibold text-stone-950">{activePassenger.name}</span>.
                    Chọn ghế trên sơ đồ để gán hoặc đổi ghế.
                  </div>
                ) : null}
              </div>

              <div className="rounded-[18px] border border-stone-200 p-4 text-sm text-stone-600">
                <p className="font-semibold text-stone-950">Lưu ý giá ghế</p>
                <p className="mt-2">Giá hiển thị là giá cho 1 hành khách / 1 chặng và có thể thay đổi theo chuyến bay.</p>
              </div>
            </div>
          </div>

          {hasMissingSeats ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Còn {missingSeatPassengers.length} hành khách chưa có ghế. Hãy hoàn tất chọn ghế trước khi xác nhận thông tin check-in.
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Tất cả hành khách đã có ghế. Có thể tiếp tục sang bước xác nhận thông tin.
            </div>
          )}

          {submitError ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p>{submitError}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={selectedPassengers.length === 0 || hasMissingSeats}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
            Tiếp tục: Xác nhận thông tin ({selectedPassengers.length} hành khách)
          </button>
        </div>
      </div>
    </section>
  );
}

function CheckinConfirmationPanel({
  confirmation,
  submitError,
  checkingIn,
  onBack,
  onConfirm,
}: {
  confirmation: CheckinConfirmationData;
  submitError: string | null;
  checkingIn: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">Check-in trực tuyến</h2>
      <CheckinStepper currentStepId={4} />

      <div className="space-y-4">
        <div className="rounded-[20px] border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="border-b border-stone-200 pb-5">
            <h3 className="text-2xl font-semibold text-stone-950">4. Xác nhận thông tin</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Kiểm tra lại chuyến bay, hành khách, ghế ngồi và các dịch vụ bổ sung trước khi xác nhận
              check-in.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-[18px] border border-stone-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plane className="h-4 w-4 text-red-600" />
                <h4 className="text-lg font-semibold text-stone-950">Thông tin chuyến bay</h4>
              </div>
              <div className="space-y-3">
                {confirmation.flights.map((flight) => (
                  <article
                    key={flight.id}
                    className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 md:grid-cols-[1.1fr_0.9fr]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-stone-950">
                        {flight.segmentLabel} • {flight.flightNumber}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-700">
                        <span className="font-semibold text-stone-950">{flight.departureCode}</span>
                        <span>{flight.departureTime}</span>
                        <span className="text-stone-400">{'->'}</span>
                        <span className="font-semibold text-stone-950">{flight.arrivalCode}</span>
                        <span>{flight.arrivalTime}</span>
                        <span>{flight.shortDate}</span>
                      </div>
                      <div className="mt-2 text-sm text-stone-500">
                        {flight.departureCity}
                        {flight.departureTerminal ? ` • ${formatTerminalLabel(flight.departureTerminal)}` : ''}
                      </div>
                      <div className="text-sm text-stone-500">
                        {flight.arrivalCity}
                        {flight.arrivalTerminal ? ` • ${formatTerminalLabel(flight.arrivalTerminal)}` : ''}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-stone-600 md:text-right">
                      <div>
                        Hạng vé: <span className="font-medium text-stone-900">{flight.cabin}</span>
                      </div>
                      <div>
                        Trạng thái:{' '}
                        <span className="font-medium text-emerald-700">
                          {formatCheckInStatusLabel(flight.segmentStatus)}
                        </span>
                      </div>
                      <div>
                        Thời gian bay: <span className="font-medium text-stone-900">{flight.durationLabel}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-stone-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-red-600" />
                <h4 className="text-lg font-semibold text-stone-950">Danh sách hành khách và ghế ngồi</h4>
              </div>
              <div className="space-y-3">
                {confirmation.passengers.map((passenger, index) => (
                  <article
                    key={passenger.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 border-b border-stone-100 pb-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-700">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="font-semibold text-stone-950">{passenger.name}</div>
                          <div className="text-sm text-stone-500">{passenger.typeLabel}</div>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {passenger.statusLabel}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                          Ghế theo chặng
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {passenger.seatLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                          Hành lý xách tay
                        </div>
                        <div className="mt-2 space-y-1.5 text-sm text-stone-700">
                          {passenger.handBaggageLabels.map((label) => (
                            <div key={label}>{label}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-stone-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-red-600" />
                <h4 className="text-lg font-semibold text-stone-950">Thông tin bổ sung</h4>
              </div>
              <div className="space-y-3">
                {confirmation.passengers.map((passenger) => (
                  <article
                    key={passenger.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-stone-950">{passenger.name}</div>
                        <div className="text-sm text-stone-500">{passenger.typeLabel}</div>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                        {passenger.serviceGroups.reduce((sum, group) => sum + group.items.length, 0)} dịch vụ
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {passenger.serviceGroups.map((group) => (
                        <div key={group.key} className="rounded-2xl border border-stone-200 bg-white p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            {group.label}
                          </div>
                          <div className="mt-2 space-y-1.5 text-sm text-stone-700">
                            {group.items.length ? (
                              group.items.map((item) => <div key={item}>{item}</div>)
                            ) : (
                              <div className="text-stone-400">Chưa chọn</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Lưu ý: Sau khi xác nhận, bạn sẽ không thể thay đổi ghế ngồi và thông tin hành khách trong
              luồng check-in hiện tại.
            </div>

            {submitError ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p>{submitError}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={confirmation.passengers.length === 0 || checkingIn}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Xác nhận check-in
          </button>
        </div>
      </div>
    </section>
  );
}

function CheckinSidebar({
  booking,
  flight,
  onOpenDetails,
}: {
  booking: {
    pnr: string;
    lastName: string;
    totalPassengers: number;
    expiresAt: string | null;
  };
  flight: DerivedFlight | null;
  onOpenDetails: () => void;
}) {
  return (
    <aside className="space-y-3.5 xl:max-w-[300px] 2xl:max-w-[320px]">
      <section className="rounded-[28px] border border-stone-200 bg-white p-6">
        <h3 className="text-2xl font-semibold text-stone-950">Thông tin đặt chỗ</h3>
        <div className="mt-6 space-y-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Mã đặt chỗ (PNR)</span>
            <span className="text-xl font-semibold text-red-600">{booking.pnr}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Họ</span>
            <span className="font-semibold uppercase text-stone-950">{booking.lastName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Tổng số hành khách</span>
            <span className="font-semibold text-stone-950">{booking.totalPassengers}</span>
          </div>
          {booking.expiresAt ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-500">Giữ chỗ đến</span>
              <span className="font-semibold text-stone-950">{booking.expiresAt}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          <ClipboardList className="h-4 w-4" />
          Chi tiết đặt chỗ
        </button>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-6">
        <h3 className="text-2xl font-semibold text-stone-950">Bạn cần hỗ trợ?</h3>
        <div className="mt-5 space-y-2">
          {[
            { icon: HelpCircle, label: 'Câu hỏi thường gặp' },
            { icon: Headphones, label: 'Liên hệ hỗ trợ' },
            { icon: MessageSquare, label: 'Gửi phản hồi' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl px-2 py-3 text-left transition hover:bg-stone-50"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-stone-500" />
                <span className="text-base text-stone-800">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function EnhancedCheckinSidebar({
  booking,
  flight,
  onOpenDetails,
}: {
  booking: {
    pnr: string;
    lastName: string;
    totalPassengers: number;
    expiresAt: string | null;
  };
  flight: DerivedFlight | null;
  onOpenDetails: () => void;
}) {
  return (
    <aside className="space-y-3.5 xl:max-w-[280px] 2xl:max-w-[292px]">
      <section className="rounded-[20px] border border-stone-200 bg-white p-4 shadow-sm xl:p-3.5">
        <h3 className="text-2xl font-semibold text-stone-950">Thông tin đặt chỗ</h3>
        <div className="mt-4 space-y-3 text-[0.9375rem] xl:mt-3.5 xl:text-[0.9rem]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Mã đặt chỗ (PNR)</span>
            <span className="text-base font-semibold text-red-600 xl:text-[0.95rem]">{booking.pnr}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Họ</span>
            <span className="font-semibold uppercase text-stone-950">{booking.lastName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Tổng số hành khách</span>
            <span className="font-semibold text-stone-950">{booking.totalPassengers}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 xl:mt-3.5 xl:h-10 xl:px-3 xl:text-[0.9rem]"
        >
          <ClipboardList className="h-4 w-4" />
          Chi tiết đặt chỗ
        </button>
      </section>

      {flight ? (
        <section className="rounded-[20px] border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50/65 to-white p-4 shadow-sm xl:p-3.5">
          <h3 className="text-2xl font-semibold text-amber-900">Chuyến bay đã chọn</h3>
          <div className="mt-3.5 flex items-start gap-2.5 xl:mt-3 xl:gap-2">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-100 bg-white text-red-600 shadow-sm xl:h-8 xl:w-8">
              <Plane className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[1.7rem] font-semibold leading-none text-stone-950 xl:text-[1.45rem]">{flight.flightNumber}</div>
              <div className="mt-1.5 flex items-center gap-2 text-base font-semibold text-stone-900 xl:text-[0.95rem]">
                <span>{flight.departureCode}</span>
                <span className="text-stone-400">→</span>
                <span>{flight.arrivalCode}</span>
              </div>
              <div className="mt-1.5 text-[0.9375rem] leading-5 text-stone-600 xl:text-[0.88rem]">
                {flight.departureTime} - {flight.arrivalTime} • {flight.shortDate}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[20px] border border-stone-200 bg-white p-4 shadow-sm xl:p-3.5">
        <h3 className="text-2xl font-semibold text-stone-950">Bạn cần hỗ trợ?</h3>
        <div className="mt-3.5 space-y-0.5 xl:mt-3">
          {[
            { icon: HelpCircle, label: 'Câu hỏi thường gặp' },
            { icon: Headphones, label: 'Liên hệ hỗ trợ' },
            { icon: MessageSquare, label: 'Gửi phản hồi' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-1.5 py-2 text-left transition hover:bg-stone-50 xl:px-1 xl:py-1.5"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-[18px] w-[18px] text-stone-500" />
                <span className="text-[0.975rem] text-stone-800 xl:text-[0.92rem]">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function CheckinBenefitsStrip() {
  return (
    <section className="mt-8 grid gap-4 border-t border-stone-200 pt-6 md:grid-cols-2 xl:grid-cols-4">
      {CHECKIN_BENEFITS.map((benefit) => (
        <article key={benefit.title} className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <benefit.icon className="h-5 w-5" />
          </div>
          <h4 className="mt-4 text-base font-semibold text-stone-950">{benefit.title}</h4>
          <p className="mt-1 text-sm leading-6 text-stone-600">{benefit.desc}</p>
        </article>
      ))}
    </section>
  );
}

function BookingDetailModal({
  detail,
  open,
  onClose,
  onContinueCheckin,
  onOpenManageBooking,
}: {
  detail: BookingDetailModalData | null;
  open: boolean;
  onClose: () => void;
  onContinueCheckin: () => void;
  onOpenManageBooking: () => void;
}) {
  if (!open || !detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-stone-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5 md:px-8">
          <div>
            <h3 className="text-2xl font-semibold text-stone-950">Chi tiết đặt chỗ</h3>
            <p className="mt-1 text-sm text-stone-500">Thông tin được lấy trực tiếp từ store hiện tại.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
            aria-label="Đóng chi tiết đặt chỗ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto">
          <div className="grid gap-4 border-b border-stone-100 bg-stone-50/80 px-6 py-5 text-sm md:grid-cols-3 md:px-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-stone-500">PNR:</span>
                <span className="font-semibold text-stone-950">{detail.pnr}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500">Trạng thái:</span>
                <span className="font-semibold text-emerald-700">{detail.statusLabel}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-stone-500">Hành khách:</span>
                <span className="font-semibold text-stone-950">{detail.totalPassengers}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500">Tổng tiền:</span>
                <span className="font-semibold text-stone-950">{detail.totalAmountLabel}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-stone-500">Liên hệ</div>
              <div className="font-medium text-stone-950">{detail.contactLabel || 'Chưa có thông tin liên hệ'}</div>
            </div>
          </div>

          <section className="border-b border-stone-100 px-6 py-5 md:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-stone-950">Hành trình</h4>
              <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                {detail.flights.length} chặng
              </span>
            </div>
            <div className="space-y-3">
              {detail.flights.map((flight) => (
                <article
                  key={flight.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-stone-950">
                        {flight.segmentLabel} • {flight.dateLabel}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
                        <span className="font-semibold text-stone-950">{flight.departureCode}</span>
                        <span>{flight.departureTime}</span>
                        <span className="text-stone-400">{'->'}</span>
                        <span className="font-semibold text-stone-950">{flight.arrivalCode}</span>
                        <span>{flight.arrivalTime}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-700">
                          {flight.flightNumber}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm md:text-right">
                      <div className="text-stone-500">
                        Hạng vé: <span className="font-medium text-stone-900">{flight.cabinLabel}</span>
                      </div>
                      <div className="text-stone-500">
                        Tình trạng: <span className="font-medium text-stone-900">{flight.statusLabel}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="px-6 py-5 md:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-stone-950">Hành khách</h4>
              <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                {detail.passengers.length} người
              </span>
            </div>
            <div className="space-y-3">
              {detail.passengers.map((passenger) => (
                <article
                  key={passenger.id}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-stone-100 pb-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-700">
                        {passenger.orderLabel}
                      </span>
                      <div>
                        <div className="font-semibold text-stone-950">{passenger.name}</div>
                        <div className="text-sm text-stone-500">{passenger.statusLabel}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {passenger.statusLabel}
                    </span>
                  </div>
                  <div className="grid gap-4 pt-3 md:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Ghế theo chặng
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {passenger.seatLabels.map((seatLabel) => (
                          <span
                            key={seatLabel}
                            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700"
                          >
                            {seatLabel}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Dịch vụ kèm theo
                      </div>
                      <div className="mt-2 space-y-1.5 text-sm text-stone-700">
                        {passenger.serviceLabels.map((serviceLabel) => (
                          <div key={serviceLabel}>{serviceLabel}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="border-t border-stone-200 bg-stone-50/80 px-6 py-5 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-white"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={onContinueCheckin}
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Tiếp tục check-in
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenManageBooking}
              className="mt-4 text-sm font-medium text-sky-700 transition hover:text-sky-800"
            >
              Xem đầy đủ trong Manage Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesAndBenefits() {
  return (
    <div className="mt-8 space-y-5">
      <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div className="space-y-2 text-sm leading-6 text-sky-950">
            {NOTES.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-stone-200 pt-6 md:grid-cols-2 xl:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <article key={benefit.title} className="flex items-start gap-4 rounded-3xl bg-white p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <benefit.icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-stone-950">{benefit.title}</h4>
              <p className="mt-1 text-sm leading-6 text-stone-600">{benefit.desc}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function CheckinSuccess({
  checkedIn,
  flight,
}: {
  checkedIn: DerivedPassenger[];
  flight: DerivedFlight | null;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="mt-6 text-4xl font-semibold tracking-tight text-stone-950">
          Check-in sẵn sàng
        </h2>
        <p className="mt-3 text-base leading-7 text-stone-600">
          Backend đã xác nhận payload điều kiện hợp lệ cho bước tiếp tục check-in. Màn này vẫn là
          placeholder trước khi có bước confirm cuối cùng và boarding pass thật.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
        {checkedIn.map((passenger) => {
          const segment = flight ? passenger.segments[flight.id] : null;
          return (
            <article
              key={passenger.id}
              className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Ticket className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Ready
                </span>
              </div>
              <p className="mt-4 text-xl font-semibold text-stone-950">{passenger.name}</p>
              <p className="mt-1 text-sm text-stone-500">
                {passenger.type} · Ngày sinh: {passenger.dob}
              </p>
              {flight ? (
                <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 text-sm">
                  <div>
                    <p className="text-stone-400">Chuyến bay</p>
                    <p className="mt-1 font-semibold text-stone-950">{flight.flightNumber}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Khởi hành</p>
                    <p className="mt-1 font-semibold text-stone-950">{flight.departureTime}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Ghế</p>
                    <p className="mt-1 font-semibold text-red-600">{segment?.seatNumber ?? 'N/A'}</p>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          <Download className="h-4 w-4" />
          Tải boarding pass
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <Home className="h-4 w-4" />
          Về trang chủ
        </button>
      </div>
    </section>
  );
}

function buildBoardingPassMatrix(seed: string, size = 21) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => {
      const finderBounds =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);

      if (finderBounds) {
        const localRow = row >= size - 7 ? row - (size - 7) : row;
        const localCol = col >= size - 7 ? col - (size - 7) : col;
        const ring = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const core = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        return ring || core;
      }

      hash ^= row * 131 + col * 17;
      hash = Math.imul(hash, 16777619);
      return ((hash >>> 0) & 1) === 1;
    })
  );
}

function BoardingPassCode({ value }: { value: string }) {
  const cells = useMemo(() => buildBoardingPassMatrix(value), [value]);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-2">
      <div
        className="grid aspect-square w-[92px] grid-cols-[repeat(21,minmax(0,1fr))] overflow-hidden rounded-[10px] bg-white"
        aria-label="Boarding pass code"
      >
        {cells.flatMap((row, rowIndex) =>
          row.map((filled, colIndex) => (
            <span
              key={`${rowIndex}-${colIndex}`}
              className={filled ? 'bg-stone-950' : 'bg-white'}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CheckinSuccessExperience({
  booking,
  flights,
  response,
  onOpenDetails,
}: {
  booking: CheckinBookingSummary;
  flights: DerivedFlight[];
  response: CheckInConfirmResponse;
  onOpenDetails: () => void;
}) {
  const navigate = useNavigate();
  const confirmedFlightIds = new Set(response.segments.map((segment) => segment.flightId));
  const confirmedFlights = flights.filter((flight) => confirmedFlightIds.has(flight.numericId));
  const primaryFlight = confirmedFlights[0] ?? flights[0] ?? null;
  const flightGroups = useMemo(
    () =>
      confirmedFlights
        .map((flight) => {
          const segment = response.segments.find((item) => item.flightId === flight.numericId);
          if (!segment) return null;

          const passengers = segment.passengers
            .map((passenger) => {
              const boardingPass = response.boardingPasses.find(
                (item) =>
                  item.flightId === flight.numericId && item.passengerId === passenger.passengerId
              );
              if (!boardingPass) return null;

              return {
                id: boardingPass.boardingPassId,
                passengerName: passenger.fullName,
                ticketNumber: passenger.ticketNumber,
                seatNumber: boardingPass.seatLabel ?? passenger.seatNumber ?? 'Chua cap nhat',
                gate: boardingPass.gate ?? 'Dang cap nhat',
                boardingTime: boardingPass.boardingTime
                  ? formatTime(boardingPass.boardingTime)
                  : flight.departureTime,
                sequenceNumber:
                  boardingPass.sequenceNumber != null
                    ? String(boardingPass.sequenceNumber).padStart(3, '0')
                    : '---',
                qrCode: boardingPass.qrCode,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item != null);

          if (passengers.length === 0) return null;

          return { flight, passengers };
        })
        .filter((item): item is NonNullable<typeof item> => item != null),
    [confirmedFlights, response.boardingPasses, response.segments]
  );

  return (
    <section className="space-y-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0 rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <CheckinStepper currentStepId={5} />
          <section className="mt-6 overflow-hidden rounded-[24px] border border-stone-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[1.85rem] font-semibold tracking-tight text-stone-950">
                    Check-in thành công!
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Cảm ơn bạn đã check-in trực tuyến. Dưới đây là thẻ lên máy bay của bạn.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  <Mail className="h-4 w-4" />
                  Gửi qua email
                </button>
              </div>
            </div>

            <div className="space-y-6 px-4 py-4 sm:px-5 sm:py-5">
              {flightGroups.map((group, groupIndex) => (
                <section key={group.flight.id} className="space-y-3">
                  <div className="flex flex-col gap-3 border-b border-stone-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-stone-800">
                        <Plane className="h-4 w-4 text-red-600" />
                        <span>Chuyến bay {groupIndex + 1}: {group.flight.flightNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[1.1rem] font-semibold text-stone-950">
                        <span>{group.flight.departureCode}</span>
                        <ArrowRight className="h-4 w-4 text-stone-400" />
                        <span>{group.flight.arrivalCode}</span>
                      </div>
                      <div className="text-stone-600">
                        {group.flight.departureTime} - {group.flight.arrivalTime}
                      </div>
                      <div className="text-stone-600">{group.flight.shortDate}</div>
                    </div>

                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Đã check-in
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.passengers.map((card) => (
                      <article
                        key={card.id}
                        className="overflow-hidden rounded-[16px] border border-stone-200 bg-white"
                      >
                        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
                          <div className="min-w-0">
                            <div className="text-[1rem] font-bold italic leading-none text-red-600">
                              vietjetAir.com
                            </div>
                            <div className="mt-4 text-[1.02rem] font-semibold uppercase text-stone-950">
                              {card.passengerName}
                            </div>
                            <div className="mt-2 text-xs text-stone-500">Ghế ngồi</div>
                            <div className="mt-1 text-[1.9rem] font-semibold leading-none text-stone-950">
                              {card.seatNumber}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                              Đã check-in
                            </span>
                            <BoardingPassCode value={card.qrCode} />
                          </div>
                        </div>

                        <div className="border-t border-stone-100 px-4 py-3">
                          <div className="flex items-center gap-3 text-stone-950">
                            <span className="text-[1.55rem] font-semibold">{group.flight.departureCode}</span>
                            <ArrowRight className="h-4 w-4 text-stone-400" />
                            <span className="text-[1.55rem] font-semibold">{group.flight.arrivalCode}</span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
                            <div>
                              <div className="text-stone-400">Chuyến bay</div>
                              <div className="mt-1 font-semibold text-stone-950">{group.flight.flightNumber}</div>
                            </div>
                            <div>
                              <div className="text-stone-400">Ngày</div>
                              <div className="mt-1 font-semibold text-stone-950">{group.flight.shortDate}</div>
                            </div>
                            <div>
                              <div className="text-stone-400">Giờ bay</div>
                              <div className="mt-1 font-semibold text-stone-950">{group.flight.departureTime}</div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-stone-100 pt-3 text-[13px]">
                            <div>
                              <div className="text-stone-400">Cửa</div>
                              <div className="mt-1 font-semibold text-stone-950">{card.gate}</div>
                            </div>
                            <div>
                              <div className="text-stone-400">Giờ ra cửa</div>
                              <div className="mt-1 font-semibold text-stone-950">{card.boardingTime}</div>
                            </div>
                            <div>
                              <div className="text-stone-400">SEQ</div>
                              <div className="mt-1 font-semibold text-stone-950">{card.sequenceNumber}</div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                <Home className="h-4 w-4" />
                Về trang chủ
              </button>
              <button
                type="button"
                onClick={() => navigate('/manage-booking/check-in')}
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Check-in chuyến bay khác
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                <Download className="h-4 w-4" />
                Tải xuống tất cả (PDF)
              </button>
              <button
                type="button"
                onClick={() => navigate('/manage-booking')}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 sm:ml-auto"
              >
                Hoàn tất
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-[24px] border border-sky-200 bg-sky-50/80 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
              <div>
                <h3 className="text-base font-semibold text-sky-950">Lưu ý trước giờ khởi hành</h3>
                <div className="mt-2 space-y-1 text-sm leading-6 text-sky-950/80">
                  <p>Có mặt tại sân bay sớm ít nhất 90 phút đối với chuyến bay nội địa.</p>
                  <p>Kiểm tra lại cửa ra máy bay trên màn hình sân bay vì thông tin có thể thay đổi.</p>
                  <p>Chuẩn bị giấy tờ tùy thân và thẻ lên máy bay trước khi vào khu vực an ninh.</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        <div className="space-y-5">
          <section className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-2xl font-semibold text-stone-950">Thông tin đặt chỗ</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-500">Mã đặt chỗ</span>
                <span className="font-semibold text-red-600">{booking.pnr}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-500">Họ</span>
                <span className="font-semibold text-stone-950">{booking.lastName || '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-500">Tổng số hành khách</span>
                <span className="font-semibold text-stone-950">{booking.totalPassengers}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenDetails}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Chi tiết đặt chỗ
            </button>
          </section>

          {primaryFlight ? (
            <section className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50/65 to-white p-5 shadow-sm">
              <h3 className="text-2xl font-semibold text-amber-900">Các chuyến bay đã check-in</h3>
              <div className="mt-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-100 bg-white text-red-600 shadow-sm">
                  <Plane className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[1.7rem] font-semibold leading-none text-stone-950">
                    {primaryFlight.flightNumber}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-base font-semibold text-stone-900">
                    <span>{primaryFlight.departureCode}</span>
                    <span className="text-stone-400">-&gt;</span>
                    <span>{primaryFlight.arrivalCode}</span>
                  </div>
                  <div className="mt-1.5 text-[0.95rem] leading-5 text-stone-600">
                    {primaryFlight.departureTime} - {primaryFlight.arrivalTime} • {primaryFlight.shortDate}
                  </div>
                </div>
              </div>
              {confirmedFlights.length > 1 ? (
                <div className="mt-4 space-y-3 border-t border-amber-100 pt-4">
                  {confirmedFlights.slice(1).map((flight) => (
                    <div
                      key={flight.id}
                      className="rounded-2xl border border-amber-100 bg-white/80 px-4 py-3"
                    >
                      <div className="text-base font-semibold text-stone-950">
                        {flight.flightNumber}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-stone-800">
                        <span>{flight.departureCode}</span>
                        <span className="text-stone-400">-&gt;</span>
                        <span>{flight.arrivalCode}</span>
                      </div>
                      <div className="mt-1 text-sm text-stone-600">
                        {flight.departureTime} - {flight.arrivalTime} • {flight.shortDate}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <EnhancedCheckinSidebar
            booking={booking}
            flight={primaryFlight}
            onOpenDetails={onOpenDetails}
          />
        </div>
      </div>

      <CheckinBenefitsStrip />
    </section>
  );
}

function SeatConfirmModal({
  open,
  seat,
  passengerName,
  flight,
  assigned,
  currentAssignedSeatNumber,
  loading,
  onClose,
  onConfirm,
  onCancelSeat,
}: SeatConfirmModalProps) {
  if (!open || !seat || !passengerName || !flight) return null;

  const seatPrice =
    seat.displayPrice?.text?.trim() ||
    (seat.extraPrice && seat.extraPrice > 0
      ? formatCurrency(seat.extraPrice, seat.currency ?? 'VND')
      : 'Free');

  const isOwnAssignedSeat = Boolean(assigned?.isYours);
  const isBlockedSeat = Boolean(assigned && !assigned.isYours);
  const isChangingSeat = !isBlockedSeat && !isOwnAssignedSeat && Boolean(currentAssignedSeatNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Xác nhận ghế
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-stone-950">Seat {seat.seatNumber}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng xác nhận ghế"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-stone-500">Hành khách</span>
            <span className="text-sm font-semibold text-stone-950">{passengerName}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-stone-500">Chuyến bay</span>
            <span className="text-sm font-semibold text-stone-950">{flight.flightNumber}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-stone-500">Chặng bay</span>
            <span className="text-sm font-semibold text-stone-950">
              {flight.departureCode} → {flight.arrivalCode}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-stone-500">Giá ghế</span>
            <span className="text-sm font-semibold text-stone-950">{seatPrice}</span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-stone-600">
          {isBlockedSeat
            ? 'Ghế này đang được gán cho hành khách khác. Vui lòng chọn ghế khác.'
            : isOwnAssignedSeat
              ? `Bạn đang giữ ghế ${seat.seatNumber} cho ${passengerName}.`
              : isChangingSeat
                ? `Xác nhận đổi từ ghế ${currentAssignedSeatNumber} sang ghế ${seat.seatNumber} cho ${passengerName}.`
                : `Xác nhận gán ghế ${seat.seatNumber} cho ${passengerName}.`}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 px-5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Đóng
          </button>
          {isBlockedSeat ? null : isOwnAssignedSeat ? (
            <button
              type="button"
              onClick={() => onCancelSeat(seat)}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Bỏ ghế này'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConfirm(seat)}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : isChangingSeat ? 'Xác nhận đổi ghế' : 'Xác nhận chọn ghế'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Checkin() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingLookup = useBookingStore((state) => state.bookingLookup);
  const lookupCriteria = useBookingStore((state) => state.lookupCriteria);
  const manageOptions = useBookingStore((state) => state.manageOptions);
  const setManageOptions = useBookingStore((state) => state.setManageOptions);
  const navState = (location.state as CheckinNavigationState | null) ?? null;
  const manageBookingId =
    manageOptions?.bookingId ?? bookingLookup?.booking?.bookingId ?? navState?.bookingId ?? null;

  const manageOptionsQuery = useQuery({
    queryKey: ['checkin-manage-options', manageBookingId],
    queryFn: () => bookingService.getManageOptions(manageBookingId as number),
    enabled: manageBookingId != null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (manageOptionsQuery.data) {
      setManageOptions(manageOptionsQuery.data);
    }
  }, [manageOptionsQuery.data, setManageOptions]);

  const flights = useMemo<DerivedFlight[]>(() => {
    if (manageOptions?.itineraries?.length) {
      return manageOptions.itineraries.map((itinerary, index) => ({
        id: String(itinerary.flightId),
        numericId: itinerary.flightId,
        flightNumber: itinerary.flightNumber,
        departureCode: itinerary.departureAirportCode,
        departureCity: itinerary.departureCity,
        departureTime: formatTime(itinerary.departureTime),
        departureTerminal: itinerary.departureTerminal,
        arrivalCode: itinerary.arrivalAirportCode,
        arrivalCity: itinerary.arrivalCity,
        arrivalTime: formatTime(itinerary.arrivalTime),
        arrivalTerminal: itinerary.arrivalTerminal,
        dateLabel: formatDateLabel(itinerary.departureTime),
        shortDate: formatShortDate(itinerary.departureTime),
        durationLabel: formatDuration(itinerary.departureTime, itinerary.arrivalTime),
        cabin: itinerary.fareName ?? itinerary.cabinClass ?? '',
        baggageHandKg: itinerary.baggageHandKg,
        segmentLabel: index === 0 ? 'Chặng đi' : index === 1 ? 'Chặng về' : `Chặng ${index + 1}`,
        journeyType: itinerary.journeyType,
        segmentStatus: itinerary.segmentStatus,
        checkInWindow: itinerary.checkInWindow,
      }));
    }

    if (bookingLookup?.itineraries?.length) {
      return bookingLookup.itineraries.map((itinerary, index) => ({
        id: String(itinerary.flightId),
        numericId: itinerary.flightId,
        flightNumber: itinerary.flightNumber,
        departureCode: itinerary.departureAirportCode,
        departureCity: itinerary.departureCity,
        departureTime: formatTime(itinerary.departureTime),
        departureTerminal: itinerary.departureTerminal,
        arrivalCode: itinerary.arrivalAirportCode,
        arrivalCity: itinerary.arrivalCity,
        arrivalTime: formatTime(itinerary.arrivalTime),
        arrivalTerminal: itinerary.arrivalTerminal,
        dateLabel: formatDateLabel(itinerary.departureTime),
        shortDate: formatShortDate(itinerary.departureTime),
        durationLabel: formatDuration(itinerary.departureTime, itinerary.arrivalTime),
        cabin: itinerary.fareName ?? itinerary.cabinClass ?? '',
        baggageHandKg: itinerary.fareBenefits?.baggageHandKg ?? null,
        segmentLabel: index === 0 ? 'Chặng đi' : index === 1 ? 'Chặng về' : `Chặng ${index + 1}`,
        journeyType: 'UNKNOWN',
        segmentStatus: 'BLOCKED',
        checkInWindow: {
          status: 'CLOSED',
          opensAt: itinerary.departureTime,
          closesAt: itinerary.departureTime,
          message: 'Manage options chưa sẵn sàng cho chuyến bay này.',
        },
      }));
    }

    return [];
  }, [bookingLookup?.itineraries, manageOptions?.itineraries]);

  const passengers = useMemo<DerivedPassenger[]>(() => {
    const segmentMapByPassenger = new Map<number, Record<string, DerivedPassengerSegment>>();
    for (const passenger of manageOptions?.passengers ?? []) {
      segmentMapByPassenger.set(
        passenger.passengerId,
        Object.fromEntries(
          (passenger.segments ?? []).map((segment) => [
            String(segment.flightId),
            {
              flightId: String(segment.flightId),
              eligible: segment.eligible,
              checkInStatus: segment.checkInStatus,
              seatAssigned: segment.seatAssigned,
              seatNumber: segment.seatNumber,
              warnings: segment.warnings,
            },
          ])
        )
      );
    }

    if (!manageOptions?.passengers?.length) {
      for (const passenger of bookingLookup?.passengers ?? []) {
        const fallbackSegments =
          passenger.segments?.map((segment) => [
            String(segment.flightId),
            {
              flightId: String(segment.flightId),
              eligible: segment.eligible,
              checkInStatus: segment.checkInStatus,
              seatAssigned: segment.seatAssigned,
              seatNumber: segment.seatNumber,
              warnings: segment.warnings,
            } satisfies DerivedPassengerSegment,
          ]) ?? [];
        if (fallbackSegments.length > 0) {
          segmentMapByPassenger.set(
            passenger.passengerId,
            Object.fromEntries(fallbackSegments)
          );
        }
      }
    }

    return (
      bookingLookup?.passengers?.map((passenger) => ({
        id: String(passenger.passengerId),
        name: formatDisplayName(passenger.lastName, passenger.firstName),
        type: passenger.passengerType,
        dob: passenger.dateOfBirth,
        segments: segmentMapByPassenger.get(passenger.passengerId) ?? {},
      })) ?? []
    );
  }, [bookingLookup?.passengers, manageOptions?.passengers]);

  const booking = useMemo<CheckinBookingSummary>(
    () => ({
      pnr: lookupCriteria?.pnrCode ?? bookingLookup?.booking?.pnrCode ?? navState?.pnrCode ?? '',
      lastName: lookupCriteria?.lastName ?? navState?.lastName ?? '',
      totalPassengers: passengers.length,
      expiresAt: bookingLookup?.booking?.expiresAt ?? navState?.expiresAt ?? null,
    }),
    [
      lookupCriteria?.lastName,
      lookupCriteria?.pnrCode,
      bookingLookup?.booking?.expiresAt,
      bookingLookup?.booking?.pnrCode,
      navState?.expiresAt,
      navState?.lastName,
      navState?.pnrCode,
      passengers.length,
    ]
  );

  const bookingDetail = useMemo(
    () => buildBookingDetailModalData(bookingLookup, manageOptions, lookupCriteria?.pnrCode ?? ''),
    [bookingLookup, lookupCriteria?.pnrCode, manageOptions]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedFlights, setSelectedFlights] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeSeatPassengerId, setActiveSeatPassengerId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);
  const [showSeatConfirmModal, setShowSeatConfirmModal] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<CheckInConfirmResponse | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);

  useEffect(() => {
    if (!showBookingDetail) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowBookingDetail(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showBookingDetail]);

  useEffect(() => {
    setSelectedFlights((prev) => {
      const validIds = new Set(flights.map((flight) => flight.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size > 0) return next;
      const firstOpen = flights.find((flight) => flight.checkInWindow.status === 'OPEN');
      if (firstOpen) return new Set([firstOpen.id]);
      return flights[0] ? new Set([flights[0].id]) : new Set();
    });
  }, [flights]);

  const primaryFlight = flights.find((flight) => selectedFlights.has(flight.id)) ?? flights[0] ?? null;
  const activeFlightItinerary = manageOptions?.itineraries?.find(
    (itinerary) => String(itinerary.flightId) === primaryFlight?.id
  );
  const seatMapFlightId = activeFlightItinerary?.flightId ?? primaryFlight?.numericId ?? null;
  const seatMapFareId = activeFlightItinerary?.fareId ?? null;
  const confirmationData = useMemo(
    () => buildCheckinConfirmationData(flights, passengers, selectedFlights, selected, manageOptions),
    [flights, manageOptions, passengers, selected, selectedFlights]
  );

  useEffect(() => {
    if (!primaryFlight) return;
    setSelected((prev) => {
      const next = new Set<string>();
      for (const passengerId of prev) {
        if (passengers.find((passenger) => passenger.id === passengerId)?.segments[primaryFlight.id]?.eligible) {
          next.add(passengerId);
        }
      }
      return next;
    });
  }, [passengers, primaryFlight]);

  useEffect(() => {
    setSubmitError(null);
  }, [currentStep, selected, selectedFlights]);

  useEffect(() => {
    if (!primaryFlight || currentStep !== 3) return;
    const selectedPassengers = passengers.filter(
      (passenger) => selected.has(passenger.id) && passenger.segments[primaryFlight.id]
    );
    if (selectedPassengers.length === 0) {
      setActiveSeatPassengerId(null);
      return;
    }
    if (selectedPassengers.some((passenger) => passenger.id === activeSeatPassengerId)) return;
    const firstWithoutSeat =
      selectedPassengers.find((passenger) => !passenger.segments[primaryFlight.id]?.seatAssigned) ??
      selectedPassengers[0];
    setActiveSeatPassengerId(firstWithoutSeat.id);
  }, [activeSeatPassengerId, currentStep, passengers, primaryFlight, selected]);

  useEffect(() => {
    setSelectedSeat(null);
    setShowSeatConfirmModal(false);
  }, [activeSeatPassengerId, primaryFlight?.id]);

  const activeSeatPassengerNumericId = activeSeatPassengerId ? Number(activeSeatPassengerId) : null;

  const assignedSeatBySeatId = useMemo(() => {
    const assignments = manageOptions?.seatAssignments ?? [];
    const next = new Map<number, { label: string; isYours: boolean }>();
    for (const assignment of assignments) {
      if (String(assignment.flightId) !== primaryFlight?.id) continue;
      const passenger = passengers.find((item) => Number(item.id) === assignment.passengerId);
      const label = passenger ? passenger.name.split(' ')[0] ?? passenger.name : 'Đã chọn';
      next.set(assignment.seatId, {
        label,
        isYours: activeSeatPassengerNumericId != null && assignment.passengerId === activeSeatPassengerNumericId,
      });
    }
    return next;
  }, [activeSeatPassengerNumericId, manageOptions?.seatAssignments, passengers, primaryFlight?.id]);

  const seatMapQuery = useQuery({
    queryKey: ['checkin-seat-map', seatMapFlightId, seatMapFareId],
    queryFn: () => flightService.getSeatMap(seatMapFlightId as number, seatMapFareId as number),
    enabled: currentStep === 3 && seatMapFlightId != null && seatMapFareId != null,
    staleTime: 60_000,
  });

  const assignSeatMutation = useMutation({
    mutationFn: (vars: { bookingId: number; passengerId: number; seatId: number }) =>
      bookingService.putSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: async () => {
      setShowSeatConfirmModal(false);
      if (manageBookingId != null) {
        const refreshed = await bookingService.getManageOptions(manageBookingId);
        setManageOptions(refreshed);
      }
    },
  });

  const changeSeatMutation = useMutation({
    mutationFn: (vars: {
      bookingId: number;
      passengerId: number;
      fromSeatId: number;
      toSeatId?: number | null;
    }) =>
      bookingService.patchSeatAssignment(vars.bookingId, {
        passengerId: vars.passengerId,
        fromSeatId: vars.fromSeatId,
        toSeatId: vars.toSeatId ?? null,
      }),
    onSuccess: async () => {
      setShowSeatConfirmModal(false);
      if (manageBookingId != null) {
        const refreshed = await bookingService.getManageOptions(manageBookingId);
        setManageOptions(refreshed);
      }
    },
  });

  const cancelSeatMutation = useMutation({
    mutationFn: (vars: { bookingId: number; passengerId: number; seatId: number }) =>
      bookingService.deleteSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: async () => {
      setShowSeatConfirmModal(false);
      if (manageBookingId != null) {
        const refreshed = await bookingService.getManageOptions(manageBookingId);
        setManageOptions(refreshed);
      }
    },
  });

  const activeSeatPassenger =
    passengers.find((passenger) => passenger.id === activeSeatPassengerId) ?? null;
  const activePassengerSeatAssignment =
    manageOptions?.seatAssignments.find(
      (assignment) =>
        assignment.passengerId === activeSeatPassengerNumericId &&
        String(assignment.flightId) === primaryFlight?.id
    ) ?? null;
  const activeSelectedSeatAssigned =
    selectedSeat && assignedSeatBySeatId ? (assignedSeatBySeatId.get(selectedSeat.seatId) ?? null) : null;

  function togglePassenger(id: string) {
    if (!primaryFlight) return;
    const segment = passengers.find((passenger) => passenger.id === id)?.segments[primaryFlight.id];
    if (!segment?.eligible) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFlight(id: string) {
    const flight = flights.find((item) => item.id === id);
    if (!flight || flight.checkInWindow.status !== 'OPEN') return;
    setSelectedFlights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const seatMapError =
    seatMapFlightId == null || seatMapFareId == null
      ? 'Không tìm thấy dữ liệu chuyến bay để tải sơ đồ ghế.'
      : seatMapQuery.error instanceof Error
        ? seatMapQuery.error.message
        : seatMapQuery.isError
          ? 'Không thể tải sơ đồ ghế lúc này.'
          : null;

  function handleSeatPreview(seat: SeatSelectionValue) {
    setSelectedSeat(seat);
    const assignedMeta = assignedSeatBySeatId?.get(seat.seatId) ?? null;
    if (assignedMeta && !assignedMeta.isYours) {
      setShowSeatConfirmModal(false);
      return;
    }
    setShowSeatConfirmModal(true);
  }

  function handleSeatConfirm(seat: SeatSelectionValue) {
    setSelectedSeat(seat);
    if (manageBookingId == null || activeSeatPassengerNumericId == null) return;
    const fromSeatId = activePassengerSeatAssignment?.seatId;
    if (fromSeatId == null) {
      assignSeatMutation.mutate({
        bookingId: manageBookingId,
        passengerId: activeSeatPassengerNumericId,
        seatId: seat.seatId,
      });
      return;
    }
    changeSeatMutation.mutate({
      bookingId: manageBookingId,
      passengerId: activeSeatPassengerNumericId,
      fromSeatId,
      toSeatId: seat.seatId,
    });
  }

  function handleSeatCancel(seat: SeatSelectionValue) {
    setSelectedSeat(seat);
    if (manageBookingId == null || activeSeatPassengerNumericId == null) return;
    cancelSeatMutation.mutate({
      bookingId: manageBookingId,
      passengerId: activeSeatPassengerNumericId,
      seatId: seat.seatId,
    });
  }

  function handleGoToConfirmationStep() {
    if (!booking.pnr || !booking.lastName) {
      setSubmitError('Thiáº¿u thÃ´ng tin PNR hoáº·c há» Ä‘á»ƒ tiáº¿p tá»¥c check-in.');
      return;
    }

    if (selectedFlights.size === 0) {
      setSubmitError('ChÆ°a chá»n chuyáº¿n bay Ä‘á»ƒ tiáº¿p tá»¥c check-in.');
      return;
    }

    const segments = buildCheckInSegments(selectedFlights, selected, passengers);
    if (segments.length === 0) {
      setSubmitError('ChÆ°a cÃ³ hÃ nh khÃ¡ch Ä‘á»§ Ä‘iá»u kiá»‡n cho cÃ¡c chuyáº¿n bay Ä‘Ã£ chá»n.');
      return;
    }

    const selectedPassengers = primaryFlight
      ? passengers.filter(
          (passenger) => selected.has(passenger.id) && passenger.segments[primaryFlight.id]?.eligible
        )
      : [];
    const hasMissingSeats = primaryFlight
      ? selectedPassengers.some((passenger) => !passenger.segments[primaryFlight.id]?.seatAssigned)
      : false;

    if (hasMissingSeats) {
      setSubmitError(
        'Má»™t sá»‘ hÃ nh khÃ¡ch cÃ²n thiáº¿u gháº¿. HÃ£y hoÃ n táº¥t chá»n gháº¿ trÆ°á»›c khi tiáº¿p tá»¥c.'
      );
      return;
    }

    setSubmitError(null);
    setCurrentStep(4);
  }

  async function handleConfirmCheckIn() {
    if (!booking.pnr || !booking.lastName) {
      setSubmitError('Thiáº¿u thÃ´ng tin PNR hoáº·c há» Ä‘á»ƒ tiáº¿p tá»¥c check-in.');
      return;
    }

    const segments = buildCheckInSegments(selectedFlights, selected, passengers);
    if (segments.length === 0) {
      setSubmitError('ChÆ°a cÃ³ hÃ nh khÃ¡ch Ä‘á»§ Ä‘iá»u kiá»‡n cho cÃ¡c chuyáº¿n bay Ä‘Ã£ chá»n.');
      return;
    }

    setSubmitError(null);
    setCheckingIn(true);
    try {
      const response = await bookingService.confirmCheckIn({
        pnrCode: booking.pnr,
        lastName: booking.lastName,
        segments,
      });
      if (response.summary.confirmedPassengers > 0) {
        setCheckinSuccess(response);
        return;
      }
      if (response.summary.confirmedPassengers < 0) {
        setSubmitError('Má»™t sá»‘ hÃ nh khÃ¡ch cÃ²n thiáº¿u gháº¿. HÃ£y hoÃ n táº¥t chá»n gháº¿ trÆ°á»›c khi tiáº¿p tá»¥c.');
        return;
      }
      setSubmitError('Backend tá»« chá»‘i bÆ°á»›c tiáº¿p tá»¥c check-in do cÃ²n hÃ nh khÃ¡ch hoáº·c chuyáº¿n bay bá»‹ cháº·n.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ tiáº¿p tá»¥c check-in.');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleContinueCheckIn() {
    if (!booking.pnr || !booking.lastName) {
      setSubmitError('Thiếu thông tin PNR hoặc họ để tiếp tục check-in.');
      return;
    }

    const segments = [...selectedFlights]
      .map((flightId) => {
        const passengerIds = [...selected]
          .map(Number)
          .filter((passengerId) => {
            const passenger = passengers.find((item) => item.id === String(passengerId));
            return passenger?.segments[flightId]?.eligible;
          });
        return { flightId: Number(flightId), passengerIds };
      })
      .filter((segment) => segment.passengerIds.length > 0);

    if (segments.length === 0) {
      setSubmitError('Chưa có hành khách đủ điều kiện cho các chuyến bay đã chọn.');
      return;
    }

    setSubmitError(null);
    setCheckingIn(true);
    try {
      const response = await bookingService.continueCheckIn({
        pnrCode: booking.pnr,
        lastName: booking.lastName,
        segments,
      });
      if (response.actions.allowConfirmCheckIn) {
        setCurrentStep(4);
        return;
      }
      if (response.actions.allowSeatSelection) {
        setSubmitError('Một số hành khách còn thiếu ghế. Hãy hoàn tất chọn ghế trước khi tiếp tục.');
        return;
      }
      setSubmitError('Backend từ chối bước tiếp tục check-in do còn hành khách hoặc chuyến bay bị chặn.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể tiếp tục check-in.');
    } finally {
      setCheckingIn(false);
    }
  }

  if (manageOptionsQuery.isLoading && !manageOptions) {
    return (
      <div className="min-h-screen bg-[#faf8f4] text-stone-900 antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-4 text-stone-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải dữ liệu check-in...
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!bookingLookup || passengers.length === 0) {
    return (
      <div className="min-h-screen bg-[#faf8f4] text-stone-900 antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="w-full rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Chưa có dữ liệu booking</h1>
            <p className="mt-3 text-base leading-7 text-stone-600">
              Quay lại trang quản lý đặt chỗ và tìm booking trước khi tiếp tục check-in.
            </p>
            <button
              type="button"
              onClick={() => navigate('/manage-booking')}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
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
    <div className="min-h-screen bg-[#faf8f4] text-stone-900 antialiased">
      <SiteHeader />
      <main className="mx-auto min-h-svh max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        {checkinSuccess ? (
          <CheckinSuccessExperience
            booking={booking}
            flights={flights}
            response={checkinSuccess}
            onOpenDetails={() => setShowBookingDetail(true)}
          />
        ) : (
          <>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_256px] xl:grid-cols-[minmax(0,1.05fr)_272px]">
              <div className="min-w-0">
                {currentStep === 1 ? (
                  <FlightSelectionList
                    flights={flights}
                    selectedFlights={selectedFlights}
                    onToggleFlight={toggleFlight}
                    onContinue={() => setCurrentStep(2)}
                  />
                ) : currentStep === 2 ? (
                  <EnhancedPassengerSelectionPanel
                    passengers={passengers}
                    selected={selected}
                    onToggle={togglePassenger}
                    onToggleAll={() => {
                      if (!primaryFlight) return;
                      const eligibleIds = passengers
                        .filter((passenger) => passenger.segments[primaryFlight.id]?.eligible)
                        .map((passenger) => passenger.id);
                      if (eligibleIds.every((id) => selected.has(id))) {
                        setSelected(new Set());
                      } else {
                        setSelected(new Set(eligibleIds));
                      }
                    }}
                    flight={primaryFlight as DerivedFlight}
                    onBack={() => setCurrentStep(1)}
                    onContinue={() => {
                      setSelectedSeat(null);
                      setCurrentStep(3);
                    }}
                    submitError={submitError}
                  />
                ) : currentStep === 3 ? (
                  <CheckinSeatReviewPanel
                    passengers={passengers}
                    selected={selected}
                    flight={primaryFlight as DerivedFlight}
                    onBack={() => setCurrentStep(2)}
                    onContinue={handleContinueCheckIn}
                    submitError={submitError}
                    seatMapLoading={seatMapQuery.isPending}
                    seatMapError={seatMapError}
                    seatMap={seatMapQuery.data ?? null}
                    selectedSeat={selectedSeat}
                    assignedSeatBySeatId={assignedSeatBySeatId}
                    seatConfirmLoading={
                      assignSeatMutation.isPending ||
                      changeSeatMutation.isPending ||
                      cancelSeatMutation.isPending
                    }
                    activePassengerId={activeSeatPassengerId}
                    onActivePassengerChange={setActiveSeatPassengerId}
                    onSeatPreview={handleSeatPreview}
                    onSeatConfirm={handleSeatConfirm}
                    onSeatCancel={handleSeatCancel}
                  />
                ) : (
                  <CheckinConfirmationPanel
                    confirmation={confirmationData}
                    submitError={submitError}
                    checkingIn={checkingIn}
                    onBack={() => setCurrentStep(3)}
                    onConfirm={handleConfirmCheckIn}
                  />
                )}
              </div>

              <EnhancedCheckinSidebar
                booking={booking}
                flight={primaryFlight}
                onOpenDetails={() => setShowBookingDetail(true)}
              />
            </div>

            <CheckinBenefitsStrip />
            <BookingDetailModal
              detail={bookingDetail}
              open={showBookingDetail}
              onClose={() => setShowBookingDetail(false)}
              onContinueCheckin={() => {
                setShowBookingDetail(false);
                setCurrentStep(1);
              }}
              onOpenManageBooking={() => navigate('/manage-booking')}
            />
            <SeatConfirmModal
              open={showSeatConfirmModal}
              seat={selectedSeat}
              passengerName={activeSeatPassenger?.name ?? null}
              flight={primaryFlight}
              assigned={activeSelectedSeatAssigned}
              currentAssignedSeatNumber={activePassengerSeatAssignment?.seatNumber ?? null}
              loading={
                assignSeatMutation.isPending ||
                changeSeatMutation.isPending ||
                cancelSeatMutation.isPending
              }
              onClose={() => setShowSeatConfirmModal(false)}
              onConfirm={handleSeatConfirm}
              onCancelSeat={handleSeatCancel}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
