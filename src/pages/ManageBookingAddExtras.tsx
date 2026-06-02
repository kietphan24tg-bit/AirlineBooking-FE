import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import PaymentCard from '../components/booking/PaymentCard';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import { bookingService } from '../services/booking.service';
import { flightService } from '../services/flight.service';
import {
  commitMockManageBookingVariant,
  resetMockManageBookingVariant,
  resolveMockManageBookingVariant,
} from '../services/booking.service';
import {
  cancelPayment,
  createServiceChangePaymentLink,
  getPaymentMethods,
  getPaymentStatus,
} from '../services/payment.service';
import { useBookingStore } from '../stores/useBookingStore';
import { resolveManageBookingId } from './seat-selection/seatSelectionResolvers';
import type {
  BookingManageOptionsResponse,
  ServiceChangeConfirmResponse,
  ServiceChangePreviewRequest,
  ServiceChangePreviewResponse,
} from '../types/booking.types';
import type {
  SelectedServiceOption,
  ServiceCatalogResponse,
  ServiceGroup,
} from '../types/flight.types';
import type { PaymentMethod } from '../types/payment.types';
import type { CreatePaymentResponse, PaymentStatus } from '../types/payment-create.types';

type ItineraryItem = BookingManageOptionsResponse['itineraries'][number];
type ManagePassenger = BookingManageOptionsResponse['passengers'][number];

type FlightScopedSelectedServiceOption = SelectedServiceOption & { flightId: number | null };
type PassengerSelections = Record<string, FlightScopedSelectedServiceOption[]>;
type ConfirmModalStage = 'preview' | 'payment' | 'result';
type ConfirmResultVariant =
  | 'saved'
  | 'refund_submitted'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'
  | 'error';
type PaymentUiState = {
  activePayment: CreatePaymentResponse | null;
  creatingPayment: boolean;
  regeneratingPayment: boolean;
  checkingPaymentStatus: boolean;
  cancelingPayment: boolean;
  paymentStatusOverride: PaymentStatus | null;
  paymentError: string | null;
};

type ServiceChangeRedirectContext = {
  paymentId: number;
  amount: number;
  currency: string;
};

const SERVICE_CHANGE_REDIRECT_CONTEXT_KEY = 'service-change-payment-redirect-context';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function resolvePaymentId(response: CreatePaymentResponse | null): number | null {
  const raw = response?.payment?.id ?? response?.payment?.paymentId ?? null;
  return typeof raw === 'number' ? raw : null;
}

function storeServiceChangeRedirectContext(context: ServiceChangeRedirectContext): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SERVICE_CHANGE_REDIRECT_CONTEXT_KEY, JSON.stringify(context));
}

function readServiceChangeRedirectContext(): ServiceChangeRedirectContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SERVICE_CHANGE_REDIRECT_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ServiceChangeRedirectContext;
  } catch {
    return null;
  }
}

function clearServiceChangeRedirectContext(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SERVICE_CHANGE_REDIRECT_CONTEXT_KEY);
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

function resolveDirectionLabel(itinerary: ItineraryItem, index: number): 'OUTBOUND' | 'RETURN' {
  const raw = String(itinerary.journeyType ?? '').toUpperCase();
  if (raw === 'INBOUND' || raw === 'RETURN') return 'RETURN';
  if (raw === 'OUTBOUND') return 'OUTBOUND';
  return index === 0 ? 'OUTBOUND' : 'RETURN';
}

function iconForServiceType(serviceType: string): LucideIcon {
  const normalized = serviceType.toUpperCase();
  if (normalized.includes('BAGGAGE') || normalized.includes('LUGGAGE')) return BriefcaseBusiness;
  if (normalized.includes('MEAL') || normalized.includes('FOOD')) return UtensilsCrossed;
  if (normalized.includes('INSURANCE')) return ShieldCheck;
  return Sparkles;
}

function selectionsEqual(a: SelectedServiceOption[], b: SelectedServiceOption[]): boolean {
  if (a.length !== b.length) return false;
  const aKeys = new Set(a.map((option) => `${option.serviceId}:${option.optionId}`));
  for (const option of b) {
    if (!aKeys.has(`${option.serviceId}:${option.optionId}`)) return false;
  }
  return true;
}

function selectionBucketKey(passengerId: number, flightId: number | null): string {
  return `${flightId ?? 'none'}:${passengerId}`;
}

function toggleOption<T extends SelectedServiceOption>(
  current: T[],
  option: T,
  selectionMode: string
): T[] {
  const exists = current.some(
    (entry) => entry.serviceId === option.serviceId && entry.optionId === option.optionId
  );
  if (selectionMode === 'MULTIPLE') {
    return exists
      ? current.filter(
          (entry) => !(entry.serviceId === option.serviceId && entry.optionId === option.optionId)
        )
      : [...current, option];
  }
  const withoutGroup = current.filter((entry) => entry.serviceId !== option.serviceId);
  return exists ? withoutGroup : [...withoutGroup, option];
}

function buildInitialSelections(
  manageOptions: BookingManageOptionsResponse | null
): PassengerSelections {
  const map: PassengerSelections = {};
  if (!manageOptions) return map;
  for (const selection of manageOptions.serviceSelections ?? []) {
    if (selection.optionId == null || selection.serviceId == null) continue;
    const scopedSelection = selection as typeof selection & { flightId?: number | null };
    const option: FlightScopedSelectedServiceOption = {
      flightId: scopedSelection.flightId ?? null,
      optionId: selection.optionId,
      serviceId: selection.serviceId,
      serviceType: selection.serviceType ?? 'SERVICE',
      serviceName: selection.serviceName ?? 'Service',
      name: selection.optionName ?? `Option ${selection.optionId}`,
      description: '',
      price: selection.price ?? 0,
      currency: manageOptions.currency ?? 'VND',
      priceLabel: formatMoney(selection.price ?? 0, manageOptions.currency ?? 'VND'),
      imageUrl: null,
      isActive: true,
    };
    const key = selectionBucketKey(selection.passengerId, scopedSelection.flightId ?? null);
    const list = map[key] ?? [];
    list.push(option);
    map[key] = list;
  }
  return map;
}

export default function ManageBookingAddExtras() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const manageOptions = useBookingStore((s) => s.manageOptions);
  const bookingLookup = useBookingStore((s) => s.bookingLookup);
  const bookingResponse = useBookingStore((s) => s.bookingResponse);
  const setManageOptions = useBookingStore((s) => s.setManageOptions);

  const manageBookingId = resolveManageBookingId({
    manageOptions,
    bookingLookup,
    bookingResponse,
  });
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
    const variant = resolveMockManageBookingVariant();
    setManageOptions(null);
    if (variant) resetMockManageBookingVariant(variant);
    queryClient.removeQueries({ queryKey: ['manage-options', manageBookingId], exact: true });
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
  const passengers = useMemo<ManagePassenger[]>(
    () => manageOptions?.passengers ?? [],
    [manageOptions?.passengers]
  );
  const currency = manageOptions?.currency ?? bookingLookup?.booking?.currency ?? 'VND';
  const pnr = bookingLookup?.booking?.pnrCode ?? '—';
  const statusLabel = bookingLookup?.booking?.statusLabel || 'Confirmed';

  const [activeFlightId, setActiveFlightId] = useState<number | null>(null);
  const [activePassengerId, setActivePassengerId] = useState<number | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);
  const [previewOption, setPreviewOption] = useState<SelectedServiceOption | null>(null);

  useEffect(() => {
    if (activeFlightId == null && itineraries.length > 0) {
      setActiveFlightId(itineraries[0].flightId);
    }
  }, [activeFlightId, itineraries]);

  useEffect(() => {
    if (activePassengerId == null && passengers.length > 0) {
      setActivePassengerId(passengers[0].passengerId);
    }
  }, [activePassengerId, passengers]);

  const activeItinerary = useMemo(
    () => itineraries.find((it) => it.flightId === activeFlightId) ?? null,
    [activeFlightId, itineraries]
  );

  const seatLookup = useMemo(() => {
    const seats = manageOptions?.seatAssignments ?? [];
    const result = new Map<string, string>();
    for (const seat of seats) {
      result.set(`${seat.flightId}:${seat.passengerId}`, seat.seatNumber);
    }
    return result;
  }, [manageOptions?.seatAssignments]);

  const originalSelections = useMemo(() => buildInitialSelections(manageOptions), [manageOptions]);

  const [selections, setSelections] = useState<PassengerSelections>(originalSelections);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (Object.keys(originalSelections).length === 0 && passengers.length === 0) return;
    setSelections(originalSelections);
    hydratedRef.current = true;
  }, [originalSelections, passengers.length]);

  useEffect(() => {
    if (!entryReady) return;
    hydratedRef.current = false;
    setSelections({});
    setPreviewOption(null);
  }, [entryReady]);

  const canLoadCatalog = activeItinerary?.flightId != null && activeItinerary?.fareId != null;
  const servicesQuery = useQuery<ServiceCatalogResponse>({
    queryKey: ['services-catalog', activeItinerary?.flightId, activeItinerary?.fareId],
    queryFn: () =>
      flightService.getServices(
        activeItinerary?.flightId as number,
        activeItinerary?.fareId as number
      ),
    enabled: canLoadCatalog,
    staleTime: 60_000,
  });

  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    return (servicesQuery.data?.services ?? [])
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.isActive),
      }))
      .filter((group) => group.options.length > 0);
  }, [servicesQuery.data]);

  useEffect(() => {
    if (serviceGroups.length === 0) {
      setActiveServiceId(null);
      return;
    }
    setActiveServiceId((current) => {
      if (current != null && serviceGroups.some((group) => group.serviceId === current)) {
        return current;
      }
      return serviceGroups[0].serviceId;
    });
  }, [serviceGroups]);

  const activeGroup = useMemo(
    () =>
      serviceGroups.find((group) => group.serviceId === activeServiceId) ??
      serviceGroups[0] ??
      null,
    [activeServiceId, serviceGroups]
  );

  const activeSelectionKey =
    activePassengerId != null ? selectionBucketKey(activePassengerId, activeFlightId) : null;
  const activePassengerSelections = useMemo<SelectedServiceOption[]>(
    () => (activeSelectionKey != null ? (selections[activeSelectionKey] ?? []) : []),
    [activeSelectionKey, selections]
  );

  const handleToggleOption = (option: SelectedServiceOption) => {
    if (activePassengerId == null || activeFlightId == null || !activeGroup) return;
    setSelections((prev) => {
      const key = selectionBucketKey(activePassengerId, activeFlightId);
      const current = prev[key] ?? [];
      const scopedOption: FlightScopedSelectedServiceOption = {
        ...option,
        flightId: activeFlightId,
      };
      const next = toggleOption(current, scopedOption, activeGroup.selectionMode);
      const stillSelected = next.some(
        (entry) => entry.serviceId === option.serviceId && entry.optionId === option.optionId
      );
      setPreviewOption(stillSelected ? option : null);
      return { ...prev, [key]: next };
    });
  };

  const handleBackToEdit = () => {
    if (activePassengerId == null || activeFlightId == null || previewOption == null) {
      setPreviewOption(null);
      return;
    }
    setSelections((prev) => {
      const key = selectionBucketKey(activePassengerId, activeFlightId);
      const current = prev[key] ?? [];
      const next = current.filter(
        (entry) =>
          !(
            entry.serviceId === previewOption.serviceId && entry.optionId === previewOption.optionId
          )
      );
      return { ...prev, [key]: next };
    });
    setPreviewOption(null);
  };

  const handleApplyToAll = () => {
    if (activePassengerId == null || activeFlightId == null) return;
    const source = selections[selectionBucketKey(activePassengerId, activeFlightId)] ?? [];
    setSelections((prev) => {
      const nextSelections: PassengerSelections = { ...prev };
      for (const passenger of passengers) {
        nextSelections[selectionBucketKey(passenger.passengerId, activeFlightId)] = [...source];
      }
      return nextSelections;
    });
    toast.success('Applied current passenger selections to everyone.');
  };

  const _handleResetPassenger = () => {
    if (activePassengerId == null || activeFlightId == null) return;
    const key = selectionBucketKey(activePassengerId, activeFlightId);
    setSelections((prev) => ({
      ...prev,
      [key]: originalSelections[key] ?? [],
    }));
    setPreviewOption(null);
  };

  const _handleDiscard = () => {
    setSelections(originalSelections);
    setPreviewOption(null);
    toast.info('All extras changes have been discarded.');
  };

  const allPassengerDeltas = useMemo(() => {
    return itineraries.flatMap((itinerary) =>
      passengers.map((passenger) => {
        const key = selectionBucketKey(passenger.passengerId, itinerary.flightId);
        const before = originalSelections[key] ?? [];
        const after = selections[key] ?? [];
        const beforeTotal = before.reduce((sum, item) => sum + item.price, 0);
        const afterTotal = after.reduce((sum, item) => sum + item.price, 0);
        const added = after.filter(
          (a) => !before.some((b) => b.serviceId === a.serviceId && b.optionId === a.optionId)
        );
        const removed = before.filter(
          (b) => !after.some((a) => a.serviceId === b.serviceId && a.optionId === b.optionId)
        );
        return {
          flightId: itinerary.flightId,
          passengerId: passenger.passengerId,
          passenger,
          before,
          after,
          beforeTotal,
          afterTotal,
          delta: afterTotal - beforeTotal,
          added,
          removed,
          changed: !selectionsEqual(before, after),
        };
      })
    );
  }, [itineraries, originalSelections, passengers, selections]);

  const passengerDeltas = useMemo(() => {
    return allPassengerDeltas.filter((entry) => entry.flightId === activeFlightId);
  }, [activeFlightId, allPassengerDeltas]);

  const flightSummaries = useMemo(() => {
    return itineraries.map((itinerary) => {
      const entries = allPassengerDeltas.filter((entry) => entry.flightId === itinerary.flightId);
      return {
        flightId: itinerary.flightId,
        totalExtras: entries.reduce((sum, entry) => sum + entry.after.length, 0),
        totalPassengers: entries.filter((entry) => entry.after.length > 0).length,
      };
    });
  }, [allPassengerDeltas, itineraries]);

  const newCharges = passengerDeltas
    .flatMap((entry) => entry.added)
    .reduce((sum, item) => sum + Math.max(0, item.price), 0);
  const refunds = passengerDeltas
    .flatMap((entry) => entry.removed)
    .reduce((sum, item) => sum + Math.max(0, item.price), 0);
  const totalNewCharges = allPassengerDeltas
    .flatMap((entry) => entry.added)
    .reduce((sum, item) => sum + Math.max(0, item.price), 0);
  const totalRefunds = allPassengerDeltas
    .flatMap((entry) => entry.removed)
    .reduce((sum, item) => sum + Math.max(0, item.price), 0);
  const _netAmount = newCharges - refunds;
  const amountDueNow = totalNewCharges - totalRefunds;
  const hasChanges = allPassengerDeltas.some((entry) => entry.changed);
  const configuredCount = allPassengerDeltas
    .map((entry) => entry.after.length)
    .reduce((sum, count) => sum + count, 0);
  const targetCount = Math.max(1, passengers.length * Math.max(1, serviceGroups.length));
  const _progressPercent = Math.min(100, Math.round((configuredCount / targetCount) * 100));

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalStage, setConfirmModalStage] = useState<ConfirmModalStage>('preview');
  const [previewPayload, setPreviewPayload] = useState<ServiceChangePreviewRequest | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResponse, setPreviewResponse] = useState<ServiceChangePreviewResponse | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmResponse, setConfirmResponse] = useState<ServiceChangeConfirmResponse | null>(null);
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
  const saving = previewLoading || confirmSubmitting;

  const buildServiceChangeRequest = (
    nextSelections: PassengerSelections
  ): ServiceChangePreviewRequest => ({
    passengers: passengers.map((passenger) => ({
      passengerId: passenger.passengerId,
      selections: Object.entries(nextSelections)
        .filter((entry) => entry[0].endsWith(`:${passenger.passengerId}`))
        .flatMap((entry) => entry[1])
        .map((option) => ({
          flightId: option.flightId ?? undefined,
          optionId: option.optionId,
          quantity: 1,
        })),
    })),
  });

  const refreshSelectionsFromServer = async () => {
    const refreshed = await manageOptionsQuery.refetch();
    if (refreshed.data) {
      setSelections(buildInitialSelections(refreshed.data));
    }
  };

  const paymentMethodsQuery = useQuery({
    queryKey: ['service-change-payment-methods', manageBookingId],
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

  const loadServiceChangePreview = async (request: ServiceChangePreviewRequest) => {
    if (manageBookingId == null) return;
    setPreviewPayload(request);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResponse(null);
    setConfirmModalStage('preview');
    try {
      const response = await bookingService.previewServiceChanges(manageBookingId, request);
      setPreviewResponse(response);
    } catch (error) {
      setPreviewError(getErrorMessage(error, 'Unable to preview extras changes.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openConfirmPreview = () => {
    const request = buildServiceChangeRequest(selections);
    if (!hasChanges) {
      toast.info('No extras changes to save.');
      return;
    }
    setConfirmModalOpen(true);
    void loadServiceChangePreview(request);
  };

  const continueFromPreview = () => {
    if (!previewResponse || !previewPayload || manageBookingId == null) return;
    setConfirmSubmitting(true);
    setPreviewError(null);
    void bookingService
      .confirmServiceChanges(manageBookingId, {
        passengers: previewPayload.passengers,
        previewToken: previewResponse.previewToken,
        idempotencyKey: `service-change-${manageBookingId}-${Date.now()}`,
        expectedAdditionalAmount: previewResponse.summary.additionalAmount,
        expectedRefundAmount: previewResponse.summary.refundAmount,
        expectedNetAmount: previewResponse.summary.netAmount,
      })
      .then(async (response) => {
        setConfirmResponse(response);
        if (response.settlementType === 'COLLECT_PAYMENT') {
          setConfirmModalStage('payment');
          return;
        }
        await refreshSelectionsFromServer();
        setResultVariant(response.settlementType === 'REFUND' ? 'refund_submitted' : 'saved');
        setConfirmModalStage('result');
      })
      .catch((error) => {
        setPreviewError(getErrorMessage(error, 'Unable to confirm extras changes.'));
      })
      .finally(() => {
        setConfirmSubmitting(false);
      });
  };

  const openServiceChangeResult = useCallback(
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

  const createServiceChangePayment = async () => {
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
      const response = await createServiceChangePaymentLink({
        bookingId: manageBookingId,
        serviceChangeSettlementId: confirmResponse.settlementId,
        method: selectedPaymentMethod,
      });
      const paymentUrl = response.action?.paymentUrl ?? response.payment.paymentUrl ?? null;
      if (paymentUrl && !response.action?.qrData && !response.payment.qrData) {
        const paymentId = resolvePaymentId(response);
        if (paymentId != null) {
          storeServiceChangeRedirectContext({
            paymentId,
            amount: Math.abs(amountDueNow),
            currency: confirmResponse?.currency ?? previewResponse?.currency ?? currency,
          });
        }
        window.location.assign(paymentUrl);
        return;
      }
      setPaymentUiState((current) => ({ ...current, activePayment: response }));
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(
          error,
          'Could not create the payment code. Please try again.'
        ),
      }));
    } finally {
      setPaymentUiState((current) => ({ ...current, creatingPayment: false }));
    }
  };

  const checkServiceChangePaymentStatus = useCallback(async () => {
    const paymentId = resolvePaymentId(paymentUiState.activePayment);
    if (paymentId == null) return;
    setPaymentUiState((current) => ({
      ...current,
      checkingPaymentStatus: true,
      paymentError: null,
    }));
    try {
      const response = await getPaymentStatus(paymentId);
      const status = (response.payment?.status as PaymentStatus | undefined) ?? null;
      setPaymentUiState((current) => ({ ...current, paymentStatusOverride: status }));
      if (status === 'SUCCESS') {
        const variant = resolveMockManageBookingVariant();
        if (variant) commitMockManageBookingVariant(variant);
        await refreshSelectionsFromServer();
      }
      const nextVariant = mapPaymentStatusToResultVariant(status);
      if (nextVariant) {
        openServiceChangeResult(nextVariant, {
          amount: Math.abs(amountDueNow),
          currency: confirmResponse?.currency ?? previewResponse?.currency ?? currency,
        });
      }
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(error, 'Could not check payment status. Please try again.'),
      }));
    } finally {
      setPaymentUiState((current) => ({ ...current, checkingPaymentStatus: false }));
    }
  }, [
    amountDueNow,
    confirmResponse?.currency,
    currency,
    openServiceChangeResult,
    paymentUiState.activePayment,
    previewResponse?.currency,
  ]);

  const cancelCreatedServiceChangePayment = async () => {
    const paymentId = resolvePaymentId(paymentUiState.activePayment);
    if (paymentId == null) {
      setPaymentUiState((current) => ({ ...current, activePayment: null }));
      return;
    }
    setPaymentUiState((current) => ({ ...current, cancelingPayment: true, paymentError: null }));
    try {
      await cancelPayment(paymentId, 'Service change payment cancelled');
      openServiceChangeResult('payment_cancelled', {
        amount: Math.abs(amountDueNow),
        currency: confirmResponse?.currency ?? previewResponse?.currency ?? currency,
      });
    } catch (error) {
      setPaymentUiState((current) => ({
        ...current,
        paymentError: getErrorMessage(error, 'Could not cancel the payment. Please try again.'),
      }));
    } finally {
      setPaymentUiState((current) => ({ ...current, cancelingPayment: false }));
    }
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
        void (
          resolvedStatus === 'SUCCESS'
            ? (() => {
                const variant = resolveMockManageBookingVariant();
                if (variant) commitMockManageBookingVariant(variant);
                return refreshSelectionsFromServer();
              })()
            : Promise.resolve()
        ).finally(() => {
          openServiceChangeResult(nextVariant, {
            amount: Math.abs(amountDueNow),
            currency: confirmResponse?.currency ?? previewResponse?.currency ?? currency,
          });
        });
      }
      return;
    }

    const timer = window.setInterval(() => {
      void checkServiceChangePaymentStatus();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    amountDueNow,
    checkServiceChangePaymentStatus,
    confirmResponse?.currency,
    currency,
    openServiceChangeResult,
    paymentUiState.activePayment,
    paymentUiState.paymentStatusOverride,
    previewResponse?.currency,
  ]);

  const closeServiceChangePaymentCard = () => {
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
      openServiceChangeResult(nextVariant, {
        amount: Math.abs(amountDueNow),
        currency: confirmResponse?.currency ?? previewResponse?.currency ?? currency,
      });
    }
  };

  const handledServiceChangeReturnRef = useRef<string | null>(null);
  useEffect(() => {
    if (manageBookingId == null) return;
    const params = new URLSearchParams(location.search);
    const storedRedirectContext = readServiceChangeRedirectContext();
    const rawPaymentId = params.get('serviceChangePaymentId') ?? params.get('paymentId');
    const serviceChangeReturn = params.get('serviceChangeReturn') === '1' || rawPaymentId != null;
    if (!serviceChangeReturn && !rawPaymentId) return;

    const paymentId = Number(rawPaymentId ?? storedRedirectContext?.paymentId ?? NaN);
    if (!Number.isFinite(paymentId) || paymentId <= 0) return;

    const handledKey = `${manageBookingId}:${paymentId}:${location.search}`;
    if (handledServiceChangeReturnRef.current === handledKey) return;
    handledServiceChangeReturnRef.current = handledKey;

    const amount = storedRedirectContext?.amount ?? Math.abs(amountDueNow);
    const resolvedCurrency = storedRedirectContext?.currency ?? currency;
    let cancelled = false;
    let timer: number | null = null;

    const cleanupUrl = () => {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('serviceChangeReturn');
      nextParams.delete('serviceChangePaymentId');
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

    const finishWithVariant = (variant: ConfirmResultVariant) => {
      clearServiceChangeRedirectContext();
      cleanupUrl();
      if (variant === 'saved') {
        void refreshSelectionsFromServer().finally(() => {
          openServiceChangeResult(variant, { amount, currency: resolvedCurrency });
        });
        return;
      }
      openServiceChangeResult(variant, { amount, currency: resolvedCurrency });
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
    amountDueNow,
    currency,
    location.pathname,
    location.search,
    manageBookingId,
    navigate,
    openServiceChangeResult,
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

      <main className="mx-auto min-h-svh w-full max-w-400 px-6 pb-32 pt-24 sm:pt-28 md:px-8">
        <div className="mb-8">
          <div className="mb-2 text-[0.72rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            Add extras
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">
            Baggage, meals &amp; more
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
            Tailor baggage, meals and other services per passenger and per flight. You can save and
            continue later.
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

        <FlightTabRow
          itineraries={itineraries}
          activeFlightId={activeFlightId}
          onSelect={setActiveFlightId}
          flightSummaries={flightSummaries}
        />

        <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <PassengerListColumn
            passengers={passengers}
            activePassengerId={activePassengerId}
            activeFlightId={activeFlightId}
            seatLookup={seatLookup}
            passengerDeltas={passengerDeltas}
            currency={currency}
            onSelect={setActivePassengerId}
          />

          <ServiceCatalogColumn
            activePassenger={passengers.find((p) => p.passengerId === activePassengerId) ?? null}
            activeItinerary={activeItinerary}
            serviceGroups={serviceGroups}
            activeGroup={activeGroup}
            activeServiceId={activeServiceId}
            onSelectGroup={setActiveServiceId}
            activeSelections={activePassengerSelections}
            onToggleOption={handleToggleOption}
            onApplyToAll={handleApplyToAll}
            loading={canLoadCatalog && servicesQuery.isPending}
            error={
              servicesQuery.isError
                ? servicesQuery.error instanceof Error
                  ? servicesQuery.error.message
                  : 'Unable to load extras catalog right now.'
                : null
            }
            baggageIncludedKg={activeItinerary?.baggageHandKg ?? null}
          />

          <ServiceSummaryColumn
            previewOption={previewOption}
            activePassengerName={
              passengers.find((p) => p.passengerId === activePassengerId)
                ? `${passengers.find((p) => p.passengerId === activePassengerId)?.lastName ?? ''} ${
                    passengers.find((p) => p.passengerId === activePassengerId)?.firstName ?? ''
                  }`.trim()
                : '—'
            }
            activeItinerary={activeItinerary}
            currency={currency}
            itineraries={itineraries}
            passengers={passengers}
            allPassengerDeltas={allPassengerDeltas}
            newCharges={newCharges}
            refunds={refunds}
            amountDueNow={amountDueNow}
            hasChanges={hasChanges}
            saving={saving}
            onConfirm={openConfirmPreview}
            onBack={handleBackToEdit}
          />
        </section>
      </main>

      <SiteFooter />

      {confirmModalOpen ? (
        <ServiceChangeConfirmModal
          stage={confirmModalStage}
          previewLoading={previewLoading}
          previewError={previewError}
          previewResponse={previewResponse}
          passengers={passengers}
          confirmSubmitting={confirmSubmitting}
          currency={currency}
          confirmResponse={confirmResponse}
          resultAmountOverride={resultAmountOverride}
          resultCurrencyOverride={resultCurrencyOverride}
          paymentMethods={paymentMethods}
          paymentMethodsLoading={paymentMethodsQuery.isLoading}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          paymentUiState={paymentUiState}
          resultVariant={resultVariant}
          onClose={closeConfirmFlow}
          onPreviewContinue={continueFromPreview}
          onCreatePayment={createServiceChangePayment}
          onCheckPaymentStatus={checkServiceChangePaymentStatus}
          onCancelPayment={cancelCreatedServiceChangePayment}
          onPaymentCardClose={closeServiceChangePaymentCard}
          onDone={() => {
            closeConfirmFlow();
            navigate('/manage-booking');
          }}
        />
      ) : null}
    </div>
  );
}

function FlightTabRow({
  itineraries,
  activeFlightId,
  onSelect,
  flightSummaries,
}: {
  itineraries: ItineraryItem[];
  activeFlightId: number | null;
  onSelect: (id: number) => void;
  flightSummaries: Array<{ flightId: number; totalExtras: number; totalPassengers: number }>;
}) {
  if (itineraries.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface-lowest p-3 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {itineraries.map((it, idx) => {
          const dir = resolveDirectionLabel(it, idx);
          const active = activeFlightId === it.flightId;
          const summary = flightSummaries.find((entry) => entry.flightId === it.flightId);
          const totalExtras = summary?.totalExtras ?? 0;
          const totalPassengers = summary?.totalPassengers ?? 0;
          const statusText =
            totalExtras > 0 ? `${totalExtras} extras · ${totalPassengers} pax` : 'No extras picked';
          return (
            <button
              type="button"
              key={it.flightId}
              onClick={() => onSelect(it.flightId)}
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
                  {dir}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${
                    active
                      ? 'bg-white/15 text-white'
                      : totalExtras > 0
                        ? 'bg-luxury-gold/20 text-midnight-burgundy'
                        : 'bg-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  {statusText}
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
  );
}

function PassengerListColumn({
  passengers,
  activePassengerId,
  activeFlightId,
  seatLookup,
  passengerDeltas,
  currency,
  onSelect,
}: {
  passengers: ManagePassenger[];
  activePassengerId: number | null;
  activeFlightId: number | null;
  seatLookup: Map<string, string>;
  passengerDeltas: Array<{
    passengerId: number;
    after: SelectedServiceOption[];
    afterTotal: number;
    changed: boolean;
  }>;
  currency: string;
  onSelect: (id: number) => void;
}) {
  return (
    <aside className="flex flex-col gap-3">
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest px-5 py-4">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Passengers
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Tap a passenger to configure their extras for the active flight.
        </p>
      </div>

      {passengers.map((p) => {
        const active = activePassengerId === p.passengerId;
        const seat =
          activeFlightId != null ? seatLookup.get(`${activeFlightId}:${p.passengerId}`) : null;
        const delta = passengerDeltas.find((entry) => entry.passengerId === p.passengerId);
        const extrasCount = delta?.after.length ?? 0;
        const extrasTotal = delta?.afterTotal ?? 0;
        const subtitle = seat ? `Seat ${seat}` : 'No seat yet';

        return (
          <button
            type="button"
            key={p.passengerId}
            onClick={() => onSelect(p.passengerId)}
            className={`flex flex-col gap-3 rounded-2xl bg-surface-lowest p-4 text-left transition-all ${
              active
                ? 'border-2 border-midnight-burgundy bg-luxury-gold/10 shadow-md'
                : 'border border-outline-variant/30 hover:border-midnight-burgundy/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-midnight-burgundy/10 px-2 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
                    {(p.passengerType ?? 'PAX').toUpperCase()}
                  </span>
                  {active ? (
                    <span className="rounded-full bg-midnight-burgundy px-2 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-luxury-gold">
                      Editing
                    </span>
                  ) : null}
                </div>
                <p className="font-bold text-on-surface">
                  {[p.lastName, p.firstName].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-on-surface-variant">{subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`font-headline text-lg font-black ${
                    extrasCount > 0 ? 'text-midnight-burgundy' : 'text-on-surface-variant/50'
                  }`}
                >
                  {extrasCount > 0 ? `+${formatMoney(extrasTotal, currency)}` : '\u2014'}
                </span>
                <span
                  className={`text-[0.6875rem] font-bold ${
                    extrasCount > 0 ? 'text-secondary' : 'text-on-surface-variant/60'
                  }`}
                >
                  {extrasCount > 0 ? `${extrasCount} extras` : 'No extras yet'}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </aside>
  );
}

function ServiceCatalogColumn({
  activePassenger,
  activeItinerary,
  serviceGroups,
  activeGroup,
  activeServiceId,
  onSelectGroup,
  activeSelections,
  onToggleOption,
  onApplyToAll,
  loading,
  error,
  baggageIncludedKg: _baggageIncludedKg,
}: {
  activePassenger: ManagePassenger | null;
  activeItinerary: ItineraryItem | null;
  serviceGroups: ServiceGroup[];
  activeGroup: ServiceGroup | null;
  activeServiceId: number | null;
  onSelectGroup: (id: number) => void;
  activeSelections: SelectedServiceOption[];
  onToggleOption: (option: SelectedServiceOption) => void;
  onApplyToAll: () => void | Promise<void>;
  loading: boolean;
  error: string | null;
  baggageIncludedKg: number | null;
}) {
  const passengerName = activePassenger
    ? `${activePassenger.lastName ?? ''} ${activePassenger.firstName ?? ''}`.trim()
    : '\u2014';
  const routeLabel = activeItinerary
    ? `${activeItinerary.departureAirportCode} \u2192 ${activeItinerary.arrivalAirportCode}`
    : '';

  if (loading) {
    return (
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-8">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading extras catalog...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-8 text-center">
        <p className="font-headline text-lg font-black text-midnight-burgundy">
          No extras available
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          There are no additional services available for this flight and fare.
        </p>
      </div>
    );
  }

  const ActiveIcon = iconForServiceType(activeGroup.serviceType);
  const _isBaggageGroup = activeGroup.serviceType.toUpperCase().includes('BAGGAGE');

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
              Services for {passengerName} {routeLabel ? `\u00B7 ${routeLabel}` : ''}
            </p>
            <p className="mt-2 font-headline text-xl font-black text-on-surface">
              Pick optional add-ons
            </p>
          </div>
          <button
            type="button"
            onClick={onApplyToAll}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 py-2 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40"
          >
            <Copy className="h-4 w-4" strokeWidth={2.25} />
            Apply to all passengers
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {serviceGroups.map((group) => {
            const Icon = iconForServiceType(group.serviceType);
            const isActive = group.serviceId === (activeServiceId ?? activeGroup.serviceId);
            return (
              <button
                key={group.serviceId}
                type="button"
                onClick={() => onSelectGroup(group.serviceId)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'border-midnight-burgundy bg-luxury-gold/10'
                    : 'border-outline-variant/40 bg-surface hover:border-midnight-burgundy/30'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? 'bg-midnight-burgundy text-luxury-gold'
                      : 'bg-surface-container-high text-midnight-burgundy'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-bold ${
                      isActive ? 'text-midnight-burgundy' : 'text-on-surface'
                    }`}
                  >
                    {group.serviceName}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-lowest">
        <header className="flex items-start gap-4 border-b border-outline-variant/30 bg-[linear-gradient(180deg,rgba(125,6,51,0.05),rgba(255,255,255,0.95))] p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-midnight-burgundy text-luxury-gold">
            <ActiveIcon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-lg font-black text-midnight-burgundy">
              {activeGroup.serviceName}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {activeGroup.selectionMode === 'MULTIPLE'
                ? 'You can select multiple options in this group.'
                : 'You can select only one option per flight in this group.'}
            </p>
          </div>
        </header>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          {activeGroup.options.map((option) => {
            const selected = activeSelections.some(
              (entry) => entry.serviceId === option.serviceId && entry.optionId === option.optionId
            );
            return (
              <button
                key={`${option.serviceId}-${option.optionId}`}
                type="button"
                onClick={() => onToggleOption(option)}
                className={`group flex h-full flex-col rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? 'border-midnight-burgundy bg-luxury-gold/10 shadow-[0_8px_20px_rgba(125,6,51,0.08)]'
                    : 'border-outline-variant/40 bg-surface hover:border-midnight-burgundy/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-headline text-base font-black text-midnight-burgundy">
                      {option.name}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-secondary">{option.priceLabel}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] ${
                      selected
                        ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                        : 'border-midnight-burgundy/30 text-midnight-burgundy'
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check className="h-3 w-3" strokeWidth={2.5} /> Selected
                      </>
                    ) : (
                      'Select'
                    )}
                  </span>
                </div>

                {option.imageUrl ? (
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="mt-3 h-24 w-full rounded-lg object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}

                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function _SummaryColumn({
  previewOption,
  activePassengerName,
  activeItinerary,
  currency,
  itineraries: _itineraries,
  passengers,
  passengerDeltas,
  allPassengerDeltas,
  newCharges,
  refunds,
  amountDueNow,
  hasChanges,
  saving,
  onConfirm,
  onBack,
}: {
  previewOption: SelectedServiceOption | null;
  activePassengerName: string;
  activeItinerary: ItineraryItem | null;
  currency: string;
  itineraries: ItineraryItem[];
  passengers: ManagePassenger[];
  passengerDeltas: Array<{
    passengerId: number;
    added: SelectedServiceOption[];
    removed: SelectedServiceOption[];
  }>;
  allPassengerDeltas: Array<{
    flightId: number;
    passengerId: number;
    after: SelectedServiceOption[];
    afterTotal: number;
    changed: boolean;
    delta: number;
  }>;
  newCharges: number;
  refunds: number;
  amountDueNow: number;
  hasChanges: boolean;
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const totalExtras = allPassengerDeltas.reduce((sum, entry) => sum + entry.after.length, 0);
  const netLabel =
    amountDueNow > 0 ? 'Amount due now' : amountDueNow < 0 ? 'Refund to you' : 'No change';
  const netClass =
    amountDueNow > 0
      ? 'text-midnight-burgundy'
      : amountDueNow < 0
        ? 'text-emerald-600'
        : 'text-on-surface-variant';
  const netBox =
    amountDueNow > 0 ? 'bg-luxury-gold/15' : amountDueNow < 0 ? 'bg-emerald-50' : 'bg-surface';
  const netLabelClass = amountDueNow < 0 ? 'text-emerald-700' : 'text-midnight-burgundy';
  const summaryAmountText =
    amountDueNow === 0
      ? '\u2014'
      : amountDueNow > 0
        ? `+${formatMoney(amountDueNow, currency)}`
        : `\u2212${formatMoney(Math.abs(amountDueNow), currency)}`;
  const _selectedPassengerCount = new Set(
    allPassengerDeltas.filter((entry) => entry.after.length > 0).map((entry) => entry.passengerId)
  ).size;
  const canConfirm = hasChanges && !saving;
  const confirmButtonClass = canConfirm
    ? 'border border-midnight-burgundy bg-midnight-burgundy text-white shadow-[0_10px_24px_rgba(125,6,51,0.22)] hover:-translate-y-0.5 hover:bg-[#95104a] hover:shadow-[0_12px_28px_rgba(125,6,51,0.28)]'
    : 'border border-outline-variant/40 bg-[#b66f93] text-luxury-gold opacity-50';
  const visibleItineraries = activeItinerary ? [activeItinerary] : [];

  return (
    <aside className="flex flex-col gap-4">
      <ServiceDetailCard
        previewOption={previewOption}
        passengerName={activePassengerName}
        activeItinerary={activeItinerary}
      />

      <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
            Change summary
          </p>
          <span className="text-[0.6875rem] font-bold text-on-surface-variant">
            {totalExtras} extras · {passengers.length} pax
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {visibleItineraries.map((it, idx) => {
            const dir = resolveDirectionLabel(it, idx);
            return (
              <div key={it.flightId} className="flex flex-col gap-2">
                <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-midnight-burgundy">
                  {dir} · {it.departureAirportCode} → {it.arrivalAirportCode}
                </p>
                {passengerDeltas.every((entry) => entry.added.length === 0) ? (
                  <p className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                    No extras picked yet
                  </p>
                ) : null}
                {passengerDeltas.flatMap((entry) =>
                  entry.added.map((option) => {
                    const passenger = passengers.find((p) => p.passengerId === entry.passengerId);
                    const passengerName = passenger
                      ? [passenger.lastName, passenger.firstName].filter(Boolean).join(' ')
                      : `Passenger #${entry.passengerId}`;
                    return (
                      <div
                        key={`${it.flightId}-${entry.passengerId}-${option.serviceId}-${option.optionId}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-on-surface">{option.name}</p>
                          <p className="text-xs text-on-surface-variant">{passengerName}</p>
                        </div>
                        <span className="font-bold text-midnight-burgundy">
                          +{formatMoney(option.price, currency)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        <div className="my-4 h-px w-full bg-outline-variant/40" />

        <dl className="flex flex-col gap-2 text-sm">
          <Row
            k="Additional charges"
            v={newCharges > 0 ? `+${formatMoney(newCharges, currency)}` : '\u2014'}
          />
          <Row
            k="Refunds"
            v={refunds > 0 ? `\u2212${formatMoney(refunds, currency)}` : '\u2014'}
            negative={refunds > 0}
          />
        </dl>

        <div className={`mt-4 flex items-center justify-between rounded-xl ${netBox} px-4 py-3`}>
          <div>
            <p
              className={`text-[0.6875rem] font-black uppercase tracking-[0.22em] ${netLabelClass}`}
            >
              {netLabel}
            </p>
            <p className="text-[0.6875rem] text-on-surface-variant">
              {totalExtras} extras across {passengers.length} passengers
            </p>
          </div>
          <p className={`font-headline text-2xl font-black ${netClass}`}>{summaryAmountText}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={saving || !previewOption}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface px-4 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition-all ${
              confirmButtonClass
            } ${canConfirm ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Save & continue
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function ServiceSummaryColumn({
  previewOption,
  activePassengerName,
  activeItinerary,
  currency,
  itineraries,
  passengers,
  allPassengerDeltas,
  newCharges: _newCharges,
  refunds: _refunds,
  amountDueNow,
  hasChanges,
  saving,
  onConfirm,
  onBack,
}: {
  previewOption: SelectedServiceOption | null;
  activePassengerName: string;
  activeItinerary: ItineraryItem | null;
  currency: string;
  itineraries: ItineraryItem[];
  passengers: ManagePassenger[];
  allPassengerDeltas: Array<{
    flightId: number;
    passengerId: number;
    after: SelectedServiceOption[];
    afterTotal: number;
  }>;
  newCharges: number;
  refunds: number;
  amountDueNow: number;
  hasChanges: boolean;
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const totalExtras = allPassengerDeltas.reduce((sum, entry) => sum + entry.after.length, 0);
  const netLabel =
    amountDueNow > 0 ? 'Amount due now' : amountDueNow < 0 ? 'Refund to you' : 'No change';
  const netClass =
    amountDueNow > 0
      ? 'text-midnight-burgundy'
      : amountDueNow < 0
        ? 'text-emerald-600'
        : 'text-on-surface-variant';
  const netBox =
    amountDueNow > 0 ? 'bg-luxury-gold/15' : amountDueNow < 0 ? 'bg-emerald-50' : 'bg-surface';
  const netLabelClass = amountDueNow < 0 ? 'text-emerald-700' : 'text-midnight-burgundy';
  const summaryAmountText =
    amountDueNow === 0
      ? '\u2014'
      : amountDueNow > 0
        ? `+${formatMoney(amountDueNow, currency)}`
        : `\u2212${formatMoney(Math.abs(amountDueNow), currency)}`;
  const selectedPassengerCount = new Set(
    allPassengerDeltas.filter((entry) => entry.after.length > 0).map((entry) => entry.passengerId)
  ).size;
  const canConfirm = hasChanges && !saving;
  const confirmButtonClass = canConfirm
    ? 'border border-midnight-burgundy bg-midnight-burgundy text-white shadow-[0_10px_24px_rgba(125,6,51,0.22)] hover:-translate-y-0.5 hover:bg-[#95104a] hover:shadow-[0_12px_28px_rgba(125,6,51,0.28)]'
    : 'border border-outline-variant/40 bg-[#b66f93] text-luxury-gold opacity-50';

  return (
    <aside className="flex flex-col gap-4">
      <ServiceDetailCard
        previewOption={previewOption}
        passengerName={activePassengerName}
        activeItinerary={activeItinerary}
      />

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
          {itineraries.map((itinerary, idx) => {
            const direction = resolveDirectionLabel(itinerary, idx);
            const flightRows = passengers.map((passenger) => {
              const delta = allPassengerDeltas.find(
                (entry) =>
                  entry.flightId === itinerary.flightId &&
                  entry.passengerId === passenger.passengerId
              );
              return {
                passengerId: passenger.passengerId,
                passengerName: [passenger.lastName, passenger.firstName].filter(Boolean).join(' '),
                delta,
              };
            });

            return (
              <div
                key={itinerary.flightId}
                className="rounded-xl border border-outline-variant/30 bg-surface p-3"
              >
                <div>
                  <p className="text-[0.625rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
                    {direction} · {itinerary.departureAirportCode} → {itinerary.arrivalAirportCode}
                  </p>
                  <p className="text-sm font-bold text-on-surface">
                    {itinerary.flightNumber} · {formatFlightDate(itinerary.departureTime)}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {flightRows.map((row) => {
                    const selectionCount = row.delta?.after.length ?? 0;
                    const statusText =
                      selectionCount > 0
                        ? selectionCount === 1
                          ? (row.delta?.after[0]?.name ?? '1 extra selected')
                          : `${selectionCount} extras selected`
                        : 'No extras selected';
                    const amountText =
                      row.delta && row.delta.afterTotal > 0
                        ? `+${formatMoney(row.delta.afterTotal, currency)}`
                        : '\u2014';
                    const amountClass =
                      row.delta && row.delta.afterTotal > 0
                        ? 'text-midnight-burgundy'
                        : 'text-on-surface-variant/60';

                    return (
                      <div
                        key={`${itinerary.flightId}-${row.passengerId}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-on-surface">
                            {row.passengerName}
                          </p>
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
            v={amountDueNow > 0 ? `+${formatMoney(amountDueNow, currency)}` : '\u2014'}
          />
          <Row
            k="Refunds"
            v={
              amountDueNow < 0 ? `\u2212${formatMoney(Math.abs(amountDueNow), currency)}` : '\u2014'
            }
            negative={amountDueNow < 0}
          />
        </dl>

        <div className={`mt-4 flex items-center justify-between rounded-xl ${netBox} px-4 py-3`}>
          <div>
            <p
              className={`text-[0.6875rem] font-black uppercase tracking-[0.22em] ${netLabelClass}`}
            >
              {netLabel}
            </p>
            <p className="text-[0.6875rem] text-on-surface-variant">
              {totalExtras} extras across {selectedPassengerCount || passengers.length} passengers
            </p>
          </div>
          <p className={`font-headline text-2xl font-black ${netClass}`}>{summaryAmountText}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={saving || !previewOption}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface px-4 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition-all ${
              confirmButtonClass
            } ${canConfirm ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Save & continue
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function ServiceChangeConfirmModal({
  stage,
  previewLoading,
  previewError,
  previewResponse,
  passengers,
  confirmSubmitting,
  currency,
  confirmResponse,
  resultAmountOverride,
  resultCurrencyOverride,
  paymentMethods,
  paymentMethodsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  paymentUiState,
  resultVariant,
  onClose,
  onPreviewContinue,
  onCreatePayment,
  onCheckPaymentStatus,
  onCancelPayment,
  onPaymentCardClose,
  onDone,
}: {
  stage: ConfirmModalStage;
  previewLoading: boolean;
  previewError: string | null;
  previewResponse: ServiceChangePreviewResponse | null;
  passengers: ManagePassenger[];
  confirmSubmitting: boolean;
  currency: string;
  confirmResponse: ServiceChangeConfirmResponse | null;
  resultAmountOverride: number | null;
  resultCurrencyOverride: string | null;
  paymentMethods: PaymentMethod[];
  paymentMethodsLoading: boolean;
  selectedPaymentMethod: string;
  onSelectPaymentMethod: (value: string) => void;
  paymentUiState: PaymentUiState;
  resultVariant: ConfirmResultVariant;
  onClose: () => void;
  onPreviewContinue: () => void;
  onCreatePayment: () => void;
  onCheckPaymentStatus: () => void | Promise<void>;
  onCancelPayment: () => void | Promise<void>;
  onPaymentCardClose: () => void;
  onDone: () => void;
}) {
  if (paymentUiState.activePayment) {
    return (
      <PaymentCard
        data={paymentUiState.activePayment}
        onClose={onPaymentCardClose}
        onRegenerate={onCreatePayment}
        onCheckStatus={onCheckPaymentStatus}
        onCancel={onCancelPayment}
        onExpired={onDone}
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
          <ServiceChangePreviewStage
            previewLoading={previewLoading}
            previewError={previewError}
            previewResponse={previewResponse}
            passengers={passengers}
            confirmSubmitting={confirmSubmitting}
            currency={currency}
            onContinue={onPreviewContinue}
            onBack={onClose}
          />
        ) : stage === 'payment' ? (
          <ServiceChangePaymentStage
            previewResponse={previewResponse}
            confirmResponse={confirmResponse}
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
          <ServiceChangeResultStage
            variant={resultVariant}
            amount={Math.abs(
              resultAmountOverride ??
                confirmResponse?.summary.netAmount ??
                previewResponse?.summary.netAmount ??
                0
            )}
            currency={
              resultCurrencyOverride ??
              confirmResponse?.currency ??
              previewResponse?.currency ??
              currency
            }
            onDone={onDone}
          />
        )}
      </div>
    </div>
  );
}

function ServiceChangePreviewStage({
  previewLoading,
  previewError,
  previewResponse,
  passengers: _passengers,
  confirmSubmitting,
  currency,
  onContinue,
  onBack,
}: {
  previewLoading: boolean;
  previewError: string | null;
  previewResponse: ServiceChangePreviewResponse | null;
  passengers: ManagePassenger[];
  confirmSubmitting: boolean;
  currency: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  const title =
    previewResponse?.settlementType === 'COLLECT_PAYMENT'
      ? 'Additional payment required'
      : previewResponse?.settlementType === 'REFUND'
        ? 'Confirm refund'
        : 'Confirm extras changes';
  const ctaLabel =
    previewResponse?.settlementType === 'COLLECT_PAYMENT'
      ? 'Continue'
      : previewResponse?.settlementType === 'REFUND'
        ? 'Confirm refund'
        : 'Confirm changes';
  const filteredPreviewItems =
    previewResponse?.settlementType === 'COLLECT_PAYMENT'
      ? (previewResponse?.items ?? []).filter((item) => item.delta > 0)
      : previewResponse?.settlementType === 'REFUND'
        ? (previewResponse?.items ?? []).filter((item) => item.delta < 0)
        : (previewResponse?.items ?? []);

  if (previewLoading) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-midnight-burgundy" />
        <h2 className="font-headline text-xl font-black text-on-surface">
          Validating extras changes...
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          We are recalculating the latest ancillary charges and refunds.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start gap-3 pr-10">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-midnight-burgundy/10">
          {previewResponse?.settlementType === 'COLLECT_PAYMENT' ? (
            <CreditCard className="h-5 w-5 text-midnight-burgundy" strokeWidth={2} />
          ) : previewResponse?.settlementType === 'REFUND' ? (
            <Wallet className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          )}
        </div>
        <div>
          <h2 className="font-headline text-xl font-black text-on-surface">{title}</h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Review the latest service changes before continuing.
          </p>
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
            {filteredPreviewItems.map((item) => (
              <div
                key={`${item.passengerId}-${item.flightId ?? 'booking'}-${item.optionId}`}
                className="rounded-xl border border-outline-variant/30 bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {item.optionName ?? 'Selected service'}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">{item.passengerName}</p>
                    <p className="mt-1 text-xs font-semibold text-on-surface">
                      {item.serviceName ?? item.serviceType ?? 'Service'} · Qty {item.quantity}
                    </p>
                    {item.oldAmount > 0 ? (
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {`Service charge: ${formatMoney(item.oldAmount, previewResponse.currency)} \u2192 ${formatMoney(item.newAmount, previewResponse.currency)}`}
                      </p>
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
            {previewResponse.settlementType !== 'REFUND' ? (
              <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">Additional charges</dt>
                <dd className="font-bold text-on-surface">
                  {previewResponse.summary.additionalAmount > 0
                    ? `+${formatMoney(previewResponse.summary.additionalAmount, previewResponse.currency)}`
                    : '—'}
                </dd>
              </div>
            ) : null}
            {previewResponse.settlementType !== 'COLLECT_PAYMENT' ? (
              <div
                className={`${previewResponse.settlementType !== 'REFUND' ? 'mt-2 ' : ''}flex items-center justify-between`}
              >
                <dt className="text-on-surface-variant">Refunds</dt>
                <dd className="font-bold text-emerald-600">
                  {previewResponse.summary.refundAmount > 0
                    ? `-${formatMoney(previewResponse.summary.refundAmount, previewResponse.currency)}`
                    : '—'}
                </dd>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3">
              <dt className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
                {previewResponse.settlementType === 'REFUND' ? 'Net refund' : 'Net amount'}
              </dt>
              <dd className="font-headline text-xl font-black text-midnight-burgundy">
                {previewResponse.summary.netAmount === 0
                  ? '—'
                  : formatMoney(
                      Math.abs(previewResponse.summary.netAmount),
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
          onClick={onBack}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-5 text-sm font-bold text-midnight-burgundy transition-colors hover:border-midnight-burgundy/40"
        >
          Back to edit
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

function ServiceChangePaymentStage({
  previewResponse,
  confirmResponse,
  paymentMethods,
  paymentMethodsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  creatingPayment,
  paymentError,
  onCancel,
  onCreatePayment,
}: {
  previewResponse: ServiceChangePreviewResponse | null;
  confirmResponse: ServiceChangeConfirmResponse | null;
  paymentMethods: PaymentMethod[];
  paymentMethodsLoading: boolean;
  selectedPaymentMethod: string;
  onSelectPaymentMethod: (value: string) => void;
  creatingPayment: boolean;
  paymentError: string | null;
  onCancel: () => void;
  onCreatePayment: () => void;
}) {
  const amountDue = confirmResponse?.summary.netAmount ?? previewResponse?.summary.netAmount ?? 0;
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
            Complete the additional payment to finalize these extras changes.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-outline-variant/30 bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">Amount due</p>
          <p className="font-headline text-2xl font-black text-midnight-burgundy">
            {formatMoney(
              Math.abs(amountDue),
              confirmResponse?.currency ?? previewResponse?.currency ?? 'VND'
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {paymentMethodsLoading ? (
          <div className="rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm text-on-surface-variant">
            Loading payment methods...
          </div>
        ) : (
          paymentMethods.map((method) => (
            <button
              key={method.code}
              type="button"
              onClick={() => onSelectPaymentMethod(method.code)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                selectedPaymentMethod === method.code
                  ? 'border-midnight-burgundy bg-luxury-gold/10'
                  : 'border-outline-variant/30 bg-surface'
              }`}
            >
              <span className="font-semibold text-on-surface">{method.label}</span>
              {selectedPaymentMethod === method.code ? (
                <Check className="h-4 w-4 text-midnight-burgundy" />
              ) : null}
            </button>
          ))
        )}
      </div>

      {paymentError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {paymentError}
        </div>
      ) : null}

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
          disabled={!selectedPaymentMethod || creatingPayment}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingPayment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" /> Continue to payment
            </>
          )}
        </button>
      </div>
    </>
  );
}

function ServiceChangeResultStage({
  variant,
  amount,
  currency,
  onDone,
}: {
  variant: ConfirmResultVariant;
  amount: number;
  currency: string;
  onDone: () => void;
}) {
  const isError =
    variant === 'payment_failed' ||
    variant === 'payment_cancelled' ||
    variant === 'payment_expired' ||
    variant === 'error';
  const title =
    variant === 'refund_submitted'
      ? 'Refund submitted'
      : isError
        ? 'Payment not completed'
        : 'Extras updated';
  const message =
    variant === 'refund_submitted'
      ? `A refund of ${formatMoney(amount, currency)} has been initiated.`
      : isError
        ? 'The payment was not completed. You can return and try again.'
        : 'Your ancillary service changes have been saved successfully.';

  return (
    <>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isError ? 'bg-rose-100' : 'bg-emerald-100'
          }`}
        >
          {isError ? (
            <X className="h-5 w-5 text-rose-600" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          )}
        </div>
        <div className="pt-1">
          <h2 className="font-headline text-xl font-black text-on-surface">{title}</h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy px-5 text-sm font-bold text-luxury-gold transition-all hover:brightness-110"
        >
          Done
        </button>
      </div>
    </>
  );
}

function ServiceDetailCard({
  previewOption,
  passengerName,
  activeItinerary,
}: {
  previewOption: SelectedServiceOption | null;
  passengerName: string;
  activeItinerary: ItineraryItem | null;
}) {
  if (!previewOption) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-lowest p-5 text-center">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Service details
        </p>
        <p className="mt-3 text-sm text-on-surface-variant">
          Tap an option to preview the details and price impact here.
        </p>
      </div>
    );
  }

  const Icon = iconForServiceType(previewOption.serviceType);
  const routeLabel = activeItinerary
    ? `${activeItinerary.flightNumber} \u00B7 ${activeItinerary.departureAirportCode} \u2192 ${activeItinerary.arrivalAirportCode}`
    : '';

  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-lowest p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          Service details
        </p>
        <span className="rounded-full bg-luxury-gold/20 px-2.5 py-0.5 text-[0.625rem] font-black uppercase tracking-[0.18em] text-midnight-burgundy">
          {previewOption.serviceType.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-midnight-burgundy p-4 text-luxury-gold">
        <div className="flex items-start justify-between gap-3">
          <p className="font-headline text-xl font-black text-white">{previewOption.name}</p>
          <Icon className="h-7 w-7 text-luxury-gold" strokeWidth={1.75} />
        </div>
        <p className="font-headline text-lg font-black text-white">{previewOption.priceLabel}</p>
      </div>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <Row k="Passenger" v={passengerName} />
        <Row k="Flight" v={routeLabel || '\u2014'} highlight />
        <Row k="Date" v={formatFlightDate(activeItinerary?.departureTime)} />
        <Row k="Charge" v={`+${previewOption.priceLabel}`} highlight />
      </dl>

      <p className="mt-4 rounded-lg bg-surface-container-low px-3 py-2 text-xs leading-5 text-on-surface-variant">
        {previewOption.description ||
          'Service can be cancelled up to 24 hours before departure and refunded to the original payment method.'}
      </p>
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
