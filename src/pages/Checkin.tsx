import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AircraftSeatsMap, {
  type SeatSelectionValue,
  DetailPanel,
  findSeatCellById,
  buildSelection,
} from '../components/booking/AircraftSeatsMap';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import { bookingService, resolveManageBookingRouteSeed } from '../services/booking.service';
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

interface SeatFlightProgress {
  flightId: string;
  eligibleCount: number;
  missingCount: number;
  complete: boolean;
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

const NOTES = [
  'Online check-in generally opens 24 to 48 hours before departure and closes 40 to 60 minutes before.',
  'After checking in, passengers must still arrive on time at the security checkpoint and boarding gate.',
  'Carry-on and checked baggage allowances remain according to your ticket conditions.',
];

const BENEFITS = [
  {
    icon: CheckCircle2,
    title: 'Save time',
    desc: 'No need to queue at the airport check-in counters.',
  },
  {
    icon: Ticket,
    title: 'Clear check-in status',
    desc: 'Know immediately which flights are open for check-in and eligible passengers.',
  },
  {
    icon: Briefcase,
    title: 'Check seating',
    desc: 'Detect seat selection requirements early before continuing.',
  },
  {
    icon: ClipboardList,
    title: 'Prepare confirmation step',
    desc: 'Create standard payload for backend check-in continuation.',
  },
];

const CHECKIN_STEPS = [
  { id: 1, label: 'Choose flight' },
  { id: 2, label: 'Choose passengers' },
  { id: 3, label: 'Confirm conditions' },
];

const CHECKIN_STEP_ITEMS = [
  { id: 1, label: 'Choose flight' },
  { id: 2, label: 'Choose passengers' },
  { id: 3, label: 'Choose seats' },
  { id: 4, label: 'Confirm information' },
  { id: 5, label: 'Get boarding pass' },
];

const CHECKIN_BENEFITS = [
  {
    icon: CheckCircle2,
    title: 'Save time',
    desc: 'No need to queue at the airport check-in counters.',
  },
  {
    icon: Armchair,
    title: 'Choose preferred seats',
    desc: 'Quickly navigate to seat selection when passengers have no assigned seats.',
  },
  {
    icon: Briefcase,
    title: 'Be more proactive',
    desc: 'You can check in anytime, anywhere.',
  },
  {
    icon: Ticket,
    title: 'Boarding pass',
    desc: 'Get your boarding pass and head straight to the gate.',
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
  if (/^nhà ga/i.test(trimmed)) {
    return trimmed.replace(/^nhà ga\s*/i, 'Terminal ');
  }
  return `Terminal ${trimmed}`;
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
  if (!value) return 'Unknown';
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
      return 'Adult';
    case 'CHILD':
      return 'Child';
    case 'INFANT':
      return 'Infant';
    default:
      return type;
  }
}

function formatCheckInStatusLabel(status: string): string {
  switch (status) {
    case 'READY':
      return 'Ready for check-in';
    case 'SEAT_SELECTION_REQUIRED':
      return 'Seat selection required';
    case 'ALREADY_CHECKED_IN':
      return 'Checked in';
    case 'CHECKIN_NOT_OPEN':
      return 'Check-in not open';
    case 'CHECKIN_CLOSED':
      return 'Check-in closed';
    case 'BOOKING_NOT_CONFIRMED':
      return 'Booking not confirmed';
    case 'TICKET_NOT_ISSUED':
      return 'Ticket not issued';
    case 'TICKET_NOT_FOUND':
      return 'Ticket not found';
    default:
      return status;
  }
}

function formatWindowStatusLabel(status: FlightWindowStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Check-in open';
    case 'NOT_OPEN':
      return 'Check-in not open';
    case 'CLOSED':
      return 'Check-in closed';
    default:
      return status;
  }
}

function formatWindowMessage(flight: DerivedFlight): string {
  if (flight.checkInWindow.status === 'OPEN') {
    return 'You can proceed to select passengers for this flight.';
  }
  if (flight.checkInWindow.status === 'NOT_OPEN') {
    return `Opens at ${formatTime(flight.checkInWindow.opensAt)} ${formatShortDate(flight.checkInWindow.opensAt)}.`;
  }
  return `Closes at ${formatTime(flight.checkInWindow.closesAt)} ${formatShortDate(flight.checkInWindow.closesAt)}.`;
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
  const rawName = service.serviceName?.trim() || service.optionName?.trim() || 'Services';
  const quantity = service.quantity && service.quantity > 1 ? ` x${service.quantity}` : '';

  if (rawType.includes('MEAL') || rawName.toLowerCase().includes('meal')) {
    return `Meal: ${rawName}${quantity}`;
  }
  if (rawType.includes('BAG') || rawName.toLowerCase().includes('bag')) {
    return `Baggage: ${rawName}${quantity}`;
  }
  return `${rawName}${quantity}`;
}

function formatPassengerStatus(segments: Array<{ checkInStatus: string }> | undefined): string {
  if (!segments?.length) return 'Confirmed';
  if (segments.every((segment) => segment.checkInStatus === 'ALREADY_CHECKED_IN')) {
    return 'Checked in';
  }
  if (
    segments.some((segment) =>
      ['READY', 'SEAT_SELECTION_REQUIRED', 'ALREADY_CHECKED_IN'].includes(segment.checkInStatus)
    )
  ) {
    return 'Confirmed';
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
      const passengerIds = [...selectedPassengers].map(Number).filter((passengerId) => {
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
    { key: 'baggage', label: 'Checked baggage', items: [] },
    { key: 'meal', label: 'Meal', items: [] },
    { key: 'insurance', label: 'Insurance', items: [] },
    { key: 'other', label: 'Other services', items: [] },
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
  const selectedPassengerItems = passengers.filter((passenger) =>
    selectedPassengerIds.has(passenger.id)
  );
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
          return `${flight.segmentLabel}: ${segment?.seatNumber ?? 'No seat selected'}`;
        }),
        handBaggageLabels: selectedFlightItems.map((flight) => {
          const baggage =
            typeof flight.baggageHandKg === 'number' ? `${flight.baggageHandKg}kg` : '--';
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
    (manageOptions?.itineraries ?? []).map((itinerary, index) => [
      itinerary.flightId,
      { itinerary, index },
    ])
  );
  const manageSegmentsByPassengerId = new Map(
    (manageOptions?.passengers ?? []).map((passenger) => [
      passenger.passengerId,
      passenger.segments ?? [],
    ])
  );
  const seatAssignmentsByPassengerId = new Map<
    number,
    Array<{ flightId: number; seatNumber: string }>
  >();
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
        ? 'Outbound'
        : managed?.index === 1 || index === 1
          ? 'Return'
          : `Segment ${index + 1}`;

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
          : 'Unknown',
    } satisfies BookingDetailFlightItem;
  });

  const passengers = bookingLookup.passengers.map((passenger, index) => {
    const managedSegments =
      manageSegmentsByPassengerId.get(passenger.passengerId) ?? passenger.segments ?? [];
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
        return `${flight.segmentLabel}: ${matchedSeat?.seatNumber ?? 'Not selected'}`;
      }),
      serviceLabels: serviceEntries.length
        ? serviceEntries.map(formatServiceLabel)
        : ['Services: Not selected'],
    } satisfies BookingDetailPassengerItem;
  });

  return {
    pnr: bookingLookup.booking.pnrCode || fallbackPnr,
    statusLabel:
      bookingLookup.booking.statusLabel || formatStatusText(bookingLookup.booking.status),
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
      <div className="flex min-w-max items-center gap-4 border-b border-luxury-gold/15 pb-4">
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
              {index < steps.length - 1 ? <div className="h-px w-10 bg-luxury-gold/20 md:w-16" /> : null}
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
  onBack,
}: {
  flights: DerivedFlight[];
  selectedFlights: Set<string>;
  onToggleFlight: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <section className="pb-6">
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">Online Check-in</h2>
      <CheckinStepper currentStepId={1} />

      <div className="glass-panel overflow-hidden rounded-[1.75rem] border border-luxury-gold/15 bg-white/95 shadow-[0_18px_50px_rgba(62,16,30,0.08)]">
        <div className="border-b border-luxury-gold/10 p-5">
          <h3 className="font-headline text-lg font-black text-midnight-burgundy">1. Choose flight to check-in</h3>
        </div>

        <div className="space-y-4 bg-surface-container-low/45 p-5">
          {flights.map((flight) => {
            const isSelected = selectedFlights.has(flight.id);
            const isCheckinOpen = flight.checkInWindow.status === 'OPEN';
            return (
              <article
                key={flight.id}
                role="button"
                tabIndex={isCheckinOpen ? 0 : -1}
                onClick={() => {
                  if (isCheckinOpen) onToggleFlight(flight.id);
                }}
                onKeyDown={(event) => {
                  if (!isCheckinOpen) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onToggleFlight(flight.id);
                  }
                }}
                className={`overflow-hidden rounded-[1.35rem] border bg-white transition-all ${
                  isSelected
                    ? 'border-luxury-gold/70 bg-[linear-gradient(180deg,rgba(212,175,55,0.06),rgba(255,255,255,0.98))] shadow-[0_16px_40px_rgba(125,6,51,0.08)]'
                    : 'border-outline-variant/25 hover:border-luxury-gold/35 hover:shadow-sm'
                } ${isCheckinOpen ? 'cursor-pointer' : 'cursor-default'} `}
              >
                <div className="flex flex-col md:flex-row">
                  <div
                    className={`flex w-full items-start gap-3 border-b p-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r ${
                      isSelected
                        ? 'border-luxury-gold/15 bg-[linear-gradient(180deg,rgba(125,6,51,0.04),rgba(212,175,55,0.08))]'
                        : 'border-outline-variant/15 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFlight(flight.id);
                      }}
                      disabled={!isCheckinOpen}
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                          : !isCheckinOpen
                            ? 'cursor-not-allowed border-outline-variant/20 bg-surface-container-high text-on-surface-variant/45'
                            : 'border-outline-variant/50 bg-white text-transparent hover:border-midnight-burgundy/45'
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
                      <div className="font-headline text-[1.15rem] font-black text-on-surface">
                        {flight.flightNumber}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                        {flight.departureCode}
                        <ArrowRight className="h-3 w-3 text-on-surface-variant/60" />
                        {flight.arrivalCode}
                      </div>
                      <div className="mt-1.5 text-xs text-on-surface-variant">
                        {flight.departureTime} - {flight.arrivalTime}
                        {flight.shortDate ? ` • ${flight.shortDate}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-4 p-4 md:grid-cols-4">
                    <div className="flex flex-col text-sm">
                      <div className="mb-1 text-[11px] text-on-surface-variant">Departure</div>
                      <div className="text-base font-bold text-on-surface">
                        {flight.departureTime}
                      </div>
                      <div className="mt-0.5 font-semibold text-on-surface">
                        {flight.departureCode}
                      </div>
                      <div className="truncate text-[11px] text-on-surface-variant">
                        {flight.departureCity}
                      </div>
                      {formatTerminalLabel(flight.departureTerminal) ? (
                        <div className="mt-0.5 text-[11px] font-medium text-on-surface-variant">
                          {formatTerminalLabel(flight.departureTerminal)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-center justify-center px-2 text-center">
                      <Plane className="mb-1 h-5 w-5 shrink-0 text-luxury-gold" />
                      {flight.durationLabel ? (
                        <span className="whitespace-nowrap text-[11px] text-on-surface-variant">
                          {flight.durationLabel}
                        </span>
                      ) : null}
                      <span className="mt-1 text-[11px] text-on-surface-variant/70">{flight.journeyType}</span>
                    </div>

                    <div className="flex flex-col text-sm">
                      <div className="mb-1 text-[11px] text-on-surface-variant">Arrival</div>
                      <div className="text-base font-bold text-on-surface">{flight.arrivalTime}</div>
                      <div className="mt-0.5 font-semibold text-on-surface">
                        {flight.arrivalCode}
                      </div>
                      <div className="truncate text-[11px] text-on-surface-variant">
                        {flight.arrivalCity}
                      </div>
                      {formatTerminalLabel(flight.arrivalTerminal) ? (
                        <div className="mt-0.5 text-[11px] font-medium text-on-surface-variant">
                          {formatTerminalLabel(flight.arrivalTerminal)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col text-sm">
                      <div className="mb-1 text-[11px] text-on-surface-variant">Ticket class</div>
                      <div className="text-[11px] font-semibold text-on-surface">{flight.cabin}</div>
                      <div className="mb-1 mt-2 text-[11px] text-on-surface-variant">Status</div>
                      <div
                        className={`text-[11px] font-semibold ${
                          flight.segmentStatus === 'READY'
                            ? 'text-emerald-600'
                            : flight.segmentStatus === 'SEAT_SELECTION_REQUIRED'
                              ? 'text-amber-600'
                              : 'text-on-surface-variant'
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

        <div className="flex items-center justify-between border-t border-luxury-gold/10 p-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-midnight-burgundy/20 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/5"
          >
            Back
          </button>
          <button
            type="button"
            disabled={selectedFlights.size === 0}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue: Choose passengers ({selectedFlights.size} flights)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function _PassengerSelectionPanel({
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
  const eligiblePassengers = passengers.filter(
    (passenger) => passenger.segments[flight.id]?.eligible
  );
  const isAllSelected =
    eligiblePassengers.length > 0 &&
    eligiblePassengers.every((passenger) => selected.has(passenger.id));

  return (
    <section className="pb-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-stone-950">Online Check-in</h2>
      <CheckinStepper currentStepId={2} />

      <div className="rounded-[16px] border border-stone-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-stone-950">2. Choose passengers</h3>
            <div className="mt-2 flex items-center justify-between text-sm leading-6 text-stone-600">
              <p>
                Passenger status for flight{' '}
                <span className="font-semibold text-stone-900">
                  {flight.flightNumber} ({flight.departureCode} → {flight.arrivalCode})
                </span>{' '}
              </p>
              <button
                type="button"
                onClick={onToggleAll}
                className="font-semibold text-sky-600 transition hover:text-sky-700"
              >
                {isAllSelected ? 'Deselect eligible' : 'Select all eligible'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[760px] w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-stone-500">
                <th className="py-3 font-medium">Passenger</th>
                <th className="py-3 font-medium">Type</th>
                <th className="py-3 font-medium">Date of birth</th>
                <th className="py-3 font-medium">Seat</th>
                <th className="py-3 font-medium">Status</th>
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
                              ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                              : disabled
                                ? 'cursor-not-allowed border-stone-200 bg-stone-100'
                                : 'border-outline-variant/50 bg-white text-transparent hover:border-midnight-burgundy/45'
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-stone-950">
                            {passenger.name.toUpperCase()}
                          </p>
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
                        {segment?.seatNumber ?? 'Not selected'}
                      </div>
                    </td>
                    <td className="py-4">
                      <div
                        className={`font-semibold ${statusTone(segment?.checkInStatus ?? 'UNKNOWN')}`}
                      >
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
            Back
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || checkingIn}
            onClick={onCheckin}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checkingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Continue: Confirm conditions ({selected.size} passengers)
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
  const eligiblePassengers = passengers.filter(
    (passenger) => passenger.segments[flight.id]?.eligible
  );
  const isAllSelected =
    eligiblePassengers.length > 0 &&
    eligiblePassengers.every((passenger) => selected.has(passenger.id));
  const cabinBagLabel = `${flight.baggageHandKg ?? 7}kg`;

  return (
    <section className="pb-6">
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">Online Check-in</h2>
      <CheckinStepper currentStepId={2} />

      <div className="space-y-4">
        <div className="glass-panel rounded-[1.75rem] border border-luxury-gold/15 bg-white/95 p-5 shadow-[0_18px_50px_rgba(62,16,30,0.08)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-luxury-gold/10 pb-5">
            <div className="flex-1">
              <h3 className="font-headline text-[2rem] font-black tracking-tight text-on-surface">
                2. Choose passengers
              </h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Choose passengers you want to check in for flight:{' '}
                <span className="font-semibold text-on-surface">
                  {flight.flightNumber} ({flight.departureCode} → {flight.arrivalCode})
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleAll}
              className="inline-flex items-center rounded-full bg-midnight-burgundy/8 px-3 py-1.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-midnight-burgundy/12"
            >
              {isAllSelected ? 'Reselect' : 'Select all'}
            </button>
          </div>

          <div className="mt-5 overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[13px] md:text-sm">
              <thead>
                <tr className="border-b border-luxury-gold/10 text-on-surface-variant">
                  <th className="w-10 py-3 pr-2 font-medium" />
                  <th className="w-[30%] py-3 pr-3 font-medium">Passenger</th>
                  <th className="w-[18%] py-3 pr-3 font-medium">Passenger type</th>
                  <th className="w-[13%] py-3 pr-3 font-medium">Date of birth</th>
                  <th className="w-[16%] py-3 pr-3 font-medium">Carry-on baggage</th>
                  <th className="w-[23%] py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((passenger) => {
                  const segment = passenger.segments[flight.id];
                  const isSelected = selected.has(passenger.id);
                  const disabled = !segment?.eligible;

                  return (
                    <tr
                      key={passenger.id}
                      className={`border-b last:border-0 ${
                        isSelected
                          ? 'border-luxury-gold/12 bg-[linear-gradient(90deg,rgba(125,6,51,0.03),rgba(212,175,55,0.04),rgba(255,255,255,0.7))]'
                          : 'border-outline-variant/12'
                      }`}
                    >
                      <td className="py-4 pr-2 align-top">
                        <button
                          type="button"
                          onClick={() => onToggle(passenger.id)}
                          disabled={disabled}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                              : disabled
                                ? 'cursor-not-allowed border-outline-variant/20 bg-surface-container-high text-on-surface-variant/45'
                                : 'border-outline-variant/50 bg-white text-transparent hover:border-midnight-burgundy/45'
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                      </td>
                      <td className="py-4 pr-3 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(125,6,51,0.05),rgba(212,175,55,0.12))] text-midnight-burgundy">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-headline text-sm font-black text-on-surface md:text-[1.05rem]">
                              {passenger.name.toUpperCase()}
                            </p>
                            <p className="mt-0.5 break-words text-xs leading-5 text-on-surface-variant">
                              {formatShortDate(passenger.dob)} |{' '}
                              {formatPassengerTypeLabel(passenger.type)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-3 align-top text-on-surface-variant">
                        {formatPassengerTypeLabel(passenger.type)}
                      </td>
                      <td className="py-4 pr-3 align-top text-on-surface-variant">
                        {formatShortDate(passenger.dob)}
                      </td>
                      <td className="py-4 pr-3 align-top text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-luxury-gold" />
                          {cabinBagLabel}
                        </div>
                      </td>
                      <td className="py-4 align-top">
                        <div
                          className={`break-words font-semibold ${statusTone(segment?.checkInStatus ?? 'UNKNOWN')}`}
                        >
                          {formatCheckInStatusLabel(segment?.checkInStatus ?? 'UNKNOWN')}
                        </div>
                        {segment?.warnings?.length ? (
                          <div className="mt-1 break-words text-xs leading-5 text-on-surface-variant">
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
            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 bg-white px-6 py-3 text-sm font-semibold text-midnight-burgundy transition hover:border-midnight-burgundy/35 hover:bg-surface-container-low"
          >
            Back
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(125,6,51,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
            Continue: Choose seats ({selected.size} passengers)
          </button>
        </div>
      </div>
    </section>
  );
}

function CheckinSeatReviewPanel({
  passengers,
  selected,
  seatFlights,
  flightProgress,
  activeFlightId,
  onActiveFlightChange,
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
  canContinue,
  continueLabel,
}: {
  passengers: DerivedPassenger[];
  selected: Set<string>;
  seatFlights: DerivedFlight[];
  flightProgress: ReadonlyMap<string, SeatFlightProgress>;
  activeFlightId: string | null;
  onActiveFlightChange: (flightId: string) => void;
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
  canContinue: boolean;
  continueLabel: string;
}) {
  const selectedPassengers = passengers.filter(
    (passenger) => selected.has(passenger.id) && passenger.segments[flight.id]?.eligible
  );
  const missingSeatPassengers = selectedPassengers.filter(
    (passenger) => !passenger.segments[flight.id]?.seatAssigned
  );
  const hasMissingSeats = missingSeatPassengers.length > 0;
  const activePassenger =
    selectedPassengers.find((passenger) => passenger.id === activePassengerId) ??
    selectedPassengers[0] ??
    null;
  const activeSeatCell = findSeatCellById(seatMap, selectedSeat?.seatId);
  const activePanelAssigned =
    activeSeatCell && assignedSeatBySeatId
      ? (assignedSeatBySeatId.get(activeSeatCell.seatId) ?? null)
      : null;

  return (
    <section className="pb-6">
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">Online Check-in</h2>
      <CheckinStepper currentStepId={3} />

      <div className="space-y-4">
        <div className="glass-panel rounded-[1.75rem] border border-luxury-gold/15 bg-white/95 p-5 shadow-[0_18px_50px_rgba(62,16,30,0.08)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-luxury-gold/10 pb-5">
            <div className="flex-1">
              <h3 className="font-headline text-[2rem] font-black tracking-tight text-on-surface">3. Choose seats</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Select seats for chosen passengers on flight{' '}
                <span className="font-semibold text-on-surface">
                  {flight.flightNumber} ({flight.departureCode} → {flight.arrivalCode})
                </span>
                . Select a passenger on the right column, then select a seat directly on the map.
              </p>
            </div>
          </div>

          {seatFlights.length > 1 ? (
            <div className="mt-5 rounded-[1.35rem] border border-luxury-gold/15 bg-[linear-gradient(180deg,rgba(125,6,51,0.03),rgba(212,175,55,0.05),rgba(255,255,255,0.95))] p-3.5">
              <div className="mb-3">
                <p className="font-headline text-sm font-black text-on-surface">
                  Segments requiring seat selection
                </p>
                <p className="text-xs text-on-surface-variant">
                  Each segment has its own seat map. Complete each segment before proceeding to
                  confirmation.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {seatFlights.map((seatFlight, index) => {
                  const progress = flightProgress.get(seatFlight.id);
                  const isActiveFlight = seatFlight.id === activeFlightId;
                  return (
                    <button
                      key={seatFlight.id}
                      type="button"
                      onClick={() => onActiveFlightChange(seatFlight.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isActiveFlight
                          ? 'border-midnight-burgundy/35 bg-midnight-burgundy/6 shadow-sm'
                          : 'border-outline-variant/20 bg-white hover:border-luxury-gold/30 hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-midnight-burgundy">
                            Segment {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-on-surface">
                            {seatFlight.flightNumber} ({seatFlight.departureCode} →{' '}
                            {seatFlight.arrivalCode})
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {seatFlight.departureTime} - {seatFlight.arrivalTime} •{' '}
                            {seatFlight.shortDate}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            progress?.complete
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {progress?.complete
                            ? 'Seats complete'
                            : `Missing ${progress?.missingCount ?? 0}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1.18fr)_340px]">
            <div className="min-w-0 rounded-[1.35rem] border border-luxury-gold/15 bg-white/85 p-4">
              <AircraftSeatsMap
                seatMap={seatMap}
                loading={seatMapLoading}
                error={seatMapError}
                selectedSeat={selectedSeat}
                headerSubtitle={`${flight.flightNumber} | ${flight.departureCode} → ${flight.arrivalCode} | ${flight.departureTime} - ${flight.arrivalTime} | ${flight.shortDate}`}
                assignedSeatBySeatId={assignedSeatBySeatId}
                seatConfirmLoading={seatConfirmLoading}
                onSeatPreview={onSeatPreview}
                onSeatConfirm={onSeatConfirm}
                onSeatCancel={onSeatCancel}
                showDetailPanel={false}
                showSeatLegend
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.35rem] border border-luxury-gold/15 bg-white/88 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-headline text-lg font-black text-on-surface">
                    Applicable passenger ({selectedPassengers.length})
                  </h4>
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-sm font-semibold text-midnight-burgundy transition hover:text-midnight-burgundy/80"
                  >
                    Reselect passengers
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedPassengers.length > 0 ? (
                    selectedPassengers.map((passenger, index) => {
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
                              ? 'border-midnight-burgundy/35 bg-midnight-burgundy/6 shadow-sm'
                              : 'border-outline-variant/20 hover:border-luxury-gold/30 hover:bg-surface-container-low'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-headline text-sm font-black text-on-surface">
                                {index + 1}. {passenger.name.toUpperCase()}
                              </p>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {formatPassengerTypeLabel(passenger.type)}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                                seatAssigned
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-midnight-burgundy/8 text-midnight-burgundy'
                              }`}
                            >
                              {segment?.seatNumber ?? 'No seat selected'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                      No passengers need to select seats for this segment.
                    </div>
                  )}
                </div>

                {activePassenger ? (
                  <div className="mt-4 rounded-2xl border border-luxury-gold/12 bg-[linear-gradient(180deg,rgba(125,6,51,0.03),rgba(212,175,55,0.06))] px-4 py-3 text-sm text-on-surface-variant">
                    Operating for{' '}
                    <span className="font-semibold text-on-surface">{activePassenger.name}</span>.
                    Select a seat on the map to assign or change seat.
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.35rem] border border-luxury-gold/15 bg-white/88 p-4">
                {seatMap ? (
                  <DetailPanel
                    seatMap={seatMap}
                    seat={activeSeatCell}
                    assigned={activePanelAssigned}
                    confirmLoading={seatConfirmLoading}
                    onConfirm={(seat) => onSeatConfirm(buildSelection(seat))}
                    onCancel={(seat) => onSeatCancel(buildSelection(seat))}
                  />
                ) : (
                  <div className="text-sm text-on-surface-variant">
                    <p className="font-headline font-black text-on-surface">Seat pricing note</p>
                    <p className="mt-2">
                      Displayed price is for 1 passenger / 1 segment and may vary by flight.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasMissingSeats ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Remaining {missingSeatPassengers.length} passenger(s) without a seat. Please complete
              seat selection before confirming check-in information.
            </div>
          ) : null}

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
            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 bg-white px-6 py-3 text-sm font-semibold text-midnight-burgundy transition hover:border-midnight-burgundy/35 hover:bg-surface-container-low"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(125,6,51,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
            {continueLabel}
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
      <h2 className="mb-6 font-headline text-2xl font-black tracking-tight text-on-surface">Online Check-in</h2>
      <CheckinStepper currentStepId={4} />

      <div className="space-y-4">
        <div className="glass-panel rounded-[1.75rem] border border-luxury-gold/15 bg-white/95 p-5 shadow-[0_18px_50px_rgba(62,16,30,0.08)] md:p-6">
          <div className="border-b border-luxury-gold/10 pb-5">
            <h3 className="font-headline text-[2rem] font-black tracking-tight text-on-surface">
              4. Confirm information
            </h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Review flights, passengers, seats, and extra services before confirming check-in.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-[1.35rem] border border-luxury-gold/15 bg-white/88 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plane className="h-4 w-4 text-midnight-burgundy" />
                <h4 className="font-headline text-lg font-black text-on-surface">Flight information</h4>
              </div>
              <div className="space-y-3">
                {confirmation.flights.map((flight) => (
                  <article
                    key={flight.id}
                    className="grid gap-4 rounded-2xl border border-luxury-gold/12 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(212,175,55,0.04),rgba(255,255,255,0.95))] p-4 md:grid-cols-[1.1fr_0.9fr]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-on-surface">
                        {flight.segmentLabel} • {flight.flightNumber}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{flight.departureCode}</span>
                        <span>{flight.departureTime}</span>
                        <span className="text-on-surface-variant/50">{'->'}</span>
                        <span className="font-semibold text-on-surface">{flight.arrivalCode}</span>
                        <span>{flight.arrivalTime}</span>
                        <span>{flight.shortDate}</span>
                      </div>
                      <div className="mt-2 text-sm text-on-surface-variant">
                        {flight.departureCity}
                        {flight.departureTerminal
                          ? ` • ${formatTerminalLabel(flight.departureTerminal)}`
                          : ''}
                      </div>
                      <div className="text-sm text-on-surface-variant">
                        {flight.arrivalCity}
                        {flight.arrivalTerminal
                          ? ` • ${formatTerminalLabel(flight.arrivalTerminal)}`
                          : ''}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-on-surface-variant md:text-right">
                      <div>
                        Ticket class:{' '}
                        <span className="font-medium text-on-surface">{flight.cabin}</span>
                      </div>
                      <div>
                        Status:{' '}
                        <span className="font-medium text-emerald-700">
                          {formatCheckInStatusLabel(flight.segmentStatus)}
                        </span>
                      </div>
                      <div>
                        Flight duration:{' '}
                        <span className="font-medium text-on-surface">{flight.durationLabel}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-luxury-gold/15 bg-white/88 p-4">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-midnight-burgundy" />
                <h4 className="font-headline text-lg font-black text-on-surface">Passenger list and seats</h4>
              </div>
              <div className="space-y-3">
                {confirmation.passengers.map((passenger, index) => (
                  <article
                    key={passenger.id}
                    className="rounded-2xl border border-luxury-gold/12 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 border-b border-luxury-gold/10 pb-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(125,6,51,0.05),rgba(212,175,55,0.12))] text-sm font-semibold text-midnight-burgundy">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="font-semibold text-on-surface">{passenger.name}</div>
                          <div className="text-sm text-on-surface-variant">{passenger.typeLabel}</div>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {passenger.statusLabel}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/70">
                          Seats by segment
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {passenger.seatLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-luxury-gold/15 bg-surface-container-low px-3 py-1 text-sm text-on-surface-variant"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/70">
                          Carry-on baggage
                        </div>
                        <div className="mt-2 space-y-1.5 text-sm text-on-surface-variant">
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

            <section className="rounded-[1.35rem] border border-luxury-gold/15 bg-white/88 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-midnight-burgundy" />
                <h4 className="font-headline text-lg font-black text-on-surface">Additional information</h4>
              </div>
              <div className="space-y-3">
                {confirmation.passengers.map((passenger) => (
                  <article
                    key={passenger.id}
                    className="rounded-2xl border border-luxury-gold/12 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(212,175,55,0.04),rgba(255,255,255,0.95))] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-on-surface">{passenger.name}</div>
                        <div className="text-sm text-on-surface-variant">{passenger.typeLabel}</div>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-midnight-burgundy/70">
                        {passenger.serviceGroups.reduce(
                          (sum, group) => sum + group.items.length,
                          0
                        )}{' '}
                        services
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {passenger.serviceGroups.map((group) => (
                        <div
                          key={group.key}
                          className="rounded-2xl border border-luxury-gold/12 bg-white p-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/70">
                            {group.label}
                          </div>
                          <div className="mt-2 space-y-1.5 text-sm text-on-surface-variant">
                            {group.items.length ? (
                              group.items.map((item) => <div key={item}>{item}</div>)
                            ) : (
                              <div className="text-on-surface-variant/60">Not selected</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

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
            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 bg-white px-6 py-3 text-sm font-semibold text-midnight-burgundy transition hover:border-midnight-burgundy/35 hover:bg-surface-container-low"
          >
            Back
          </button>
          <button
            type="button"
            disabled={confirmation.passengers.length === 0 || checkingIn}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(125,6,51,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checkingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Confirm check-in
          </button>
        </div>
      </div>
    </section>
  );
}

function _CheckinSidebar({
  booking,
  flight: _flight,
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
        <h3 className="text-2xl font-semibold text-stone-950">Booking information</h3>
        <div className="mt-6 space-y-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Booking reference (PNR)</span>
            <span className="text-xl font-semibold text-red-600">{booking.pnr}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Last name</span>
            <span className="font-semibold uppercase text-stone-950">{booking.lastName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-500">Total passengers</span>
            <span className="font-semibold text-stone-950">{booking.totalPassengers}</span>
          </div>
          {booking.expiresAt ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-500">Hold until</span>
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
          Booking details
        </button>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-6">
        <h3 className="text-2xl font-semibold text-stone-950">Need help?</h3>
        <div className="mt-5 space-y-2">
          {[
            { icon: HelpCircle, label: 'Frequently Asked Questions' },
            { icon: Headphones, label: 'Contact support' },
            { icon: MessageSquare, label: 'Send feedback' },
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
  flights,
  onOpenDetails,
}: {
  booking: {
    pnr: string;
    lastName: string;
    totalPassengers: number;
    expiresAt: string | null;
  };
  flights: DerivedFlight[];
  onOpenDetails: () => void;
}) {
  return (
    <aside className="space-y-3 lg:max-w-[248px] xl:max-w-[256px] 2xl:max-w-[264px]">
      <section className="glass-panel rounded-[1.5rem] border border-luxury-gold/15 bg-white/95 p-3.5 shadow-[0_14px_36px_rgba(62,16,30,0.07)] xl:p-3.5">
        <div className="mb-3">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
            Booking summary
          </div>
          <h3 className="mt-1.5 font-headline text-[1.15rem] font-black tracking-tight text-on-surface">
            Booking information
          </h3>
        </div>
        <div className="space-y-2.5 text-[0.9rem] xl:text-[0.88rem]">
          <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-outline-variant/12 bg-surface-container-lowest px-3 py-2.5">
            <span className="text-on-surface-variant">Booking reference (PNR)</span>
            <span className="text-[0.98rem] font-black text-midnight-burgundy">
              {booking.pnr}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-outline-variant/12 bg-surface-container-lowest px-3 py-2.5">
            <span className="text-on-surface-variant">Last name</span>
            <span className="font-semibold uppercase text-on-surface">{booking.lastName}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-outline-variant/12 bg-surface-container-lowest px-3 py-2.5">
            <span className="text-on-surface-variant">Total passengers</span>
            <span className="font-semibold text-on-surface">{booking.totalPassengers}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[1.1rem] border border-luxury-gold/25 bg-white px-3 text-sm font-semibold text-midnight-burgundy transition hover:border-midnight-burgundy/35 hover:bg-surface-container-low"
        >
          <ClipboardList className="h-4 w-4" />
          Booking details
        </button>
      </section>

      {flights.length > 0 ? (
        <section className="rounded-[1.5rem] border border-luxury-gold/35 bg-gradient-to-br from-[rgba(212,175,55,0.10)] via-[rgba(255,255,255,0.95)] to-white p-3.5 shadow-[0_14px_36px_rgba(62,16,30,0.06)]">
          <h3 className="font-headline text-[1.15rem] font-black tracking-tight text-[#8a4a08]">
            Selected flight
          </h3>
          <div className="mt-3 space-y-2.5">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="flex items-start gap-2.5 rounded-[1.1rem] border border-luxury-gold/18 bg-white/88 p-3"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant/15 bg-white text-midnight-burgundy shadow-sm">
                  <Plane className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-headline text-[1rem] font-black leading-none text-on-surface">
                    {flight.flightNumber}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[0.95rem] font-semibold text-on-surface">
                    <span>{flight.departureCode}</span>
                    <span className="text-on-surface-variant/55">-&gt;</span>
                    <span>{flight.arrivalCode}</span>
                  </div>
                  <div className="mt-1 text-[0.86rem] leading-5 text-on-surface-variant">
                    {flight.departureTime} - {flight.arrivalTime} | {flight.shortDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-panel rounded-[1.5rem] border border-luxury-gold/15 bg-white/95 p-3.5 shadow-[0_14px_36px_rgba(62,16,30,0.07)] xl:p-3.5">
        <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
          Support
        </div>
        <h3 className="mt-1.5 font-headline text-[1.15rem] font-black tracking-tight text-on-surface">
          Need help?
        </h3>
        <div className="mt-2.5 space-y-0.5">
          {[
            { icon: HelpCircle, label: 'Frequently Asked Questions' },
            { icon: Headphones, label: 'Contact support' },
            { icon: MessageSquare, label: 'Send feedback' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center justify-between rounded-[1.1rem] border border-transparent px-2.5 py-2.5 text-left transition hover:border-luxury-gold/20 hover:bg-surface-container-low"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-[linear-gradient(180deg,rgba(125,6,51,0.05),rgba(212,175,55,0.12))] text-midnight-burgundy">
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[0.92rem] text-on-surface">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-on-surface-variant/55" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function CheckinBenefitsStrip() {
  return (
    <section className="mt-8 grid gap-4 border-t border-luxury-gold/12 pt-6 md:grid-cols-2 xl:grid-cols-4">
      {CHECKIN_BENEFITS.map((benefit) => (
        <article
          key={benefit.title}
          className="glass-panel rounded-[1.75rem] border border-luxury-gold/15 bg-white/92 p-5 shadow-[0_16px_40px_rgba(62,16,30,0.06)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(62,16,30,0.09)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(125,6,51,0.06),rgba(212,175,55,0.14))] text-midnight-burgundy">
            <benefit.icon className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-headline text-[1.15rem] font-black tracking-tight text-on-surface">
            {benefit.title}
          </h4>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">{benefit.desc}</p>
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-luxury-gold/15 bg-white shadow-[0_30px_90px_rgba(62,16,30,0.18)]">
        <div className="flex items-center justify-between border-b border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(255,255,255,0.98))] px-6 py-5 md:px-8">
          <div>
            <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
              Booking summary
            </div>
            <h3 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
              Booking details
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
            aria-label="Close booking details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto">
          {!detail ? (
            <div className="px-6 py-10 text-center md:px-8">
              <h4 className="font-headline text-xl font-black text-midnight-burgundy">
                Booking details are not available yet
              </h4>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                This usually means the check-in session has loaded, but the booking lookup data was not populated in the current store state.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenManageBooking}
                  className="inline-flex items-center justify-center rounded-xl border border-outline-variant/40 px-4 py-2.5 text-sm font-semibold text-midnight-burgundy transition hover:bg-surface-container-low"
                >
                  Back to Manage Booking
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl bg-midnight-burgundy px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="grid gap-4 border-b border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(212,175,55,0.05),rgba(255,255,255,0.98))] px-6 py-5 text-sm md:grid-cols-3 md:px-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant">PNR:</span>
                <span className="font-semibold text-on-surface">{detail.pnr}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant">Status:</span>
                <span className="font-semibold text-emerald-700">{detail.statusLabel}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant">Passenger:</span>
                <span className="font-semibold text-on-surface">{detail.totalPassengers}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant">Total amount:</span>
                <span className="font-semibold text-on-surface">{detail.totalAmountLabel}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-on-surface-variant">Contact</div>
              <div className="font-medium text-on-surface">
                {detail.contactLabel || 'No contact information'}
              </div>
            </div>
          </div>

          <section className="border-b border-luxury-gold/10 px-6 py-5 md:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-headline text-lg font-black text-on-surface">Itinerary</h4>
              <span className="text-xs uppercase tracking-[0.2em] text-midnight-burgundy/60">
                {detail.flights.length} segment(s)
              </span>
            </div>
            <div className="space-y-3">
              {detail.flights.map((flight) => (
                <article
                  key={flight.id}
                  className="rounded-2xl border border-luxury-gold/12 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(212,175,55,0.04),rgba(255,255,255,0.96))] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-on-surface">
                        {flight.segmentLabel} • {flight.dateLabel}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{flight.departureCode}</span>
                        <span>{flight.departureTime}</span>
                        <span className="text-on-surface-variant/50">{'->'}</span>
                        <span className="font-semibold text-on-surface">{flight.arrivalCode}</span>
                        <span>{flight.arrivalTime}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-midnight-burgundy">
                          {flight.flightNumber}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm md:text-right">
                      <div className="text-on-surface-variant">
                        Ticket class:{' '}
                        <span className="font-medium text-on-surface">{flight.cabinLabel}</span>
                      </div>
                      <div className="text-on-surface-variant">
                        Status:{' '}
                        <span className="font-medium text-on-surface">{flight.statusLabel}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="px-6 py-5 md:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-headline text-lg font-black text-on-surface">Passenger</h4>
              <span className="text-xs uppercase tracking-[0.2em] text-midnight-burgundy/60">
                {detail.passengers.length} passenger(s)
              </span>
            </div>
            <div className="space-y-3">
              {detail.passengers.map((passenger) => (
                <article
                  key={passenger.id}
                  className="rounded-2xl border border-luxury-gold/12 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-luxury-gold/10 pb-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(125,6,51,0.05),rgba(212,175,55,0.12))] text-sm font-semibold text-midnight-burgundy">
                        {passenger.orderLabel}
                      </span>
                      <div>
                        <div className="font-semibold text-on-surface">{passenger.name}</div>
                        <div className="text-sm text-on-surface-variant">{passenger.statusLabel}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {passenger.statusLabel}
                    </span>
                  </div>
                  <div className="grid gap-4 pt-3 md:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/70">
                        Seat by segment
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {passenger.seatLabels.map((seatLabel) => (
                          <span
                            key={seatLabel}
                            className="rounded-full border border-luxury-gold/15 bg-surface-container-low px-3 py-1 text-sm text-on-surface-variant"
                          >
                            {seatLabel}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/70">
                        Included services
                      </div>
                      <div className="mt-2 space-y-1.5 text-sm text-on-surface-variant">
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

          <div className="border-t border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(255,255,255,0.98))] px-6 py-5 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 px-5 py-3 text-sm font-semibold text-midnight-burgundy transition hover:border-midnight-burgundy/35 hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onContinueCheckin}
                className="inline-flex items-center justify-center rounded-2xl bg-midnight-burgundy px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Continue check-in
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenManageBooking}
              className="mt-4 text-sm font-medium text-midnight-burgundy transition hover:text-midnight-burgundy/80"
            >
              View full details in Manage Booking
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function _NotesAndBenefits() {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          Check-in ready
        </h2>
        <p className="mt-3 text-base leading-7 text-stone-600">
          The backend has confirmed the payload is valid for continuing check-in. This screen is
          still a placeholder before the final confirmation step and real boarding pass.
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
                {passenger.type} · Date of birth: {passenger.dob}
              </p>
              {flight ? (
                <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 text-sm">
                  <div>
                    <p className="text-stone-400">Flight</p>
                    <p className="mt-1 font-semibold text-stone-950">{flight.flightNumber}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Departure</p>
                    <p className="mt-1 font-semibold text-stone-950">{flight.departureTime}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Seat</p>
                    <p className="mt-1 font-semibold text-red-600">
                      {segment?.seatNumber ?? 'N/A'}
                    </p>
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
          Download boarding pass
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <Home className="h-4 w-4" />
          Back to home
        </button>
      </div>
    </section>
  );
}

function buildBoardingPassMatrix(seed: string, size = 29) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const reserved = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  function mark(row: number, col: number, filled: boolean) {
    if (row < 0 || row >= size || col < 0 || col >= size) return;
    matrix[row][col] = filled;
    reserved[row][col] = true;
  }

  function placeFinder(startRow: number, startCol: number) {
    for (let row = -1; row <= 7; row += 1) {
      for (let col = -1; col <= 7; col += 1) {
        const absoluteRow = startRow + row;
        const absoluteCol = startCol + col;
        if (absoluteRow < 0 || absoluteRow >= size || absoluteCol < 0 || absoluteCol >= size) {
          continue;
        }

        const isSeparator = row === -1 || row === 7 || col === -1 || col === 7;
        const isOuterRing = row === 0 || row === 6 || col === 0 || col === 6;
        const isInnerCore = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        mark(absoluteRow, absoluteCol, !isSeparator && (isOuterRing || isInnerCore));
      }
    }
  }

  function placeAlignment(centerRow: number, centerCol: number) {
    for (let row = -2; row <= 2; row += 1) {
      for (let col = -2; col <= 2; col += 1) {
        const distance = Math.max(Math.abs(row), Math.abs(col));
        mark(centerRow + row, centerCol + col, distance === 2 || distance === 0);
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let index = 8; index < size - 8; index += 1) {
    mark(6, index, index % 2 === 0);
    mark(index, 6, index % 2 === 0);
  }

  placeAlignment(size - 7, size - 7);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (reserved[row][col]) continue;

      hash ^= row * 197 + col * 263 + (row % 3) * 17 + (col % 5) * 29;
      hash = Math.imul(hash, 16777619);

      const noiseBit = ((hash >>> 0) & 1) === 1;
      const maskBit = ((row + col) % 3 === 0) !== ((row * col) % 2 === 0);
      matrix[row][col] = noiseBit !== maskBit;
    }
  }

  return matrix;
}

function BoardingPassCode({ value }: { value: string }) {
  const cells = useMemo(() => buildBoardingPassMatrix(value), [value]);
  const size = cells.length;

  return (
    <div className="rounded-xl border border-luxury-gold/15 bg-white p-2.5 shadow-sm">
      <div
        className="grid aspect-square w-[112px] overflow-hidden rounded-[6px] border border-black/8 bg-white p-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        aria-label="Boarding pass code"
      >
        {cells.flatMap((row, rowIndex) =>
          row.map((filled, colIndex) => (
            <span
              key={`${rowIndex}-${colIndex}`}
              className={filled ? 'bg-black' : 'bg-white'}
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
                seatNumber: boardingPass.seatLabel ?? passenger.seatNumber ?? 'Not updated',
                gate: boardingPass.gate ?? 'Updating',
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
        <div className="min-w-0 rounded-[32px] border border-luxury-gold/15 bg-white/96 p-6 shadow-[0_20px_60px_rgba(62,16,30,0.08)] sm:p-8">
          <CheckinStepper currentStepId={5} />
          <section className="mt-6 overflow-hidden rounded-[24px] border border-luxury-gold/15 bg-white">
            <div className="flex flex-col gap-4 border-b border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(255,255,255,0.98))] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-headline text-[1.85rem] font-black tracking-tight text-on-surface">
                    Check-in successful!
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Thank you for checking in online. Here is your boarding pass.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 bg-white px-4 py-2.5 text-sm font-medium text-midnight-burgundy transition hover:border-midnight-burgundy/30 hover:bg-surface-container-low"
                >
                  <Mail className="h-4 w-4" />
                  Send via email
                </button>
              </div>
            </div>

            <div className="space-y-6 px-4 py-4 sm:px-5 sm:py-5">
              {flightGroups.map((group, groupIndex) => (
                <section key={group.flight.id} className="space-y-3">
                  <div className="flex flex-col gap-3 border-b border-luxury-gold/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-on-surface">
                        <Plane className="h-4 w-4 text-midnight-burgundy" />
                        <span>
                          Flight {groupIndex + 1}: {group.flight.flightNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[1.1rem] font-semibold text-on-surface">
                        <span>{group.flight.departureCode}</span>
                        <ArrowRight className="h-4 w-4 text-on-surface-variant/50" />
                        <span>{group.flight.arrivalCode}</span>
                      </div>
                      <div className="text-on-surface-variant">
                        {group.flight.departureTime} - {group.flight.arrivalTime}
                      </div>
                      <div className="text-on-surface-variant">{group.flight.shortDate}</div>
                    </div>

                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Checked in
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.passengers.map((card) => (
                      <article
                        key={card.id}
                        className="overflow-hidden rounded-[16px] border border-luxury-gold/15 bg-white shadow-[0_10px_30px_rgba(62,16,30,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(255,255,255,0.96))] px-4 pb-3 pt-3.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-luxury-gold">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-midnight-burgundy text-luxury-gold">
                                <Plane className="h-3.5 w-3.5" />
                              </span>
                              <div className="leading-none">
                                <div className="font-headline text-[0.8rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
                                  The Sovereign
                                </div>
                                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-on-surface-variant/65">
                                  Boarding Pass
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 text-[1.02rem] font-semibold uppercase text-on-surface">
                              {card.passengerName}
                            </div>
                            <div className="mt-2 text-xs text-on-surface-variant">Seat</div>
                            <div className="mt-1 text-[1.9rem] font-semibold leading-none text-midnight-burgundy">
                              {card.seatNumber}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end">
                            <span
                              hidden
                              aria-hidden="true"
                              className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                            >
                              Checked in
                            </span>
                            <BoardingPassCode value={card.qrCode} />
                          </div>
                        </div>

                        <div className="border-t border-luxury-gold/10 px-4 py-3">
                          <div className="flex items-center gap-3 text-on-surface">
                            <span className="text-[1.55rem] font-semibold">
                              {group.flight.departureCode}
                            </span>
                            <ArrowRight className="h-4 w-4 text-on-surface-variant/50" />
                            <span className="text-[1.55rem] font-semibold">
                              {group.flight.arrivalCode}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
                            <div>
                              <div className="text-on-surface-variant/65">Flight</div>
                              <div className="mt-1 font-semibold text-on-surface">
                                {group.flight.flightNumber}
                              </div>
                            </div>
                            <div>
                              <div className="text-on-surface-variant/65">Date</div>
                              <div className="mt-1 font-semibold text-on-surface">
                                {group.flight.shortDate}
                              </div>
                            </div>
                            <div>
                              <div className="text-on-surface-variant/65">Departure time</div>
                              <div className="mt-1 font-semibold text-on-surface">
                                {group.flight.departureTime}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-luxury-gold/10 pt-3 text-[13px]">
                            <div>
                              <div className="text-on-surface-variant/65">Gate</div>
                              <div className="mt-1 font-semibold text-on-surface">{card.gate}</div>
                            </div>
                            <div>
                              <div className="text-on-surface-variant/65">Boarding time</div>
                              <div className="mt-1 font-semibold text-on-surface">
                                {card.boardingTime}
                              </div>
                            </div>
                            <div>
                              <div className="text-on-surface-variant/65">SEQ</div>
                              <div className="mt-1 font-semibold text-on-surface">
                                {card.sequenceNumber}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-luxury-gold/10 px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-2.5 text-sm font-medium text-midnight-burgundy transition hover:border-midnight-burgundy/30 hover:bg-surface-container-low"
              >
                <Home className="h-4 w-4" />
                Back to home
              </button>
              <button
                type="button"
                onClick={() => navigate('/manage-booking/check-in')}
                className="inline-flex items-center justify-center rounded-xl border border-outline-variant/30 px-4 py-2.5 text-sm font-medium text-midnight-burgundy transition hover:border-midnight-burgundy/30 hover:bg-surface-container-low"
              >
                Check in another flight
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-2.5 text-sm font-medium text-midnight-burgundy transition hover:border-midnight-burgundy/30 hover:bg-surface-container-low"
              >
                <Download className="h-4 w-4" />
                Download all (PDF)
              </button>
              <button
                type="button"
                onClick={() => navigate('/manage-booking')}
                className="inline-flex items-center justify-center rounded-xl bg-midnight-burgundy px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 sm:ml-auto"
              >
                Done
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-[24px] border border-luxury-gold/15 bg-[linear-gradient(180deg,rgba(125,6,51,0.02),rgba(212,175,55,0.07),rgba(255,255,255,0.96))] p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-midnight-burgundy" />
              <div>
                <h3 className="font-headline text-base font-black text-on-surface">Note before departure</h3>
                <div className="mt-2 space-y-1 text-sm leading-6 text-on-surface-variant">
                  <p>Arrive at the airport at least 90 minutes early for domestic flights.</p>
                  <p>Recheck your boarding gate on the airport screen as information may change.</p>
                  <p>
                    Prepare your identification and boarding pass before entering the security area.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <EnhancedCheckinSidebar
            booking={booking}
            flights={primaryFlight ? [primaryFlight] : []}
            onOpenDetails={onOpenDetails}
          />
        </div>
      </div>

      <CheckinBenefitsStrip />
    </section>
  );
}

export default function Checkin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId: routeBookingIdParam, flightId: routeFlightIdParam } = useParams<{
    bookingId?: string;
    flightId?: string;
  }>();
  const queryClient = useQueryClient();
  const bookingLookup = useBookingStore((state) => state.bookingLookup);
  const lookupCriteria = useBookingStore((state) => state.lookupCriteria);
  const manageOptions = useBookingStore((state) => state.manageOptions);
  const setManageOptions = useBookingStore((state) => state.setManageOptions);
  const setBookingLookup = useBookingStore((state) => state.setBookingLookup);
  const setLookupCriteria = useBookingStore((state) => state.setLookupCriteria);
  const routeSearch = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeSeed = useMemo(
    () => resolveManageBookingRouteSeed(routeBookingIdParam ?? null, routeSearch.get('pnr')),
    [routeBookingIdParam, routeSearch]
  );
  const routeBookingId = routeSeed?.bookingId ?? (routeBookingIdParam ? Number(routeBookingIdParam) : null);
  const routeFlightId = routeFlightIdParam ? Number(routeFlightIdParam) : routeSeed?.primaryFlightId ?? null;
  const routePnrCode = routeSearch.get('pnr') ?? routeSeed?.pnrCode ?? '';
  const routeLastName = routeSearch.get('lastName') ?? routeSeed?.lastName ?? '';
  const routeExpiresAt = routeSearch.get('expiresAt') ?? routeSeed?.expiresAt ?? null;
  const manageBookingId = routeBookingId ?? manageOptions?.bookingId ?? bookingLookup?.booking?.bookingId ?? null;

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

  useEffect(() => {
    if (!routePnrCode || !routeLastName) return;
    if (bookingLookup?.booking?.pnrCode === routePnrCode && bookingLookup.passengers.length > 0) {
      return;
    }

    void (async () => {
      try {
        const lookup = await bookingService.lookupBooking({
          pnrCode: routePnrCode,
          lastName: routeLastName,
        });
        setLookupCriteria({
          pnrCode: routePnrCode,
          lastName: routeLastName,
        });
        setBookingLookup(lookup);
      } catch {
        // Keep the screen functional from manage-options data even when lookup cannot be restored.
      }
    })();
  }, [
    bookingLookup?.booking?.pnrCode,
    bookingLookup?.passengers.length,
    routeLastName,
    routePnrCode,
    setBookingLookup,
    setLookupCriteria,
  ]);

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
        segmentLabel: index === 0 ? 'Outbound' : index === 1 ? 'Return' : `Segment ${index + 1}`,
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
        segmentLabel: index === 0 ? 'Outbound' : index === 1 ? 'Return' : `Segment ${index + 1}`,
        journeyType: 'UNKNOWN',
        segmentStatus: 'BLOCKED',
        checkInWindow: {
          status: 'CLOSED',
          opensAt: itinerary.departureTime,
          closesAt: itinerary.departureTime,
          message: 'Manage options are not ready for this flight.',
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
          segmentMapByPassenger.set(passenger.passengerId, Object.fromEntries(fallbackSegments));
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
      pnr: lookupCriteria?.pnrCode ?? bookingLookup?.booking?.pnrCode ?? routePnrCode ?? '',
      lastName: lookupCriteria?.lastName ?? routeLastName ?? '',
      totalPassengers: passengers.length,
      expiresAt: bookingLookup?.booking?.expiresAt ?? routeExpiresAt ?? null,
    }),
    [
      lookupCriteria?.lastName,
      lookupCriteria?.pnrCode,
      bookingLookup?.booking?.expiresAt,
      bookingLookup?.booking?.pnrCode,
      routeExpiresAt,
      routeLastName,
      routePnrCode,
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
  const [activeSeatFlightId, setActiveSeatFlightId] = useState<string | null>(null);
  const [activeSeatPassengerId, setActiveSeatPassengerId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);
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
      if (routeFlightId != null && validIds.has(String(routeFlightId))) {
        return new Set([String(routeFlightId)]);
      }
      const firstOpen = flights.find((flight) => flight.checkInWindow.status === 'OPEN');
      if (firstOpen) return new Set([firstOpen.id]);
      return flights[0] ? new Set([flights[0].id]) : new Set();
    });
  }, [flights, routeFlightId]);

  const selectedFlightItems = flights.filter((flight) => selectedFlights.has(flight.id));
  const primaryFlight = selectedFlightItems[0] ?? flights[0] ?? null;
  const seatFlowFlights = selectedFlightItems;
  const activeSeatFlight =
    seatFlowFlights.find((flight) => flight.id === activeSeatFlightId) ??
    seatFlowFlights[0] ??
    null;
  const activeFlightItinerary = manageOptions?.itineraries?.find(
    (itinerary) => String(itinerary.flightId) === activeSeatFlight?.id
  );
  const seatMapFlightId = activeFlightItinerary?.flightId ?? activeSeatFlight?.numericId ?? null;
  const seatMapFareId = activeFlightItinerary?.fareId ?? null;
  const confirmationData = useMemo(
    () =>
      buildCheckinConfirmationData(flights, passengers, selectedFlights, selected, manageOptions),
    [flights, manageOptions, passengers, selected, selectedFlights]
  );

  useEffect(() => {
    if (seatFlowFlights.length === 0) {
      setActiveSeatFlightId(null);
      return;
    }
    if (activeSeatFlightId && seatFlowFlights.some((flight) => flight.id === activeSeatFlightId))
      return;
    setActiveSeatFlightId(seatFlowFlights[0]?.id ?? null);
  }, [activeSeatFlightId, seatFlowFlights]);

  const seatFlightProgress = useMemo(() => {
    const progress = new Map<string, SeatFlightProgress>();
    for (const flight of seatFlowFlights) {
      const eligiblePassengers = passengers.filter(
        (passenger) => selected.has(passenger.id) && passenger.segments[flight.id]?.eligible
      );
      const missingCount = eligiblePassengers.filter(
        (passenger) => !passenger.segments[flight.id]?.seatAssigned
      ).length;
      progress.set(flight.id, {
        flightId: flight.id,
        eligibleCount: eligiblePassengers.length,
        missingCount,
        complete: missingCount === 0,
      });
    }
    return progress;
  }, [passengers, seatFlowFlights, selected]);

  useEffect(() => {
    if (selectedFlights.size === 0) return;
    setSelected((prev) => {
      const next = new Set<string>();
      if (prev.size === 0) {
        for (const passenger of passengers) {
          const eligibleForAnySelectedFlight = [...selectedFlights].some(
            (flightId) => passenger.segments[flightId]?.eligible
          );
          if (eligibleForAnySelectedFlight) {
            next.add(passenger.id);
          }
        }
        return next;
      }
      for (const passengerId of prev) {
        const passenger = passengers.find((item) => item.id === passengerId);
        const eligibleForAnySelectedFlight = [...selectedFlights].some(
          (flightId) => passenger?.segments[flightId]?.eligible
        );
        if (eligibleForAnySelectedFlight) {
          next.add(passengerId);
        }
      }
      return next;
    });
  }, [passengers, selectedFlights]);

  useEffect(() => {
    setSubmitError(null);
  }, [currentStep, selected, selectedFlights]);

  useEffect(() => {
    if (!activeSeatFlight || currentStep !== 3) return;
    const selectedPassengers = passengers.filter(
      (passenger) => selected.has(passenger.id) && passenger.segments[activeSeatFlight.id]?.eligible
    );
    if (selectedPassengers.length === 0) {
      setActiveSeatPassengerId(null);
      return;
    }
    if (selectedPassengers.some((passenger) => passenger.id === activeSeatPassengerId)) return;
    const firstWithoutSeat =
      selectedPassengers.find(
        (passenger) => !passenger.segments[activeSeatFlight.id]?.seatAssigned
      ) ?? selectedPassengers[0];
    setActiveSeatPassengerId(firstWithoutSeat.id);
  }, [activeSeatFlight, activeSeatPassengerId, currentStep, passengers, selected]);

  useEffect(() => {
    setSelectedSeat(null);
  }, [activeSeatFlight?.id, activeSeatPassengerId]);

  const activeSeatPassengerNumericId = activeSeatPassengerId ? Number(activeSeatPassengerId) : null;

  const assignedSeatBySeatId = useMemo(() => {
    const assignments = manageOptions?.seatAssignments ?? [];
    const next = new Map<number, { label: string; isYours: boolean }>();
    for (const assignment of assignments) {
      if (String(assignment.flightId) !== activeSeatFlight?.id) continue;
      const isYours =
        activeSeatPassengerNumericId != null &&
        assignment.passengerId === activeSeatPassengerNumericId;
      next.set(assignment.seatId, {
        label: isYours ? 'Selected' : 'Held',
        isYours,
      });
    }
    return next;
  }, [activeSeatFlight?.id, activeSeatPassengerNumericId, manageOptions?.seatAssignments]);

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
      await queryClient.invalidateQueries({ queryKey: ['checkin-seat-map'] });
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
      await queryClient.invalidateQueries({ queryKey: ['checkin-seat-map'] });
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
      await queryClient.invalidateQueries({ queryKey: ['checkin-seat-map'] });
      if (manageBookingId != null) {
        const refreshed = await bookingService.getManageOptions(manageBookingId);
        setManageOptions(refreshed);
      }
    },
  });

  const _activeSeatPassenger =
    passengers.find((passenger) => passenger.id === activeSeatPassengerId) ?? null;
  const activePassengerSeatAssignment =
    manageOptions?.seatAssignments.find(
      (assignment) =>
        assignment.passengerId === activeSeatPassengerNumericId &&
        String(assignment.flightId) === activeSeatFlight?.id
    ) ?? null;
  const _activeSelectedSeatAssigned =
    selectedSeat && assignedSeatBySeatId
      ? (assignedSeatBySeatId.get(selectedSeat.seatId) ?? null)
      : null;

  function togglePassenger(id: string) {
    const passenger = passengers.find((item) => item.id === id);
    const eligibleForAnySelectedFlight = [...selectedFlights].some(
      (flightId) => passenger?.segments[flightId]?.eligible
    );
    if (!eligibleForAnySelectedFlight) return;
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
      ? 'Unable to find flight data to load the seat map.'
      : seatMapQuery.error instanceof Error
        ? seatMapQuery.error.message
        : seatMapQuery.isError
          ? 'Unable to load the seat map right now.'
          : null;

  function handleSeatPreview(seat: SeatSelectionValue) {
    setSelectedSeat(seat);
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

  const activeSeatFlightIndex = activeSeatFlight
    ? seatFlowFlights.findIndex((flight) => flight.id === activeSeatFlight.id)
    : -1;
  const nextIncompleteSeatFlight =
    seatFlowFlights.find(
      (flight) =>
        flight.id !== activeSeatFlight?.id &&
        !(seatFlightProgress.get(flight.id)?.complete ?? false)
    ) ?? null;
  const allSeatRequirementsMet = seatFlowFlights.every(
    (flight) => seatFlightProgress.get(flight.id)?.complete ?? false
  );
  const canContinueSeatReview =
    activeSeatFlight != null &&
    ((seatFlightProgress.get(activeSeatFlight.id)?.complete ?? false) ||
      (seatFlightProgress.get(activeSeatFlight.id)?.eligibleCount ?? 0) === 0);
  const seatReviewContinueLabel =
    nextIncompleteSeatFlight != null
      ? `Continue: Select seat ${nextIncompleteSeatFlight.flightNumber}`
      : activeSeatFlightIndex >= 0 && activeSeatFlightIndex < seatFlowFlights.length - 1
        ? `Continue: Select seat for segment ${activeSeatFlightIndex + 2}`
        : 'Continue: Confirm information';

  function _handleGoToConfirmationStep() {
    if (!booking.pnr || !booking.lastName) {
      setSubmitError('Missing PNR or Last Name information to continue check-in.');
      return;
    }

    if (selectedFlights.size === 0) {
      setSubmitError('No flight selected to continue check-in.');
      return;
    }

    const segments = buildCheckInSegments(selectedFlights, selected, passengers);
    if (segments.length === 0) {
      setSubmitError('No eligible passengers for the selected flights.');
      return;
    }

    if (!allSeatRequirementsMet) {
      setSubmitError(
        'Some passengers still need seats. Please complete seat selection before continuing.'
      );
      return;
    }

    setSubmitError(null);
    setCurrentStep(4);
  }

  async function handleConfirmCheckIn() {
    if (!booking.pnr || !booking.lastName) {
      setSubmitError('Missing PNR or Last Name information to continue check-in.');
      return;
    }

    const segments = buildCheckInSegments(selectedFlights, selected, passengers);
    if (segments.length === 0) {
      setSubmitError('No eligible passengers for the selected flights.');
      return;
    }

    if (!allSeatRequirementsMet) {
      setSubmitError(
        'Some passengers still need seats. Please complete seat selection before continuing.'
      );
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
        setSubmitError(
          'Some passengers still need seats. Please complete seat selection before continuing.'
        );
        return;
      }
      setSubmitError(
        'The backend rejected the check-in step because passengers or flights are blocked.'
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to continue check-in.');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleContinueCheckIn() {
    if (!booking.pnr || !booking.lastName) {
      setSubmitError('Missing PNR or Last Name information to continue check-in.');
      return;
    }

    if (!canContinueSeatReview) {
      setSubmitError('Please complete seat selection for the current segment before continuing.');
      return;
    }

    if (nextIncompleteSeatFlight) {
      setActiveSeatFlightId(nextIncompleteSeatFlight.id);
      setSubmitError(null);
      return;
    }

    const segments = [...selectedFlights]
      .map((flightId) => {
        const passengerIds = [...selected].map(Number).filter((passengerId) => {
          const passenger = passengers.find((item) => item.id === String(passengerId));
          return passenger?.segments[flightId]?.eligible;
        });
        return { flightId: Number(flightId), passengerIds };
      })
      .filter((segment) => segment.passengerIds.length > 0);

    if (segments.length === 0) {
      setSubmitError('No eligible passengers for the selected flights.');
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
        setSubmitError(
          'Some passengers still need seats. Please complete seat selection before continuing.'
        );
        return;
      }
      setSubmitError(
        'The backend rejected the check-in step because passengers or flights are blocked.'
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to continue check-in.');
    } finally {
      setCheckingIn(false);
    }
  }

  if (manageOptionsQuery.isLoading && !manageOptions) {
    return (
      <div className="min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-4 text-stone-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading check-in data...
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!bookingLookup || passengers.length === 0) {
    return (
      <div className="min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="mx-auto flex min-h-svh max-w-4xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="w-full rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              No booking data
            </h1>
            <p className="mt-3 text-base leading-7 text-stone-600">
              Return to Manage Booking and find a booking before continuing check-in.
            </p>
            <button
              type="button"
              onClick={() => navigate('/manage-booking')}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-midnight-burgundy px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
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
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="mx-auto min-h-svh w-full max-w-400 px-6 pb-16 pt-24 sm:pt-28 md:px-8">
        {!checkinSuccess ? (
          <div className="mb-8">
            <div className="mb-2 text-[0.72rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
              Online check-in
            </div>
            <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              Check in online
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Keep the same check-in content and steps, but with a clearer booking workspace and a consistent brand surface.
            </p>
          </div>
        ) : null}
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
                    onBack={() => navigate('/manage-booking')}
                    onContinue={() => setCurrentStep(2)}
                  />
                ) : currentStep === 2 ? (
                  <EnhancedPassengerSelectionPanel
                    passengers={passengers}
                    selected={selected}
                    onToggle={togglePassenger}
                    onToggleAll={() => {
                      const eligibleIds = passengers
                        .filter((passenger) =>
                          [...selectedFlights].some(
                            (flightId) => passenger.segments[flightId]?.eligible
                          )
                        )
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
                    seatFlights={seatFlowFlights}
                    flightProgress={seatFlightProgress}
                    activeFlightId={activeSeatFlight?.id ?? null}
                    onActiveFlightChange={setActiveSeatFlightId}
                    flight={(activeSeatFlight ?? primaryFlight) as DerivedFlight}
                    onBack={() => setCurrentStep(2)}
                    onContinue={handleContinueCheckIn}
                    canContinue={canContinueSeatReview}
                    continueLabel={seatReviewContinueLabel}
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
                flights={selectedFlightItems}
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
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
