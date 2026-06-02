import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PaymentCard from '../components/booking/PaymentCard';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import AircraftSeatsMap, {
  type AssignedSeatMeta,
  type SeatSelectionValue,
} from '../components/booking/AircraftSeatsMap';
import { useBookingStore } from '../stores/useBookingStore';
import { bookingService } from '../services/booking.service';
import { flightService } from '../services/flight.service';
import {
  cancelPayment,
  createSeatChangePaymentLink,
  getPaymentMethods,
  getPaymentStatus,
} from '../services/payment.service';
import {
  pickNumericId,
  resolveManageBookingId,
  resolvePassengerDisplayData,
} from './seat-selection/seatSelectionResolvers';
import { useSeatAssignmentActions } from './seat-selection/useSeatAssignmentActions';
import type {
  BookingManageOptionsResponse,
  SeatChangeConfirmResponse,
  SeatChangePreviewRequest,
  SeatChangePreviewResponse,
} from '../types/booking.types';
import type { PaymentMethod } from '../types/payment.types';
import type { CreatePaymentResponse, PaymentStatus } from '../types/payment-create.types';

type ItineraryItem = BookingManageOptionsResponse['itineraries'][number];
type ManagePassenger = BookingManageOptionsResponse['passengers'][number];

type OriginalAssignment = {
  flightId: number;
  passengerId: number;
  seatId: number;
  seatNumber: string;
  surchargeAmount: number;
  currency: string;
};

type SeatChangeDelta = {
  flightId: number;
  passengerId: number;
  passengerName: string;
  originalSeatNumber: string | null;
  originalSurcharge: number;
  currentSeatNumber: string | null;
  currentSurcharge: number;
  delta: number;
  changed: boolean;
  currency: string;
};

type ConfirmModalStage = 'preview' | 'payment' | 'result';

type ConfirmResultVariant =
  | 'saved'
  | 'refund_submitted'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'
  | 'error';

type SeatChangePaymentMethodKey = 'PAYOS' | 'STRIPE' | 'VIETQR';

type PaymentUiState = {
  activePayment: CreatePaymentResponse | null;
  creatingPayment: boolean;
  regeneratingPayment: boolean;
  checkingPaymentStatus: boolean;
  cancelingPayment: boolean;
  paymentStatusOverride: PaymentStatus | null;
  paymentError: string | null;
};

type SeatChangePaymentResultViewModel = {
  title: string;
  message: string;
  actionLabel: string;
  icon: 'success' | 'error' | 'warning';
};

type SeatChangePreviewCardItem = {
  key: string;
  passengerName: string;
  flightLabel: string;
  seatChangeLabel: string;
  surchargeLabel: string | null;
  delta: number;
};

type SeatChangeRedirectContext = {
  paymentId: number;
  amount: number;
  currency: string;
};

const SEAT_CHANGE_REDIRECT_CONTEXT_KEY = 'seat-change-payment-redirect-context';
type SeatChangeSettlementView = 'COLLECT_PAYMENT' | 'REFUND' | 'NONE';

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

function getSeatChangeSettlementType(netAmount: number | null | undefined): SeatChangeSettlementView {
  if ((netAmount ?? 0) > 0) return 'COLLECT_PAYMENT';
  if ((netAmount ?? 0) < 0) return 'REFUND';
  return 'NONE';
}

function storeSeatChangeRedirectContext(context: SeatChangeRedirectContext): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SEAT_CHANGE_REDIRECT_CONTEXT_KEY, JSON.stringify(context));
}

function readSeatChangeRedirectContext(): SeatChangeRedirectContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SEAT_CHANGE_REDIRECT_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SeatChangeRedirectContext;
  } catch {
    return null;
  }
}

function clearSeatChangeRedirectContext(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SEAT_CHANGE_REDIRECT_CONTEXT_KEY);
}

function formatFlightDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getPassengerTypeLabel(type: string | null | undefined): string {
  const t = (type ?? '').toUpperCase();
  if (t === 'ADULT') return 'ADULT';
  if (t === 'CHILD') return 'CHILD';
  if (t === 'INFANT') return 'INFANT';
  return 'PASSENGER';
}

function resolveDirectionLabel(
  itinerary: ItineraryItem,
  index: number
): { tag: 'OUTBOUND' | 'RETURN'; key: 'OUTBOUND' | 'INBOUND' } {
  const raw = String(itinerary.journeyType ?? '').toUpperCase();
  if (raw === 'INBOUND' || raw === 'RETURN') return { tag: 'RETURN', key: 'INBOUND' };
  if (raw === 'OUTBOUND') return { tag: 'OUTBOUND', key: 'OUTBOUND' };
  return index === 0 ? { tag: 'OUTBOUND', key: 'OUTBOUND' } : { tag: 'RETURN', key: 'INBOUND' };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    const msg = resp?.data?.error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getPreviewErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const response = (
      error as { response?: { status?: number; data?: { error?: { message?: string } } } }
    ).response;
    const message = response?.data?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (response?.status === 409) {
      return 'One or more seat changes are no longer valid. Please review the updated seat map.';
    }
    if (response?.status === 404) {
      return 'Booking or seat information could not be found. Please return to manage booking and try again.';
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to validate seat changes right now. Please try again.';
}

function _formatSeatChangeFlightLabel(itinerary: ItineraryItem | null | undefined): string {
  if (!itinerary) return '';
  const parts = [
    itinerary.flightNumber,
    `${itinerary.departureAirportCode} → ${itinerary.arrivalAirportCode}`,
    formatFlightDate(itinerary.departureTime),
  ].filter(Boolean);
  return parts.join(' · ');
}

function _formatSeatChangeSeatLabel(
  fromSeatNumber: string | null,
  toSeatNumber: string | null
): string {
  return `${fromSeatNumber ?? 'No seat'} → ${toSeatNumber ?? 'No seat'}`;
}
function formatSeatChangeFlightLabelSafe(itinerary: ItineraryItem | null | undefined): string {
  if (!itinerary) return '';
  const parts = [
    itinerary.flightNumber,
    `${itinerary.departureAirportCode} -> ${itinerary.arrivalAirportCode}`,
    formatFlightDate(itinerary.departureTime),
  ].filter(Boolean);
  return parts.join(' | ');
}

function _formatSeatChangeFlightLabelFromPreviewItem(
  item: SeatChangePreviewResponse['items'][number]
): string {
  const parts = [
    item.flightNumber,
    item.departureAirportCode && item.arrivalAirportCode
      ? `${item.departureAirportCode} -> ${item.arrivalAirportCode}`
      : null,
    formatFlightDate(item.departureTime),
  ].filter(Boolean);
  return parts.join(' | ');
}

function formatSeatChangeSeatLabelSafe(
  fromSeatNumber: string | null,
  toSeatNumber: string | null
): string {
  return `${fromSeatNumber ?? 'No seat'} -> ${toSeatNumber ?? 'No seat'}`;
}

function mapPaymentStatusToResultVariant(
  status: PaymentStatus | null | undefined
): ConfirmResultVariant | null {
  if (status === 'SUCCESS') return 'saved';
  if (status === 'FAILED') return 'payment_failed';
  if (status === 'CANCELLED' || status === 'CANCELED') return 'payment_cancelled';
  if (status === 'EXPIRED') return 'payment_expired';
  return null;
}

function buildSeatChangePaymentResultViewModel(
  variant: ConfirmResultVariant
): SeatChangePaymentResultViewModel | null {
  switch (variant) {
    case 'payment_failed':
      return {
        title: 'Payment failed',
        message:
          'We could not complete the additional payment. Your seat changes have not been finalized yet.',
        actionLabel: 'Try again',
        icon: 'error',
      };
    case 'payment_cancelled':
      return {
        title: 'Payment cancelled',
        message:
          'The payment was cancelled before completion. Your seat changes are still pending.',
        actionLabel: 'Choose another method',
        icon: 'warning',
      };
    case 'payment_expired':
      return {
        title: 'Payment expired',
        message: 'This payment code has expired. Please create a new payment to continue.',
        actionLabel: 'Create new payment',
        icon: 'warning',
      };
    case 'error':
      return {
        title: 'Could not verify payment',
        message:
          'We could not confirm the payment status right now. Please check again or choose another method.',
        actionLabel: 'Choose another method',
        icon: 'warning',
      };
    default:
      return null;
  }
}

function resolvePaymentMethodKey(method: PaymentMethod | null): SeatChangePaymentMethodKey {
  const provider = method?.provider?.trim().toUpperCase() ?? '';
  const code = method?.code?.trim().toUpperCase() ?? '';
  if (code.includes('VIETQR') || code.includes('QR')) return 'VIETQR';
  if (provider.includes('STRIPE') || code.includes('CARD')) return 'STRIPE';
  return 'PAYOS';
}

function resolvePaymentId(response: CreatePaymentResponse | null): number | null {
  if (!response) return null;
  return response.payment?.id ?? response.payment?.paymentId ?? null;
}

export default function ManageBookingSeatSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const manageOptions = useBookingStore((s) => s.manageOptions);
  const bookingLookup = useBookingStore((s) => s.bookingLookup);
  const bookingResponse = useBookingStore((s) => s.bookingResponse);
  const setManageOptions = useBookingStore((s) => s.setManageOptions);
  const applySeatAssignmentResult = useBookingStore((s) => s.applySeatAssignmentResult);

  const manageBookingId = resolveManageBookingId({ manageOptions, bookingLookup, bookingResponse });
  const [entryReady, setEntryReady] = useState(false);

  const redirectingRef = useRef(false);
  useEffect(() => {
    if (manageBookingId == null && !redirectingRef.current) {
      redirectingRef.current = true;
      toast.info('Please look up your booking first.');
      navigate('/manage-booking', { replace: true });
    }
  }, [manageBookingId, navigate]);

  useEffect(() => {
    if (manageBookingId == null) return;
    setManageOptions(null);
    originalAssignmentsRef.current = null;
    queryClient.removeQueries({ queryKey: ['manage-options', manageBookingId], exact: true });
    queryClient.removeQueries({ queryKey: ['seat-map'] });
    setEntryReady(true);
  }, [manageBookingId, queryClient, setManageOptions]);

  const manageOptionsQuery = useQuery({
    queryKey: ['manage-options', manageBookingId],
    queryFn: () => bookingService.getManageOptions(manageBookingId as number),
    enabled: entryReady && manageBookingId != null,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (manageOptionsQuery.data) setManageOptions(manageOptionsQuery.data);
  }, [manageOptionsQuery.data, setManageOptions]);

  const itineraries = useMemo<ItineraryItem[]>(
    () => manageOptions?.itineraries ?? [],
    [manageOptions?.itineraries]
  );
  const allPassengers = useMemo<ManagePassenger[]>(
    () => manageOptions?.passengers ?? [],
    [manageOptions?.passengers]
  );
  const allSeatAssignments = useMemo(
    () => manageOptions?.seatAssignments ?? [],
    [manageOptions?.seatAssignments]
  );

  const { passengers: passengerProfiles, passengerSource } = useMemo(
    () =>
      resolvePassengerDisplayData({
        isManageBookingFlow: true,
        bookingResponse: null,
        bookingLookup,
        manageOptions,
        navigationPassengers: null,
      }),
    [bookingLookup, manageOptions]
  );

  const [activeFlightId, setActiveFlightId] = useState<number | null>(null);
  const [activePassengerId, setActivePassengerId] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelectionValue | null>(null);

  useEffect(() => {
    if (activeFlightId == null && itineraries.length > 0) {
      setActiveFlightId(itineraries[0].flightId);
    }
  }, [activeFlightId, itineraries]);

  useEffect(() => {
    if (activePassengerId == null && allPassengers.length > 0) {
      setActivePassengerId(allPassengers[0].passengerId);
    }
  }, [activePassengerId, allPassengers]);

  useEffect(() => {
    setSelectedSeat(null);
  }, [activeFlightId, activePassengerId]);

  const activeItinerary = useMemo(
    () => itineraries.find((it) => it.flightId === activeFlightId) ?? null,
    [activeFlightId, itineraries]
  );

  const canLoadSeatMap = activeItinerary != null;
  const seatMapQuery = useQuery({
    queryKey: ['seat-map', activeItinerary?.flightId, activeItinerary?.fareId],
    queryFn: () =>
      flightService.getSeatMap(
        activeItinerary?.flightId as number,
        activeItinerary?.fareId as number
      ),
    enabled: canLoadSeatMap,
    staleTime: 60_000,
  });

  const { assignSeat, changeSeat, cancelSeat, isSeatMutationPending } = useSeatAssignmentActions({
    bookingResponse,
    isManageBookingFlow: true,
    applySeatAssignmentResult,
    currentFlightId: activeFlightId,
    refetchSeatMap: seatMapQuery.refetch,
    refetchManageOptions: manageOptionsQuery.refetch,
    getSeatAssignmentErrorMessage: getErrorMessage,
  });

  const seatAssignmentsForActiveFlight = useMemo(
    () => allSeatAssignments.filter((a) => a.flightId === activeFlightId),
    [allSeatAssignments, activeFlightId]
  );

  const assignmentForActivePassenger = useMemo(
    () => seatAssignmentsForActiveFlight.find((a) => a.passengerId === activePassengerId) ?? null,
    [seatAssignmentsForActiveFlight, activePassengerId]
  );

  const assignedSeatMetaBySeatId = useMemo(() => {
    const map = new Map<number, AssignedSeatMeta>();
    for (const a of allSeatAssignments) {
      if (!a.seatId || a.seatId <= 0) continue;
      if (a.flightId != null && a.flightId !== activeFlightId) continue;
      const isYours = activePassengerId != null && a.passengerId === activePassengerId;
      map.set(a.seatId, {
        label: isYours ? 'Your current seat' : 'Reserved',
        isYours,
        surchargeAmount: a.surchargeAmount,
        currency: a.currency,
      });
    }
    return map;
  }, [allSeatAssignments, activeFlightId, activePassengerId]);
  const selectedSeatAssignedMeta = useMemo(
    () => (selectedSeat ? (assignedSeatMetaBySeatId.get(selectedSeat.seatId) ?? null) : null),
    [assignedSeatMetaBySeatId, selectedSeat]
  );

  const currency = manageOptions?.currency ?? bookingLookup?.booking?.currency ?? 'VND';

  const originalAssignmentsRef = useRef<Map<string, OriginalAssignment> | null>(null);
  useEffect(() => {
    if (!manageOptions || originalAssignmentsRef.current != null) return;
    const map = new Map<string, OriginalAssignment>();
    for (const a of manageOptions.seatAssignments) {
      map.set(`${a.flightId}:${a.passengerId}`, {
        flightId: a.flightId,
        passengerId: a.passengerId,
        seatId: a.seatId,
        seatNumber: a.seatNumber,
        surchargeAmount: a.surchargeAmount,
        currency: a.currency,
      });
    }
    originalAssignmentsRef.current = map;
  }, [manageOptions]);

  const seatChangeDeltas = useMemo<SeatChangeDelta[]>(() => {
    const originals = originalAssignmentsRef.current ?? new Map<string, OriginalAssignment>();
    const keys = new Set<string>();
    for (const a of allSeatAssignments) keys.add(`${a.flightId}:${a.passengerId}`);
    for (const k of originals.keys()) keys.add(k);
    const result: SeatChangeDelta[] = [];
    for (const key of keys) {
      const [flightIdStr, passengerIdStr] = key.split(':');
      const flightId = Number(flightIdStr);
      const passengerId = Number(passengerIdStr);
      const original = originals.get(key) ?? null;
      const current =
        allSeatAssignments.find((a) => a.flightId === flightId && a.passengerId === passengerId) ??
        null;
      if (!original && !current) continue;
      const originalSurcharge = original?.surchargeAmount ?? 0;
      const currentSurcharge = current?.surchargeAmount ?? 0;
      const changed = original?.seatId !== current?.seatId;
      const passenger = allPassengers.find((p) => p.passengerId === passengerId);
      result.push({
        flightId,
        passengerId,
        passengerName: passenger
          ? [passenger.lastName, passenger.firstName].filter(Boolean).join(' ').trim()
          : `Passenger ${passengerId}`,
        originalSeatNumber: original?.seatNumber ?? null,
        originalSurcharge,
        currentSeatNumber: current?.seatNumber ?? null,
        currentSurcharge,
        delta: changed ? currentSurcharge - originalSurcharge : 0,
        changed,
        currency: current?.currency ?? original?.currency ?? currency,
      });
    }
    return result;
  }, [allSeatAssignments, allPassengers, currency]);

  const additionalChargesTotal = seatChangeDeltas.reduce((sum, d) => sum + Math.max(0, d.delta), 0);
  const refundsTotal = seatChangeDeltas.reduce((sum, d) => sum + Math.max(0, -d.delta), 0);
  const netAmount = additionalChargesTotal - refundsTotal;

  const totalSeatsRequired = allPassengers.length * itineraries.length;
  const totalSeatsPicked = allSeatAssignments.length;

  const buildSeatChangePreviewRequest = (): SeatChangePreviewRequest | null => {
    const originals = originalAssignmentsRef.current ?? new Map<string, OriginalAssignment>();
    const keys = new Set<string>();
    for (const key of originals.keys()) keys.add(key);
    for (const assignment of allSeatAssignments) {
      keys.add(`${assignment.flightId}:${assignment.passengerId}`);
    }

    const changes = Array.from(keys)
      .map((key) => {
        const [flightIdText, passengerIdText] = key.split(':');
        const flightId = Number(flightIdText);
        const passengerId = Number(passengerIdText);
        const original = originals.get(key) ?? null;
        const current =
          allSeatAssignments.find(
            (assignment) =>
              assignment.flightId === flightId && assignment.passengerId === passengerId
          ) ?? null;
        const fromSeatId = original?.seatId ?? null;
        const toSeatId = current?.seatId ?? null;
        if (fromSeatId === toSeatId) return null;
        return {
          passengerId,
          flightId,
          fromSeatId,
          toSeatId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    return changes.length > 0 ? { changes } : null;
  };

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalStage, setConfirmModalStage] = useState<ConfirmModalStage>('preview');
  const [previewPayload, setPreviewPayload] = useState<SeatChangePreviewRequest | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResponse, setPreviewResponse] = useState<SeatChangePreviewResponse | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmResponse, setConfirmResponse] = useState<SeatChangeConfirmResponse | null>(null);
  const [resultVariant, setResultVariant] = useState<ConfirmResultVariant>('saved');
  const [resultAmountOverride, setResultAmountOverride] = useState<number | null>(null);
  const [resultCurrencyOverride, setResultCurrencyOverride] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentUiState, setPaymentUiState] = useState<PaymentUiState>({
    activePayment: null,
    creatingPayment: false,
    regeneratingPayment: false,
    checkingPaymentStatus: false,
    cancelingPayment: false,
    paymentStatusOverride: null,
    paymentError: null,
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods', manageBookingId],
    queryFn: () => getPaymentMethods(manageBookingId as number, { onlySupported: true }),
    enabled:
      confirmModalOpen &&
      confirmModalStage === 'payment' &&
      manageBookingId != null &&
      (!confirmResponse?.paymentMethods || confirmResponse.paymentMethods.length === 0) &&
      previewResponse?.settlementType === 'COLLECT_PAYMENT',
    staleTime: 60_000,
  });

  const paymentMethods = useMemo<PaymentMethod[]>(() => {
    if (confirmResponse?.paymentMethods && confirmResponse.paymentMethods.length > 0) {
      return confirmResponse.paymentMethods
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
    return (
      paymentMethodsQuery.data?.groups
        .flatMap((group) => group.methods)
        .filter((method) => method.supported) ?? []
    );
  }, [confirmResponse?.paymentMethods, paymentMethodsQuery.data]);

  useEffect(() => {
    if (
      confirmModalOpen &&
      confirmModalStage === 'payment' &&
      !selectedPaymentMethod &&
      paymentMethods.length > 0
    ) {
      setSelectedPaymentMethod(paymentMethods[0]?.code ?? '');
    }
  }, [confirmModalOpen, confirmModalStage, paymentMethods, selectedPaymentMethod]);

  const assignInFlight = useRef(false);
  const handleSeatConfirm = (seat: SeatSelectionValue) => {
    if (manageBookingId == null || activePassengerId == null) return;
    if (assignInFlight.current) return;
    const passengerProfile = passengerProfiles.find(
      (_, i) => pickNumericId(passengerSource[i]?.passengerId) === activePassengerId
    );
    const passengerName = passengerProfile?.fullName?.trim() || `Passenger ${activePassengerId}`;
    assignInFlight.current = true;
    const fromSeatId = assignmentForActivePassenger?.seatId;
    const settled = () => {
      assignInFlight.current = false;
      setSelectedSeat(null);
    };
    if (fromSeatId != null) {
      changeSeat(
        {
          bookingId: manageBookingId,
          passengerId: activePassengerId,
          fromSeatId,
          toSeatId: seat.seatId,
          passengerName,
        },
        { onSettled: settled }
      );
    } else {
      assignSeat(
        {
          bookingId: manageBookingId,
          passengerId: activePassengerId,
          seatId: seat.seatId,
          passengerName,
        },
        { onSettled: settled }
      );
    }
  };

  const handleSeatCancel = () => {
    if (
      manageBookingId == null ||
      activePassengerId == null ||
      assignmentForActivePassenger?.seatId == null
    ) {
      return;
    }
    if (assignInFlight.current) return;
    const passengerProfile = passengerProfiles.find(
      (_, i) => pickNumericId(passengerSource[i]?.passengerId) === activePassengerId
    );
    const passengerName = passengerProfile?.fullName?.trim() || `Passenger ${activePassengerId}`;
    assignInFlight.current = true;
    cancelSeat(
      {
        bookingId: manageBookingId,
        passengerId: activePassengerId,
        seatId: assignmentForActivePassenger.seatId,
        passengerName,
      },
      {
        onSettled: () => {
          assignInFlight.current = false;
          setSelectedSeat(null);
        },
      }
    );
  };

  const pnr = bookingLookup?.booking?.pnrCode ?? '—';
  const statusLabel = bookingLookup?.booking?.statusLabel || 'Confirmed';

  const closeConfirmFlow = () => {
    setConfirmModalOpen(false);
    setConfirmModalStage('preview');
    setPreviewPayload(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewResponse(null);
    setConfirmSubmitting(false);
    setConfirmResponse(null);
    setResultVariant('saved');
    setResultAmountOverride(null);
    setResultCurrencyOverride(null);
    setSelectedPaymentMethod('');
    setPaymentUiState({
      activePayment: null,
      creatingPayment: false,
      regeneratingPayment: false,
      checkingPaymentStatus: false,
      cancelingPayment: false,
      paymentStatusOverride: null,
      paymentError: null,
    });
  };

  const loadSeatChangePreview = async (request: SeatChangePreviewRequest) => {
    if (manageBookingId == null) return;
    setPreviewPayload(request);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResponse(null);
    setConfirmModalStage('preview');
    try {
      const response = await bookingService.previewSeatChanges(manageBookingId, request);
      setPreviewResponse(response);
    } catch (error) {
      setPreviewError(getPreviewErrorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openConfirmPreview = () => {
    const request = buildSeatChangePreviewRequest();
    if (!request) return;
    setConfirmModalOpen(true);
    void loadSeatChangePreview(request);
  };

  const refreshConfirmPreview = () => {
    if (!previewPayload) return;
    void seatMapQuery.refetch();
    void loadSeatChangePreview(previewPayload);
  };

  const continueFromPreview = () => {
    if (!previewResponse || !previewPayload || manageBookingId == null) return;
    setConfirmSubmitting(true);
    setPreviewError(null);
    void bookingService
      .confirmSeatChanges(manageBookingId, {
        changes: previewPayload.changes,
        previewToken: previewResponse.previewToken,
        idempotencyKey: `seat-change-${manageBookingId}-${Date.now()}`,
        expectedAdditionalAmount: previewResponse.summary.additionalAmount,
        expectedRefundAmount: previewResponse.summary.refundAmount,
        expectedNetAmount: previewResponse.summary.netAmount,
      })
      .then((response) => {
        setConfirmResponse(response);
        const settlementType = getSeatChangeSettlementType(response.summary?.netAmount);
        if (settlementType === 'COLLECT_PAYMENT') {
          setConfirmModalStage('payment');
          return;
        }
        setResultVariant(settlementType === 'REFUND' ? 'refund_submitted' : 'saved');
        setConfirmModalStage('result');
      })
      .catch((error) => {
        setPreviewError(getPreviewErrorMessage(error));
      })
      .finally(() => {
        setConfirmSubmitting(false);
      });
  };

  const completeResultFlow = () => {
    const variant = resultVariant;
    closeConfirmFlow();
    if (variant === 'refund_submitted') toast.success('Refund initiated.');
    else if (
      variant === 'payment_failed' ||
      variant === 'payment_cancelled' ||
      variant === 'payment_expired' ||
      variant === 'error'
    ) {
      toast.error('Payment was not completed.');
    } else toast.success('Seat changes saved.');
    navigate('/manage-booking');
  };

  const openSeatChangeResult = useCallback(
    (
      variant: ConfirmResultVariant,
      overrides?: {
        amount?: number | null;
        currency?: string | null;
      }
    ) => {
      setConfirmModalOpen(true);
      setConfirmModalStage('result');
      setResultVariant(variant);
      setResultAmountOverride(overrides?.amount ?? null);
      setResultCurrencyOverride(overrides?.currency ?? null);
      setPaymentUiState((current) => ({
        ...current,
        activePayment: null,
        paymentError: null,
        paymentStatusOverride: null,
        checkingPaymentStatus: false,
        cancelingPayment: false,
        creatingPayment: false,
        regeneratingPayment: false,
      }));
    },
    []
  );

  const createSeatChangePayment = async () => {
    if (
      manageBookingId == null ||
      !selectedPaymentMethod ||
      confirmResponse?.settlementId == null
    ) {
      return;
    }
    setPaymentUiState((current) => ({
      ...current,
      creatingPayment: true,
      paymentError: null,
      paymentStatusOverride: null,
    }));
    try {
      const response = await createSeatChangePaymentLink({
        bookingId: manageBookingId,
        seatChangeSettlementId: confirmResponse.settlementId,
        method: selectedPaymentMethod,
      });
      const paymentUrl = response.action?.paymentUrl ?? response.payment.paymentUrl ?? null;
      if (paymentUrl && !response.action?.qrData && !response.payment.qrData) {
        const paymentId = resolvePaymentId(response);
        if (paymentId != null) {
          storeSeatChangeRedirectContext({
            paymentId,
            amount: Math.abs(netAmount),
            currency: confirmResponse?.currency ?? previewResponse?.currency ?? currency,
          });
        }
        window.location.assign(paymentUrl);
        return;
      }
      setPaymentUiState((current) => ({
        ...current,
        activePayment: response,
      }));
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(
          error,
          'Could not create the payment code. Please try again.'
        ),
      }));
    } finally {
      setPaymentUiState((current) => ({
        ...current,
        creatingPayment: false,
      }));
    }
  };

  const regenerateSeatChangePayment = async () => {
    if (
      manageBookingId == null ||
      !selectedPaymentMethod ||
      confirmResponse?.settlementId == null
    ) {
      return;
    }
    setPaymentUiState((current) => ({
      ...current,
      regeneratingPayment: true,
      paymentError: null,
      paymentStatusOverride: null,
    }));
    try {
      const response = await createSeatChangePaymentLink({
        bookingId: manageBookingId,
        seatChangeSettlementId: confirmResponse.settlementId,
        method: selectedPaymentMethod,
      });
      setPaymentUiState((current) => ({
        ...current,
        activePayment: response,
      }));
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(
          error,
          'Could not create the payment code. Please try again.'
        ),
      }));
    } finally {
      setPaymentUiState((current) => ({
        ...current,
        regeneratingPayment: false,
      }));
    }
  };

  const checkSeatChangePaymentStatus = useCallback(async () => {
    const paymentId = resolvePaymentId(paymentUiState.activePayment);
    if (paymentId == null) return;
    setPaymentUiState((current) => ({
      ...current,
      checkingPaymentStatus: true,
      paymentError: null,
    }));
    try {
      const response = await getPaymentStatus(paymentId);
      setPaymentUiState((current) => ({
        ...current,
        paymentStatusOverride: (response.payment?.status as PaymentStatus | undefined) ?? null,
      }));
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(error, 'Could not check payment status. Please try again.'),
      }));
    } finally {
      setPaymentUiState((current) => ({
        ...current,
        checkingPaymentStatus: false,
      }));
    }
  }, [paymentUiState.activePayment]);

  const cancelCreatedSeatChangePayment = async () => {
    const paymentId = resolvePaymentId(paymentUiState.activePayment);
    if (paymentId == null) {
      setPaymentUiState((current) => ({
        ...current,
        activePayment: null,
      }));
      return;
    }
    setPaymentUiState((current) => ({
      ...current,
      cancelingPayment: true,
      paymentError: null,
    }));
    try {
      await cancelPayment(paymentId, 'Seat change payment cancelled');
      setPaymentUiState((current) => ({
        ...current,
        activePayment: null,
        paymentStatusOverride: 'CANCELLED',
      }));
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(error, 'Could not cancel the payment. Please try again.'),
      }));
    } finally {
      setPaymentUiState((current) => ({
        ...current,
        cancelingPayment: false,
      }));
    }
  };

  const handleSeatChangePaymentExpired = async () => {
    await checkSeatChangePaymentStatus();
  };

  useEffect(() => {
    const currentPayment = paymentUiState.activePayment;
    const statusOverride = paymentUiState.paymentStatusOverride;
    const paymentId = resolvePaymentId(currentPayment);
    const resolvedStatus =
      statusOverride ?? (currentPayment?.payment.status as PaymentStatus | undefined) ?? null;

    if (paymentId == null) return;
    if (resolvedStatus != null && resolvedStatus !== 'PENDING') {
      const nextVariant = mapPaymentStatusToResultVariant(resolvedStatus);
      if (nextVariant) {
        setPaymentUiState((current) => ({
          ...current,
          activePayment: null,
          paymentError: null,
        }));
        setResultVariant(nextVariant);
        setConfirmModalStage('result');
      }
      return;
    }

    const timer = window.setInterval(() => {
      void checkSeatChangePaymentStatus();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    checkSeatChangePaymentStatus,
    paymentUiState.activePayment,
    paymentUiState.paymentStatusOverride,
  ]);

  const closeSeatChangePaymentCard = () => {
    const effectiveStatus =
      paymentUiState.paymentStatusOverride ??
      (paymentUiState.activePayment?.payment.status as PaymentStatus | undefined) ??
      null;
    const nextVariant = mapPaymentStatusToResultVariant(effectiveStatus);
    setPaymentUiState((current) => ({
      ...current,
      activePayment: null,
      paymentError: null,
    }));
    if (nextVariant) {
      setResultVariant(nextVariant);
      setConfirmModalStage('result');
    }
  };

  const reopenSeatChangePaymentMethods = () => {
    setPaymentUiState((current) => ({
      ...current,
      activePayment: null,
      paymentError: null,
      paymentStatusOverride: null,
    }));
    setConfirmModalStage('payment');
  };

  const backToSeatEdit = () => {
    setPaymentUiState((current) => ({
      ...current,
      activePayment: null,
      paymentError: null,
      paymentStatusOverride: null,
    }));
    closeConfirmFlow();
  };

  const handledSeatChangeReturnRef = useRef<string | null>(null);
  useEffect(() => {
    if (manageBookingId == null) return;
    const params = new URLSearchParams(location.search);
    const storedRedirectContext = readSeatChangeRedirectContext();
    const rawPaymentId = params.get('seatChangePaymentId');
    const seatChangeReturn = params.get('seatChangeReturn') === '1' || rawPaymentId != null;
    if (!seatChangeReturn && !rawPaymentId) return;

    const paymentId = Number(rawPaymentId ?? storedRedirectContext?.paymentId ?? NaN);
    if (!Number.isFinite(paymentId) || paymentId <= 0) return;

    const handledKey = `${manageBookingId}:${paymentId}:${location.search}`;
    if (handledSeatChangeReturnRef.current === handledKey) return;
    handledSeatChangeReturnRef.current = handledKey;

    const amount = storedRedirectContext?.amount ?? null;
    const resolvedCurrency = storedRedirectContext?.currency ?? currency;
    let cancelled = false;
    let timer: number | null = null;

    const cleanupUrl = () => {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('seatChangeReturn');
      nextParams.delete('seatChangePaymentId');
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true }
      );
    };

    const finishWithVariant = (variant: ConfirmResultVariant) => {
      clearSeatChangeRedirectContext();
      cleanupUrl();
      openSeatChangeResult(variant, { amount, currency: resolvedCurrency });
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
        const variant = mapPaymentStatusToResultVariant(status);
        finishWithVariant(variant ?? 'error');
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
  }, [
    currency,
    location.pathname,
    location.search,
    manageBookingId,
    navigate,
    openSeatChangeResult,
  ]);

  if (manageBookingId == null) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="mx-auto min-h-svh w-full max-w-400 px-6 pb-24 pt-24 sm:pt-28 md:px-8">
        <div className="mb-8">
          <div className="mb-2 text-[0.72rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            Choose seats
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">
            Choose your seats
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
            Pick a seat for every passenger on each flight. Seat surcharges are settled at the end.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
          <span className="font-medium">Booking reference:</span>
          <span className="rounded-full border border-luxury-gold/20 bg-white px-3 py-1 font-black tracking-[0.16em] text-midnight-burgundy">
            {pnr}
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {statusLabel}
          </span>
        </div>

        <section className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface-lowest p-3 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {itineraries.map((it, idx) => {
              const dir = resolveDirectionLabel(it, idx);
              const picked = allSeatAssignments.filter((a) => a.flightId === it.flightId).length;
              const total = allPassengers.length;
              const active = activeFlightId === it.flightId;
              return (
                <button
                  type="button"
                  key={it.flightId}
                  onClick={() => setActiveFlightId(it.flightId)}
                  className={`group flex flex-col gap-2 rounded-xl px-5 py-4 text-left transition-all ${
                    active
                      ? 'bg-midnight-burgundy text-white shadow-md'
                      : 'border border-outline-variant/40 bg-surface text-on-surface hover:border-midnight-burgundy/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-[0.6875rem] font-black uppercase tracking-[0.22em] ${
                        active ? 'text-luxury-gold' : 'text-on-surface-variant'
                      }`}
                    >
                      {dir.tag}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${
                        active
                          ? 'bg-white/15 text-white'
                          : picked === total && total > 0
                            ? 'bg-luxury-gold/20 text-midnight-burgundy'
                            : 'bg-outline-variant/30 text-on-surface-variant'
                      }`}
                    >
                      {picked} of {total} seats picked
                    </span>
                  </div>
                  <p
                    className={`font-headline text-xl font-black ${
                      active ? 'text-white' : 'text-on-surface'
                    }`}
                  >
                    {it.departureAirportCode} → {it.arrivalAirportCode}
                  </p>
                  <p className={`text-sm ${active ? 'text-white/80' : 'text-on-surface-variant'}`}>
                    {it.flightNumber} · {formatFlightDate(it.departureTime)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <PassengerList
            passengers={allPassengers}
            seatAssignments={seatAssignmentsForActiveFlight}
            activePassengerId={activePassengerId}
            onSelect={setActivePassengerId}
            currency={currency}
          />

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest px-5 py-4">
              <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
                Aircraft · {activeItinerary?.flightNumber ?? '—'}
              </p>
              <p className="font-headline text-lg font-black text-on-surface">
                Selecting seat for{' '}
                <span className="text-midnight-burgundy">
                  {allPassengers.find((p) => p.passengerId === activePassengerId)
                    ? `${allPassengers.find((p) => p.passengerId === activePassengerId)?.lastName} ${allPassengers.find((p) => p.passengerId === activePassengerId)?.firstName}`
                    : '—'}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-2">
              <AircraftSeatsMap
                seatMap={seatMapQuery.data ?? null}
                loading={canLoadSeatMap && seatMapQuery.isPending}
                error={
                  seatMapQuery.isError
                    ? seatMapQuery.error instanceof Error
                      ? seatMapQuery.error.message
                      : 'Unable to load the seat map right now.'
                    : null
                }
                selectedSeat={selectedSeat}
                onSeatPreview={setSelectedSeat}
                assignedSeatBySeatId={assignedSeatMetaBySeatId}
                showDetailPanel={false}
                showSeatLegend
                headerSubtitle={activeItinerary?.cabinClass ?? null}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <SeatDetailPanel
              selectedSeat={selectedSeat}
              selectedSeatAssignedMeta={selectedSeatAssignedMeta}
              currentSeatId={assignmentForActivePassenger?.seatId ?? null}
              currentSeatNumber={assignmentForActivePassenger?.seatNumber ?? null}
              currentSurcharge={assignmentForActivePassenger?.surchargeAmount ?? null}
              currency={currency}
              passengerName={
                allPassengers.find((p) => p.passengerId === activePassengerId)
                  ? `${allPassengers.find((p) => p.passengerId === activePassengerId)?.lastName ?? ''} ${allPassengers.find((p) => p.passengerId === activePassengerId)?.firstName ?? ''}`.trim()
                  : '—'
              }
              isSubmitting={isSeatMutationPending}
              onConfirm={() => selectedSeat && handleSeatConfirm(selectedSeat)}
              onCancelAssigned={handleSeatCancel}
              onCancelPreview={() => setSelectedSeat(null)}
            />

            <ChangeSummaryCard
              itineraries={itineraries}
              passengers={allPassengers}
              deltas={seatChangeDeltas}
              currency={currency}
              additionalChargesTotal={additionalChargesTotal}
              refundsTotal={refundsTotal}
              netAmount={netAmount}
              totalSeatsRequired={totalSeatsRequired}
              totalSeatsPicked={totalSeatsPicked}
              previewResponse={confirmModalOpen ? previewResponse : null}
              onBackToEdit={() => navigate('/manage-booking')}
              onConfirmChanges={openConfirmPreview}
              isSaving={isSeatMutationPending}
            />
          </div>
        </section>
      </main>
      <SiteFooter />

      {confirmModalOpen ? (
        <SeatChangeFlowModal
          stage={confirmModalStage}
          currency={currency}
          previewLoading={previewLoading}
          previewError={previewError}
          previewResponse={previewResponse}
          confirmSubmitting={confirmSubmitting}
          confirmResponse={confirmResponse}
          deltas={seatChangeDeltas}
          additionalChargesTotal={additionalChargesTotal}
          refundsTotal={refundsTotal}
          netAmount={netAmount}
          resultVariant={resultVariant}
          resultAmountOverride={resultAmountOverride}
          resultCurrencyOverride={resultCurrencyOverride}
          passengers={allPassengers}
          itineraries={itineraries}
          paymentMethods={paymentMethods}
          paymentMethodsLoading={paymentMethodsQuery.isLoading}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          paymentUiState={paymentUiState}
          onClose={closeConfirmFlow}
          onBackToEdit={backToSeatEdit}
          onRetryPayment={reopenSeatChangePaymentMethods}
          onRefreshPreview={refreshConfirmPreview}
          onPreviewContinue={continueFromPreview}
          onCreatePayment={createSeatChangePayment}
          onResultDone={completeResultFlow}
          onRegeneratePayment={regenerateSeatChangePayment}
          onCheckPaymentStatus={checkSeatChangePaymentStatus}
          onCancelPayment={cancelCreatedSeatChangePayment}
          onPaymentExpired={handleSeatChangePaymentExpired}
          onPaymentCardClose={closeSeatChangePaymentCard}
        />
      ) : null}
    </div>
  );
}

function PassengerList({
  passengers,
  seatAssignments,
  activePassengerId,
  onSelect,
  currency,
}: {
  passengers: ManagePassenger[];
  seatAssignments: BookingManageOptionsResponse['seatAssignments'];
  activePassengerId: number | null;
  onSelect: (id: number) => void;
  currency: string;
}) {
  return (
    <aside className="flex flex-col gap-3">
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest px-5 py-4">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Passengers
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Tap a passenger, then tap a seat on the map.
        </p>
      </div>

      {passengers.map((p) => {
        const assignment = seatAssignments.find((a) => a.passengerId === p.passengerId);
        const active = activePassengerId === p.passengerId;
        return (
          <button
            type="button"
            key={p.passengerId}
            onClick={() => onSelect(p.passengerId)}
            className={`flex flex-col gap-3 rounded-2xl bg-surface-lowest p-4 text-left transition-all ${
              active
                ? 'border-2 border-midnight-burgundy shadow-md'
                : 'border border-outline-variant/30 hover:border-midnight-burgundy/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-midnight-burgundy/10 px-2 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
                    {getPassengerTypeLabel(p.passengerType)}
                  </span>
                  {active ? (
                    <span className="rounded-full bg-midnight-burgundy px-2 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-luxury-gold">
                      Selecting
                    </span>
                  ) : null}
                </div>
                <p className="font-bold text-on-surface">
                  {[p.lastName, p.firstName].filter(Boolean).join(' ')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`font-headline text-2xl font-black ${
                    assignment ? 'text-midnight-burgundy' : 'text-on-surface-variant/50'
                  }`}
                >
                  {assignment?.seatNumber ?? '—'}
                </span>
                <span
                  className={`text-[0.6875rem] font-bold ${
                    assignment ? 'text-secondary' : 'text-on-surface-variant/50'
                  }`}
                >
                  {assignment
                    ? assignment.surchargeAmount > 0
                      ? `+${formatMoney(assignment.surchargeAmount, assignment.currency || currency)}`
                      : 'Included'
                    : 'Not selected'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
              <span className="text-on-surface-variant">
                {assignment ? 'Tap a new seat to change' : 'Tap to assign a seat'}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-midnight-burgundy">
                {assignment ? 'Change' : 'Pick seat'} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        );
      })}
    </aside>
  );
}

function SeatDetailPanel({
  selectedSeat,
  selectedSeatAssignedMeta,
  currentSeatId,
  currentSeatNumber,
  currentSurcharge,
  currency,
  passengerName,
  isSubmitting,
  onConfirm,
  onCancelAssigned,
  onCancelPreview,
}: {
  selectedSeat: SeatSelectionValue | null;
  selectedSeatAssignedMeta: AssignedSeatMeta | null;
  currentSeatId: number | null;
  currentSeatNumber: string | null;
  currentSurcharge: number | null;
  currency: string;
  passengerName: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancelAssigned: () => void;
  onCancelPreview: () => void;
}) {
  if (!selectedSeat) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-lowest px-5 py-8 text-center">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Seat details
        </p>
        <p className="mt-3 text-sm text-on-surface-variant">
          Tap any available seat on the map to preview details and confirm the change.
        </p>
      </div>
    );
  }

  const newSurcharge = selectedSeat.extraPrice ?? 0;
  const surchargeCurrency = selectedSeat.currency ?? currency;
  const categoryLabel = selectedSeat.seatCategoryDisplay?.label ?? selectedSeat.seatCategory ?? '—';
  const typeLabel = selectedSeat.seatTypeDisplay?.label ?? '—';
  const isCurrentAssignedSeat = currentSeatId != null && selectedSeat.seatId === currentSeatId;
  const isReservedByAnotherPassenger =
    selectedSeatAssignedMeta != null && !selectedSeatAssignedMeta.isYours && !isCurrentAssignedSeat;
  const priceSummary = isReservedByAnotherPassenger
    ? 'Reserved'
    : newSurcharge > 0
      ? `+${formatMoney(newSurcharge, surchargeCurrency)}`
      : 'Included';

  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-5">
      <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
        Seat details
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-luxury-gold bg-midnight-burgundy">
          <span className="font-headline text-2xl font-black text-luxury-gold">
            {selectedSeat.seatNumber}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-midnight-burgundy/10 px-2 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
              {typeLabel}
            </span>
            <span className="rounded-full bg-luxury-gold/20 px-2 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
              {categoryLabel}
            </span>
          </div>
          <p className="text-sm font-bold text-on-surface">
            Row {selectedSeat.seatNumber.replace(/[^0-9]/g, '') || '—'}
          </p>
          <p className="text-xs text-on-surface-variant">{selectedSeat.displayPrice?.text ?? ''}</p>
        </div>
      </div>

      <div className="my-4 h-px w-full bg-outline-variant/40" />

      <dl className="flex flex-col gap-2 text-sm">
        <Row k="Passenger" v={passengerName} />
        <Row k="Currently assigned" v={currentSeatNumber ?? 'Not assigned'} />
        <Row
          k={isCurrentAssignedSeat ? 'Selected seat' : 'New selection'}
          v={selectedSeat.seatNumber}
          highlight
        />
        <Row
          k={
            isCurrentAssignedSeat
              ? 'Current surcharge'
              : isReservedByAnotherPassenger
                ? 'Seat status'
                : 'Seat surcharge'
          }
          v={priceSummary}
        />
        {!isCurrentAssignedSeat &&
        !isReservedByAnotherPassenger &&
        currentSurcharge != null &&
        currentSurcharge > 0 ? (
          <Row
            k={`Refund of ${currentSeatNumber}`}
            v={`-${formatMoney(currentSurcharge, currency)}`}
            negative
          />
        ) : null}
      </dl>

      <div className="mt-5 flex flex-col gap-2">
        {isCurrentAssignedSeat ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancelAssigned}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition-colors hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Cancel seat {selectedSeat.seatNumber}
              </>
            )}
          </button>
        ) : isReservedByAnotherPassenger ? (
          <div className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-400/30 bg-slate-100/90 px-4 text-sm font-bold text-slate-800">
            <Check className="h-4 w-4" />
            This seat is already reserved by another passenger
          </div>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-4 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Confirm {selectedSeat.seatNumber} for {passengerName}
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onCancelPreview}
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40 disabled:opacity-60"
        >
          {isCurrentAssignedSeat
            ? 'Back to overview'
            : isReservedByAnotherPassenger
              ? 'Choose another seat'
              : currentSeatNumber
                ? `Keep current seat (${currentSeatNumber})`
                : 'Clear selection'}
        </button>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  highlight,
  negative,
}: {
  k: string;
  v: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-on-surface-variant">{k}</dt>
      <dd
        className={`font-bold ${
          negative ? 'text-emerald-600' : highlight ? 'text-midnight-burgundy' : 'text-on-surface'
        }`}
      >
        {v}
      </dd>
    </div>
  );
}

function ChangeSummaryCard({
  itineraries,
  passengers,
  deltas,
  currency,
  additionalChargesTotal,
  refundsTotal,
  netAmount,
  totalSeatsRequired,
  totalSeatsPicked,
  previewResponse,
  onBackToEdit,
  onConfirmChanges,
  isSaving,
}: {
  itineraries: ItineraryItem[];
  passengers: ManagePassenger[];
  deltas: SeatChangeDelta[];
  currency: string;
  additionalChargesTotal: number;
  refundsTotal: number;
  netAmount: number;
  totalSeatsRequired: number;
  totalSeatsPicked: number;
  previewResponse?: SeatChangePreviewResponse | null;
  onBackToEdit: () => void;
  onConfirmChanges: () => void;
  isSaving: boolean;
}) {
  const hasChangedSeats = deltas.some((delta) => delta.changed);
  const effectiveAdditionalCharges = previewResponse?.summary.additionalAmount ?? additionalChargesTotal;
  const effectiveRefunds = previewResponse?.summary.refundAmount ?? refundsTotal;
  const effectiveNetAmount = previewResponse?.summary.netAmount ?? netAmount;
  const netLabel =
    effectiveNetAmount > 0
      ? 'Amount due now'
      : effectiveNetAmount < 0
        ? 'Refund to you'
        : 'No change';
  const netClass =
    effectiveNetAmount > 0
      ? 'text-midnight-burgundy'
      : effectiveNetAmount < 0
        ? 'text-emerald-600'
        : 'text-on-surface-variant';
  const netBox =
    effectiveNetAmount > 0
      ? 'bg-midnight-burgundy/5'
      : effectiveNetAmount < 0
        ? 'bg-emerald-50'
        : 'bg-surface';

  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Change summary
        </p>
        <span className="rounded-full bg-luxury-gold/20 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
          {itineraries.length} flights · {passengers.length} pax
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {itineraries.map((it, idx) => {
          const dir = resolveDirectionLabel(it, idx);
          const flightDeltas = passengers.map((p) => {
            const d = deltas.find(
              (x) => x.flightId === it.flightId && x.passengerId === p.passengerId
            );
            return {
              passengerId: p.passengerId,
              name: [p.lastName, p.firstName].filter(Boolean).join(' '),
              delta: d ?? null,
            };
          });

          return (
            <div
              key={it.flightId}
              className="rounded-xl border border-outline-variant/30 bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
                    {dir.tag} · {it.departureAirportCode} → {it.arrivalAirportCode}
                  </p>
                  <p className="text-sm font-bold text-on-surface">
                    {it.flightNumber} · {formatFlightDate(it.departureTime)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {flightDeltas.map((r) => {
                  const d = r.delta;
                  let statusText = 'Not selected';
                  let amountText = 'Pending';
                  let amountClass = 'text-on-surface-variant/60';

                  if (d) {
                    if (!d.currentSeatNumber && d.originalSeatNumber) {
                      statusText = `Removed ${d.originalSeatNumber}`;
                    } else if (!d.changed && d.currentSeatNumber) {
                      statusText = `Seat ${d.currentSeatNumber} (unchanged)`;
                    } else if (d.originalSeatNumber && d.currentSeatNumber) {
                      statusText = `${d.originalSeatNumber} → ${d.currentSeatNumber}`;
                    } else if (!d.originalSeatNumber && d.currentSeatNumber) {
                      statusText = `New: ${d.currentSeatNumber}`;
                    }

                    if (d.delta > 0) {
                      amountText = `+${formatMoney(d.delta, d.currency)}`;
                      amountClass = 'text-midnight-burgundy';
                    } else if (d.delta < 0) {
                      amountText = `−${formatMoney(Math.abs(d.delta), d.currency)}`;
                      amountClass = 'text-emerald-600';
                    } else if (d.changed) {
                      amountText = 'Same price';
                      amountClass = 'text-on-surface-variant';
                    } else {
                      amountText = '—';
                      amountClass = 'text-on-surface-variant/60';
                    }
                  }

                  return (
                    <div
                      key={`${it.flightId}-${r.passengerId}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{r.name}</p>
                        <p className="text-xs text-on-surface-variant">{statusText}</p>
                      </div>
                      <span className={`font-bold ${amountClass}`}>{amountText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="my-4 h-px w-full bg-outline-variant/40" />

      <dl className="flex flex-col gap-2 text-sm">
        <Row
          k="Additional charges"
          v={effectiveAdditionalCharges > 0 ? `+${formatMoney(effectiveAdditionalCharges, currency)}` : '—'}
        />
        <Row
          k="Refunds"
          v={effectiveRefunds > 0 ? `−${formatMoney(effectiveRefunds, currency)}` : '—'}
          negative={effectiveRefunds > 0}
        />
      </dl>

      <div className={`mt-4 flex items-center justify-between rounded-xl ${netBox} px-4 py-3`}>
        <div>
          <p
            className={`text-[0.6875rem] font-black uppercase tracking-[0.22em] ${
              effectiveNetAmount < 0 ? 'text-emerald-700' : 'text-midnight-burgundy'
            }`}
          >
            {netLabel}
          </p>
          <p className="text-xs text-on-surface-variant">
            {totalSeatsPicked} of {totalSeatsRequired} seats picked
          </p>
        </div>
        <p className={`font-headline text-2xl font-black ${netClass}`}>
          {effectiveNetAmount === 0
            ? '—'
            : effectiveNetAmount > 0
              ? `+${formatMoney(effectiveNetAmount, currency)}`
              : `−${formatMoney(Math.abs(effectiveNetAmount), currency)}`}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onBackToEdit}
          disabled={isSaving}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={onConfirmChanges}
          disabled={isSaving || !hasChangedSeats}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-4 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Save & continue
            </>
          )}
        </button>
      </div>
    </div>
  );
}

type PaymentMethodKey = 'PAYOS' | 'STRIPE' | 'VIETQR';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ConfirmChangesModal({
  netAmount,
  currency,
  deltas,
  onClose,
  onComplete,
}: {
  netAmount: number;
  currency: string;
  deltas: SeatChangeDelta[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const variant: 'saved' | 'refund' | 'payment' =
    netAmount > 0 ? 'payment' : netAmount < 0 ? 'refund' : 'saved';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('PAYOS');
  const changedDeltas = useMemo(() => deltas.filter((d) => d.changed), [deltas]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-surface-lowest p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
        >
          <X className="h-4 w-4" />
        </button>

        {variant === 'saved' ? (
          <SavedView onDone={onComplete} />
        ) : variant === 'refund' ? (
          <RefundView amount={Math.abs(netAmount)} currency={currency} onDone={onComplete} />
        ) : (
          <PaymentView
            amountDue={netAmount}
            currency={currency}
            changedDeltas={changedDeltas}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onCancel={onClose}
            onContinue={onComplete}
          />
        )}
      </div>
    </div>
  );
}

function SavedView({ onDone }: { onDone: () => void }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" strokeWidth={2.25} />
        </div>
        <div className="pt-1">
          <h2 className="font-headline text-xl font-black text-on-surface">Seat changes saved</h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            All selected seat changes were confirmed.
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Back to manage booking
        </button>
      </div>
    </>
  );
}

function RefundView({
  amount,
  currency,
  onDone,
}: {
  amount: number;
  currency: string;
  onDone: () => void;
}) {
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <Wallet className="h-5 w-5 text-emerald-600" strokeWidth={2} />
        </div>
        <div className="pt-1">
          <h2 className="font-headline text-xl font-black text-on-surface">Refund initiated</h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Your seat changes were confirmed. A refund will be processed.
          </p>
        </div>
      </div>

      <dl className="mt-5 flex flex-col gap-2.5 rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-on-surface-variant">Refund amount</dt>
          <dd className="font-headline text-lg font-black text-emerald-600">
            {formatMoney(amount, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-on-surface-variant">Method</dt>
          <dd className="font-bold text-on-surface">Visa ending 4242</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-on-surface-variant">Estimated time</dt>
          <dd className="font-bold text-on-surface">5–7 business days</dd>
        </div>
      </dl>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Done
        </button>
      </div>
    </>
  );
}

function PaymentView({
  amountDue,
  currency,
  changedDeltas,
  paymentMethod,
  setPaymentMethod,
  onCancel,
  onContinue,
}: {
  amountDue: number;
  currency: string;
  changedDeltas: SeatChangeDelta[];
  paymentMethod: PaymentMethodKey;
  setPaymentMethod: (key: PaymentMethodKey) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const methods: { key: PaymentMethodKey; label: string; description: string }[] = [
    { key: 'PAYOS', label: 'PayOS', description: 'Vietnam e-wallets & bank transfer' },
    { key: 'STRIPE', label: 'Stripe card', description: 'Visa, Mastercard, JCB' },
    { key: 'VIETQR', label: 'VietQR', description: 'Scan to pay with banking app' },
  ];

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-luxury-gold/20">
          <CreditCard className="h-5 w-5 text-midnight-burgundy" strokeWidth={2} />
        </div>
        <div className="pt-1">
          <h2 className="font-headline text-xl font-black text-on-surface">
            Additional payment required
          </h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Your seat changes are ready to complete.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-midnight-burgundy/5 px-4 py-3">
        <span className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
          Amount due
        </span>
        <span className="font-headline text-2xl font-black text-midnight-burgundy">
          {formatMoney(amountDue, currency)}
        </span>
      </div>

      {changedDeltas.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
            Change summary
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {changedDeltas.map((d) => (
              <li
                key={`${d.flightId}-${d.passengerId}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-on-surface">
                  • {d.passengerName}:{' '}
                  <span className="font-semibold">
                    {d.originalSeatNumber ?? '—'} → {d.currentSeatNumber ?? '—'}
                  </span>
                </span>
                {d.delta !== 0 ? (
                  <span
                    className={`text-xs font-bold ${
                      d.delta > 0 ? 'text-midnight-burgundy' : 'text-emerald-600'
                    }`}
                  >
                    {d.delta > 0 ? '+' : '−'}
                    {formatMoney(Math.abs(d.delta), d.currency)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Choose payment method
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {methods.map((m) => {
            const selected = paymentMethod === m.key;
            const radioId = `payment-method-${m.key}`;
            return (
              // eslint-disable-next-line jsx-a11y/label-has-associated-control -- label wraps the input + descriptive text
              <label
                key={m.key}
                htmlFor={radioId}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                  selected
                    ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                    : 'border-outline-variant/30 bg-surface hover:border-midnight-burgundy/30'
                }`}
              >
                <input
                  id={radioId}
                  type="radio"
                  name="payment-method"
                  value={m.key}
                  checked={selected}
                  onChange={() => setPaymentMethod(m.key)}
                  className="h-4 w-4 accent-midnight-burgundy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-on-surface">{m.label}</p>
                  <p className="text-xs text-on-surface-variant">{m.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-5 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Continue to payment
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </>
  );
}

function SeatChangeFlowModal({
  stage,
  currency,
  previewLoading,
  previewError,
  previewResponse,
  confirmSubmitting,
  confirmResponse,
  deltas,
  additionalChargesTotal,
  refundsTotal,
  netAmount,
  resultVariant,
  resultAmountOverride,
  resultCurrencyOverride,
  passengers,
  itineraries,
  paymentMethods,
  paymentMethodsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  paymentUiState,
  onClose,
  onBackToEdit,
  onRetryPayment,
  onRefreshPreview,
  onPreviewContinue,
  onCreatePayment,
  onResultDone,
  onRegeneratePayment,
  onCheckPaymentStatus,
  onCancelPayment,
  onPaymentExpired,
  onPaymentCardClose,
}: {
  stage: ConfirmModalStage;
  currency: string;
  previewLoading: boolean;
  previewError: string | null;
  previewResponse: SeatChangePreviewResponse | null;
  confirmSubmitting: boolean;
  confirmResponse: SeatChangeConfirmResponse | null;
  deltas: SeatChangeDelta[];
  additionalChargesTotal: number;
  refundsTotal: number;
  netAmount: number;
  resultVariant: ConfirmResultVariant;
  resultAmountOverride: number | null;
  resultCurrencyOverride: string | null;
  passengers: ManagePassenger[];
  itineraries: ItineraryItem[];
  paymentMethods: PaymentMethod[];
  paymentMethodsLoading: boolean;
  selectedPaymentMethod: string;
  onSelectPaymentMethod: (value: string) => void;
  paymentUiState: PaymentUiState;
  onClose: () => void;
  onBackToEdit: () => void;
  onRetryPayment: () => void;
  onRefreshPreview: () => void;
  onPreviewContinue: () => void;
  onCreatePayment: () => void;
  onResultDone: () => void;
  onRegeneratePayment: () => void | Promise<void>;
  onCheckPaymentStatus: () => void | Promise<void>;
  onCancelPayment: () => void | Promise<void>;
  onPaymentExpired: () => void | Promise<void>;
  onPaymentCardClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (paymentUiState.activePayment) {
    return (
      <PaymentCard
        data={paymentUiState.activePayment}
        onClose={onPaymentCardClose}
        onRegenerate={onRegeneratePayment}
        onCheckStatus={onCheckPaymentStatus}
        onCancel={onCancelPayment}
        onExpired={onPaymentExpired}
        checkingStatus={paymentUiState.checkingPaymentStatus}
        canceling={paymentUiState.cancelingPayment}
        regenerating={paymentUiState.regeneratingPayment}
        statusOverride={paymentUiState.paymentStatusOverride}
        errorMessage={paymentUiState.paymentError}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-surface-lowest p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
        >
          <X className="h-4 w-4" />
        </button>

        {stage === 'preview' ? (
          <SeatChangePreviewStage
            previewLoading={previewLoading}
            previewError={previewError}
            previewResponse={previewResponse}
            deltas={deltas}
            additionalChargesTotal={additionalChargesTotal}
            refundsTotal={refundsTotal}
            netAmount={netAmount}
            passengers={passengers}
            itineraries={itineraries}
            confirmSubmitting={confirmSubmitting}
            currency={currency}
            onRefreshPreview={onRefreshPreview}
            onContinue={onPreviewContinue}
            onBack={onClose}
          />
        ) : stage === 'payment' ? (
          <SeatChangePaymentStage
            previewResponse={previewResponse}
            confirmResponse={confirmResponse}
            deltas={deltas}
            netAmount={netAmount}
            itineraries={itineraries}
            paymentMethods={paymentMethods}
            paymentMethodsLoading={paymentMethodsLoading}
            selectedPaymentMethod={selectedPaymentMethod}
            onSelectPaymentMethod={onSelectPaymentMethod}
            creatingPayment={paymentUiState.creatingPayment}
            paymentError={paymentUiState.paymentError}
            onCancel={onClose}
            onCreatePayment={onCreatePayment}
          />
        ) : (
          <SeatChangeResultStage
            variant={resultVariant}
            amount={Math.abs(resultAmountOverride ?? netAmount)}
            currency={
              resultCurrencyOverride ??
              confirmResponse?.currency ??
              previewResponse?.currency ??
              currency
            }
            refundMethod={confirmResponse?.refundMethod ?? null}
            onBackToEdit={onBackToEdit}
            onRetryPayment={onRetryPayment}
            onDone={onResultDone}
          />
        )}
      </div>
    </div>
  );
}

function SeatChangePreviewStage({
  previewLoading,
  previewError,
  previewResponse,
  deltas: _deltas,
  additionalChargesTotal: _additionalChargesTotal,
  refundsTotal: _refundsTotal,
  netAmount,
  passengers: _passengers,
  itineraries,
  confirmSubmitting,
  currency,
  onRefreshPreview,
  onContinue,
  onBack,
}: {
  previewLoading: boolean;
  previewError: string | null;
  previewResponse: SeatChangePreviewResponse | null;
  deltas: SeatChangeDelta[];
  additionalChargesTotal: number;
  refundsTotal: number;
  netAmount: number;
  passengers: ManagePassenger[];
  itineraries: ItineraryItem[];
  confirmSubmitting: boolean;
  currency: string;
  onRefreshPreview: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const effectiveNetAmount = previewResponse?.summary.netAmount ?? netAmount;
  const effectiveSettlementType =
    previewResponse?.settlementType ?? getSeatChangeSettlementType(effectiveNetAmount);
  const title =
    effectiveSettlementType === 'COLLECT_PAYMENT'
      ? 'Additional payment required'
      : effectiveSettlementType === 'REFUND'
        ? 'Confirm refund'
        : 'Confirm seat changes';
  const ctaLabel =
    effectiveSettlementType === 'COLLECT_PAYMENT'
      ? 'Continue'
      : effectiveSettlementType === 'REFUND'
        ? 'Confirm refund'
        : 'Confirm changes';
  const note =
    effectiveSettlementType === 'COLLECT_PAYMENT'
      ? 'Seat availability has been revalidated. Continue to payment after confirmation.'
      : effectiveSettlementType === 'REFUND'
        ? 'Refund amount will be processed after confirmation.'
        : 'Seat availability has been revalidated before confirming these changes.';
  const previewItems = useMemo<SeatChangePreviewCardItem[]>(() => {
    return (previewResponse?.items ?? [])
      .filter((item) =>
        effectiveSettlementType === 'COLLECT_PAYMENT'
          ? item.delta > 0
          : effectiveSettlementType === 'REFUND'
            ? item.delta < 0
            : true
      )
      .map((item) => ({
        key: `${item.flightId}-${item.passengerId}-${item.toSeatNumber ?? 'none'}`,
        passengerName: item.passengerName ?? `Passenger ${item.passengerId}`,
        flightLabel:
          formatSeatChangeFlightLabelSafe(
            itineraries.find((entry) => entry.flightId === item.flightId) ?? null
          ) || `Flight #${item.flightId}`,
        seatChangeLabel: formatSeatChangeSeatLabelSafe(item.fromSeatNumber, item.toSeatNumber),
        surchargeLabel:
          item.oldAmount > 0
            ? `Seat surcharge: ${formatMoney(item.oldAmount, previewResponse?.currency ?? currency)} \u2192 ${formatMoney(item.newAmount, previewResponse?.currency ?? currency)}`
            : null,
        delta: item.delta,
      }));
  }, [currency, effectiveSettlementType, itineraries, previewResponse]);

  if (previewLoading) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-midnight-burgundy" />
        <h2 className="font-headline text-xl font-black text-on-surface">
          Validating seat changes...
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          We are checking live seat availability and recalculating charges.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start gap-3 pr-10">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-midnight-burgundy/10">
          {effectiveSettlementType === 'COLLECT_PAYMENT' ? (
            <CreditCard className="h-5 w-5 text-midnight-burgundy" strokeWidth={2} />
          ) : effectiveSettlementType === 'REFUND' ? (
            <Wallet className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          )}
        </div>
        <div>
          <h2 className="font-headline text-xl font-black text-on-surface">{title}</h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">{note}</p>
        </div>
      </div>

      {previewError ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {previewError}
        </div>
      ) : null}

      {previewResponse ? (
        <>
          <div className="mt-5 space-y-3">
            {previewItems.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-outline-variant/30 bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {item.passengerName}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">{item.flightLabel}</p>
                    <p className="mt-1 text-xs font-semibold text-on-surface">
                      {item.seatChangeLabel}
                    </p>
                    {item.surchargeLabel ? (
                      <p className="mt-1 text-xs text-on-surface-variant">{item.surchargeLabel}</p>
                    ) : null}
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      item.delta > 0
                        ? 'text-midnight-burgundy'
                        : item.delta < 0
                          ? 'text-emerald-600'
                          : 'text-on-surface-variant'
                    }`}
                  >
                    {item.delta > 0
                      ? `+${formatMoney(item.delta, previewResponse.currency)}`
                      : item.delta < 0
                        ? `-${formatMoney(Math.abs(item.delta), previewResponse.currency)}`
                        : 'No change'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <dl className="mt-5 rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm">
            {effectiveSettlementType !== 'REFUND' ? (
              <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">Additional charges</dt>
                <dd className="font-bold text-on-surface">
                  {previewResponse.summary.additionalAmount > 0
                    ? `+${formatMoney(
                        previewResponse.summary.additionalAmount,
                        previewResponse.currency
                      )}`
                    : '—'}
                </dd>
              </div>
            ) : null}
            {effectiveSettlementType !== 'COLLECT_PAYMENT' ? (
              <div
                className={`${effectiveSettlementType !== 'REFUND' ? 'mt-2 ' : ''}flex items-center justify-between`}
              >
                <dt className="text-on-surface-variant">Refunds</dt>
                <dd className="font-bold text-emerald-600">
                  {previewResponse.summary.refundAmount > 0
                    ? `-${formatMoney(
                        previewResponse.summary.refundAmount,
                        previewResponse.currency
                      )}`
                    : '—'}
                </dd>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3">
              <dt className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
                {effectiveSettlementType === 'REFUND' ? 'Net refund' : 'Net amount'}
              </dt>
              <dd className="font-headline text-xl font-black text-midnight-burgundy">
                {effectiveNetAmount === 0
                  ? '—'
                  : formatMoney(
                      Math.abs(effectiveNetAmount),
                      previewResponse.currency || currency
                    )}
              </dd>
            </div>
          </dl>
        </>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={previewError ? onRefreshPreview : onBack}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-5 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40"
        >
          {previewError ? 'Refresh seat map' : 'Back to edit'}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!previewResponse || Boolean(previewError) || confirmSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> {ctaLabel}
            </>
          )}
        </button>
      </div>
    </>
  );
}

function SeatChangePaymentStage({
  previewResponse,
  confirmResponse,
  deltas,
  netAmount,
  itineraries: _itineraries,
  paymentMethods,
  paymentMethodsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  creatingPayment,
  paymentError,
  onCancel,
  onCreatePayment,
}: {
  previewResponse: SeatChangePreviewResponse | null;
  confirmResponse: SeatChangeConfirmResponse | null;
  deltas: SeatChangeDelta[];
  netAmount: number;
  itineraries: ItineraryItem[];
  paymentMethods: PaymentMethod[];
  paymentMethodsLoading: boolean;
  selectedPaymentMethod: string;
  onSelectPaymentMethod: (value: string) => void;
  creatingPayment: boolean;
  paymentError: string | null;
  onCancel: () => void;
  onCreatePayment: () => void;
}) {
  const changedDeltas = deltas.filter((delta) => delta.changed);
  const amountDue = Math.max(
    0,
    confirmResponse?.summary.netAmount ?? previewResponse?.summary.netAmount ?? netAmount
  );

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-luxury-gold/20">
          <CreditCard className="h-5 w-5 text-midnight-burgundy" strokeWidth={2} />
        </div>
        <div className="pt-1">
          <h2 className="font-headline text-xl font-black text-on-surface">
            Choose payment method
          </h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Complete the additional payment to finalize these seat changes.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-midnight-burgundy/5 px-4 py-3">
        <span className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
          Amount due
        </span>
        <span className="font-headline text-2xl font-black text-midnight-burgundy">
          {formatMoney(amountDue, confirmResponse?.currency ?? previewResponse?.currency ?? 'VND')}
        </span>
      </div>

      {changedDeltas.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
            Change summary
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {changedDeltas.map((delta) => (
              <li
                key={`${delta.flightId}-${delta.passengerId}`}
                className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2 text-on-surface"
              >
                • {delta.passengerName}:{' '}
                <span className="font-semibold">
                  {delta.originalSeatNumber ?? '—'} → {delta.currentSeatNumber ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {paymentError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {paymentError}
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Available methods
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {paymentMethodsLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payment methods...
            </div>
          ) : paymentMethods.length > 0 ? (
            paymentMethods.map((method) => {
              const selected = selectedPaymentMethod === method.code;
              const methodKey = resolvePaymentMethodKey(method);
              const radioId = `seat-change-payment-${methodKey}-${method.code}`;
              return (
                <label
                  key={radioId}
                  htmlFor={radioId}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    selected
                      ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                      : 'border-outline-variant/30 bg-surface hover:border-midnight-burgundy/30'
                  }`}
                >
                  <span className="sr-only">{method.label}</span>
                  <input
                    id={radioId}
                    type="radio"
                    name="seat-change-payment-method"
                    value={method.code}
                    checked={selected}
                    onChange={() => onSelectPaymentMethod(method.code)}
                    className="h-4 w-4 accent-midnight-burgundy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface">{method.label}</p>
                    <p className="text-xs text-on-surface-variant">{method.provider}</p>
                  </div>
                </label>
              );
            })
          ) : (
            <div className="rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm text-on-surface-variant">
              No payment methods are available right now.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-5 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onCreatePayment}
          disabled={creatingPayment || !selectedPaymentMethod || paymentMethods.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingPayment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating payment...
            </>
          ) : (
            <>
              Create payment
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </>
          )}
        </button>
      </div>
    </>
  );
}

function SeatChangeResultStage({
  variant,
  amount,
  currency,
  refundMethod,
  onBackToEdit,
  onRetryPayment,
  onDone,
}: {
  variant: ConfirmResultVariant;
  amount: number;
  currency: string;
  refundMethod?: {
    label: string;
    maskedAccount?: string | null;
    estimatedDays: string;
  } | null;
  onBackToEdit: () => void;
  onRetryPayment: () => void;
  onDone: () => void;
}) {
  if (variant === 'refund_submitted') {
    return (
      <>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Wallet className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          </div>
          <div className="pt-1">
            <h2 className="font-headline text-xl font-black text-on-surface">Refund initiated</h2>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              Your seat changes were confirmed. A refund will be processed.
            </p>
          </div>
        </div>

        <dl className="mt-5 rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Refund amount</dt>
            <dd className="font-headline text-lg font-black text-emerald-600">
              {formatMoney(amount, currency)}
            </dd>
          </div>
          {refundMethod ? (
            <div className="mt-2 flex items-center justify-between">
              <dt className="text-on-surface-variant">Method</dt>
              <dd className="font-bold text-on-surface">
                {refundMethod.maskedAccount
                  ? `${refundMethod.label} ${refundMethod.maskedAccount}`
                  : refundMethod.label}
              </dd>
            </div>
          ) : null}
          {refundMethod?.estimatedDays ? (
            <div className="mt-2 flex items-center justify-between">
              <dt className="text-on-surface-variant">Estimated time</dt>
              <dd className="font-bold text-on-surface">{refundMethod.estimatedDays}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99]"
          >
            Done
          </button>
        </div>
      </>
    );
  }

  const paymentResultVm = buildSeatChangePaymentResultViewModel(variant);
  if (paymentResultVm) {
    const icon =
      paymentResultVm.icon === 'error' ? (
        <X className="h-5 w-5 text-rose-700" strokeWidth={2.25} />
      ) : (
        <Clock className="h-5 w-5 text-amber-700" strokeWidth={2.25} />
      );

    return (
      <>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              paymentResultVm.icon === 'error' ? 'bg-rose-50' : 'bg-amber-50'
            }`}
          >
            {icon}
          </div>
          <div className="pt-1">
            <h2 className="font-headline text-xl font-black text-on-surface">
              {paymentResultVm.title}
            </h2>
            <p className="mt-1.5 text-sm text-on-surface-variant">{paymentResultVm.message}</p>
          </div>
        </div>

        <dl className="mt-5 rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Amount due</dt>
            <dd className="font-headline text-lg font-black text-midnight-burgundy">
              {formatMoney(amount, currency)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBackToEdit}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-5 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40"
          >
            Back to edit
          </button>
          <button
            type="button"
            onClick={onRetryPayment}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99]"
          >
            {paymentResultVm.actionLabel}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" strokeWidth={2.25} />
        </div>
        <div className="pt-1">
          <h2 className="font-headline text-xl font-black text-on-surface">Seat changes saved</h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            All selected seat changes were confirmed.
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Back to manage booking
        </button>
      </div>
    </>
  );
}
