import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Clock3,
  PlaneTakeoff,
  Search,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TripCard, { TripCardData } from '../components/booking/TripCard';
import TripDetailSidebar from '../components/booking/TripDetailSidebar';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import { bookingService } from '../services/booking.service';
import type {
  TripDetailResult,
  TripHistoryItem,
  TripHistoryQuery,
  TripHistoryStatus,
} from '../types/booking.types';

type TabType = 'upcoming' | 'completed' | 'cancelled';
type TimeFilterOption = 'all' | '3m' | '6m' | '12m' | 'custom';

type CustomRange = {
  from: string;
  to: string;
};

type TripDetailTarget = {
  bookingId: number;
  flightId: number;
};

type ManageActionRouteContext = {
  bookingId: number;
  flightId: number;
  pnrCode: string;
  lastName: string;
  expiresAt: string | null;
};

const TABS: Array<{ key: TabType; label: string; status: TripHistoryStatus }> = [
  { key: 'upcoming', label: 'Upcoming', status: 'UPCOMING' },
  { key: 'completed', label: 'Completed', status: 'COMPLETED' },
  { key: 'cancelled', label: 'Cancelled', status: 'CANCELLED' },
];

const TIME_FILTER_OPTIONS: Array<{
  key: TimeFilterOption;
  label: string;
  hint?: string;
  icon: typeof CalendarRange;
}> = [
  { key: 'all', label: 'All time', icon: CalendarRange },
  { key: '3m', label: 'Last 3 months', icon: Clock3 },
  { key: '6m', label: 'Last 6 months', icon: CalendarDays },
  { key: '12m', label: 'Last 12 months', icon: CalendarDays },
  {
    key: 'custom',
    label: 'Custom range',
    hint: 'Pick start and end dates',
    icon: CalendarRange,
  },
];

function formatDateLabel(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatCardDateParts(flightDate: string): Pick<TripCardData, 'date' | 'dateDay' | 'dateMonth'> {
  const date = new Date(`${flightDate}T00:00:00`);

  return {
    date: date.toLocaleDateString('en-US'),
    dateDay: date.toLocaleDateString('en-US', { day: '2-digit' }),
    dateMonth: date
      .toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
      .toUpperCase(),
  };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapTripStatusToCardStatus(status: TripHistoryStatus): TripCardData['status'] {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'upcoming';
  }
}

function mapTripItemToCardData(item: TripHistoryItem): TripCardData {
  const dateParts = formatCardDateParts(item.flightDate);

  return {
    id: `${item.bookingId}-${item.flightId}`,
    bookingId: item.bookingId,
    flightId: item.flightId,
    pnrCode: item.pnrCode,
    status: mapTripStatusToCardStatus(item.tripStatus),
    statusLabel: item.tripStatusLabel,
    date: dateParts.date,
    dateDay: dateParts.dateDay,
    dateMonth: dateParts.dateMonth,
    route: `${item.departureAirportCode} → ${item.arrivalAirportCode}`,
    departureTime: formatTime(item.departureTime),
    arrivalTime: formatTime(item.arrivalTime),
    flightNumber: item.flightNumber,
    cabin: item.cabinClass,
    passengerCount: item.passengerCount,
    paymentStatus: item.paymentStatusLabel,
    amount: item.totalAmount.toLocaleString('en-US'),
    currency: item.currency,
    canManageBooking: item.actions.canManageBooking,
    canCheckIn: item.actions.canCheckIn,
  };
}

function getDateRangeFromFilter(
  selectedTimeFilter: TimeFilterOption,
  customRangeApplied: CustomRange
): Pick<TripHistoryQuery, 'fromDate' | 'toDate'> {
  if (selectedTimeFilter === 'custom') {
    return {
      fromDate: customRangeApplied.from || undefined,
      toDate: customRangeApplied.to || undefined,
    };
  }

  if (selectedTimeFilter === 'all') {
    return {};
  }

  const now = new Date();
  const fromDate = new Date(now);

  if (selectedTimeFilter === '3m') fromDate.setMonth(fromDate.getMonth() - 3);
  if (selectedTimeFilter === '6m') fromDate.setMonth(fromDate.getMonth() - 6);
  if (selectedTimeFilter === '12m') fromDate.setFullYear(fromDate.getFullYear() - 1);

  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

export default function TripHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilterOption>('all');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [customRangeDraft, setCustomRangeDraft] = useState<CustomRange>({ from: '', to: '' });
  const [customRangeApplied, setCustomRangeApplied] = useState<CustomRange>({ from: '', to: '' });
  const [selectedTripTarget, setSelectedTripTarget] = useState<TripDetailTarget | null>(null);
  const timeFilterRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const currentTab = useMemo(() => TABS.find((tab) => tab.key === activeTab), [activeTab]);
  const dateRange = useMemo(
    () => getDateRangeFromFilter(selectedTimeFilter, customRangeApplied),
    [customRangeApplied, selectedTimeFilter]
  );
  const tripHistoryQuery = useMemo<TripHistoryQuery>(
    () => ({
      status: currentTab?.status,
      query: deferredSearchQuery || undefined,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    }),
    [currentTab?.status, dateRange.fromDate, dateRange.toDate, deferredSearchQuery]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!timeFilterRef.current?.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false);
        setIsCustomRangeOpen(false);
      }
    }

    if (isTimeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimeDropdownOpen]);

  const tabCountsQuery = useQuery({
    queryKey: ['my-trips', 'counts'],
    queryFn: async () => {
      const results = await Promise.all(TABS.map((tab) => bookingService.getMyTrips({ status: tab.status })));
      return {
        upcoming: results[0]?.items.length ?? 0,
        completed: results[1]?.items.length ?? 0,
        cancelled: results[2]?.items.length ?? 0,
      } satisfies Record<TabType, number>;
    },
    staleTime: 30_000,
  });

  const tripsQuery = useQuery({
    queryKey: [
      'my-trips',
      currentTab?.status ?? null,
      deferredSearchQuery,
      dateRange.fromDate ?? null,
      dateRange.toDate ?? null,
    ],
    queryFn: () => bookingService.getMyTrips(tripHistoryQuery),
    placeholderData: (previousData) => previousData,
  });

  const tripDetailQuery = useQuery<TripDetailResult>({
    queryKey: [
      'trip-detail',
      selectedTripTarget?.bookingId ?? null,
      selectedTripTarget?.flightId ?? null,
    ],
    queryFn: () =>
      bookingService.getTripDetail(selectedTripTarget!.bookingId, selectedTripTarget!.flightId),
    enabled: isSidebarOpen && Boolean(selectedTripTarget),
  });

  useEffect(() => {
    if (!tabCountsQuery.isError) return;
    toast.error('Unable to load trip counts right now.', { id: 'trip-history-counts-error' });
  }, [tabCountsQuery.isError]);

  useEffect(() => {
    if (!tripsQuery.isError) return;
    toast.error('Unable to load your trips right now.', { id: 'trip-history-list-error' });
  }, [tripsQuery.isError]);

  useEffect(() => {
    if (!tripDetailQuery.isError) return;
    toast.error('Unable to load trip details.', { id: 'trip-history-detail-error' });
  }, [tripDetailQuery.isError]);

  const handleViewDetail = (trip: TripCardData) => {
    if (!trip.bookingId || !trip.flightId) return;

    setIsSidebarOpen(true);
    setSelectedTripTarget({
      bookingId: trip.bookingId,
      flightId: trip.flightId,
    });
  };

  const buildRouteSearch = (context: ManageActionRouteContext): string => {
    const params = new URLSearchParams(location.search);
    params.set('pnr', context.pnrCode);
    params.set('lastName', context.lastName);
    if (context.expiresAt) params.set('expiresAt', context.expiresAt);
    else params.delete('expiresAt');
    const search = params.toString();
    return search ? `?${search}` : '';
  };

  const buildRouteContext = async (
    trip: TripCardData
  ): Promise<ManageActionRouteContext | null> => {
    if (!trip.bookingId || !trip.flightId) return null;
    try {
      const detail = await bookingService.getTripDetail(trip.bookingId, trip.flightId);
      return {
        bookingId: detail.booking.bookingId,
        flightId: detail.segment.flightId,
        pnrCode: detail.booking.pnrCode,
        lastName: detail.passengers[0]?.lastName ?? '',
        expiresAt: null,
      };
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load this trip action right now.'
      );
      return null;
    }
  };

  const handleManageBooking = async (trip: TripCardData) => {
    const context = await buildRouteContext(trip);
    if (!context) return;
    navigate({
      pathname: `/manage-booking/${context.bookingId}`,
      search: buildRouteSearch(context),
    });
  };

  const handleCheckIn = async (trip: TripCardData) => {
    const context = await buildRouteContext(trip);
    if (!context) return;
    navigate({
      pathname: `/manage-booking/check-in/${context.bookingId}/${context.flightId}`,
      search: buildRouteSearch(context),
    });
  };

  const selectedTimeFilterLabel = useMemo(() => {
    if (selectedTimeFilter === 'custom' && customRangeApplied.from && customRangeApplied.to) {
      return `${formatDateLabel(customRangeApplied.from)} - ${formatDateLabel(customRangeApplied.to)}`;
    }

    return (
      TIME_FILTER_OPTIONS.find((option) => option.key === selectedTimeFilter)?.label ??
      'All time'
    );
  }, [customRangeApplied.from, customRangeApplied.to, selectedTimeFilter]);

  const canApplyCustomRange =
    Boolean(customRangeDraft.from) &&
    Boolean(customRangeDraft.to) &&
    customRangeDraft.from <= customRangeDraft.to;
  const tabCounts = tabCountsQuery.data ?? {
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  };
  const trips = useMemo(
    () => (tripsQuery.data?.items ?? []).map(mapTripItemToCardData),
    [tripsQuery.data?.items]
  );
  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface">
      <SiteHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-32">
        <section className="mb-8 rounded-[32px] border border-luxury-gold/14 bg-white/92 px-6 py-7 shadow-[0_18px_44px_rgba(125,6,51,0.08)] backdrop-blur-sm sm:px-8 sm:py-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-midnight-burgundy/70">
              Booking Workspace
            </p>
            <h1 className="mt-3 font-headline text-3xl font-black tracking-tight text-on-surface sm:text-[2.5rem]">
              My Trips
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[15px]">
              Track upcoming flights, review completed journeys, and open booking management tasks
              from one workspace.
            </p>
          </div>

          <div className="mt-8 border-b border-luxury-gold/12">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    className={`rounded-t-2xl border-b-2 px-4 py-3 text-sm font-medium transition-all sm:px-5 ${
                      isActive
                        ? 'border-b-error text-error'
                        : 'border-b-transparent text-on-surface-variant hover:text-midnight-burgundy'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label} ({tabCounts[tab.key]})
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mb-5 flex flex-col gap-2.5 rounded-[24px] border border-luxury-gold/12 bg-white/90 p-3 shadow-[0_12px_30px_rgba(125,6,51,0.05)] sm:p-4 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search trips</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by booking reference, destination, or flight number..."
              className="w-full rounded-[20px] border border-luxury-gold/14 bg-surface-lowest py-3 pl-10 pr-4 text-sm text-on-surface outline-none transition focus:border-midnight-burgundy/35 focus:bg-white"
            />
            <Search
              className="absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-midnight-burgundy/60"
              strokeWidth={1.9}
            />
          </label>

          <div className="flex gap-2.5 lg:shrink-0">
            <div ref={timeFilterRef} className="relative">
              <button
                className="flex min-h-11 items-center gap-2 rounded-[20px] border border-luxury-gold/14 bg-surface-lowest px-3.5 text-sm font-medium text-on-surface transition hover:border-luxury-gold/28 hover:bg-white"
                onClick={() => setIsTimeDropdownOpen((prev) => !prev)}
              >
                <CalendarRange className="h-4 w-4 text-midnight-burgundy" strokeWidth={1.9} />
                <span>{selectedTimeFilterLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 text-midnight-burgundy/65 transition-transform ${
                    isTimeDropdownOpen ? 'rotate-180' : ''
                  }`}
                  strokeWidth={1.9}
                />
              </button>

              {isTimeDropdownOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-[280px] rounded-[22px] border border-luxury-gold/14 bg-white p-3 shadow-[0_18px_40px_rgba(125,6,51,0.12)]">
                  <p className="px-2 pb-2 text-xs font-semibold text-on-surface-variant">
                    Time range
                  </p>

                  {TIME_FILTER_OPTIONS.map((option) => {
                    const isActive =
                      option.key === selectedTimeFilter &&
                      (option.key !== 'custom' || Boolean(customRangeApplied.from && customRangeApplied.to));
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.key}
                        className={`flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-left text-sm transition ${
                          isActive || (option.key === 'custom' && isCustomRangeOpen)
                            ? 'bg-rose-50 font-semibold text-error'
                            : 'text-on-surface hover:bg-surface-lowest'
                        }`}
                        onClick={() => {
                          if (option.key === 'custom') {
                            setIsCustomRangeOpen(true);
                            setSelectedTimeFilter('custom');
                            if (!customRangeDraft.from && customRangeApplied.from) {
                              setCustomRangeDraft(customRangeApplied);
                            }
                            return;
                          }

                          setSelectedTimeFilter(option.key);
                          setIsCustomRangeOpen(false);
                          setIsTimeDropdownOpen(false);
                        }}
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive || (option.key === 'custom' && isCustomRangeOpen)
                                ? 'text-error'
                                : 'text-on-surface-variant'
                            }`}
                            strokeWidth={1.9}
                          />
                          <span className="flex flex-col">
                            <span>{option.label}</span>
                            {option.hint ? (
                              <span className="text-[11px] font-medium text-on-surface-variant">
                                {option.hint}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        {isActive ? <Check className="h-4 w-4 text-error" strokeWidth={2.1} /> : null}
                      </button>
                    );
                  })}

                  {isCustomRangeOpen ? (
                    <div className="mt-3 rounded-[18px] border border-luxury-gold/14 bg-surface-lowest p-3">
                      <div className="grid gap-3">
                        <label className="grid gap-1.5 text-sm">
                          <span className="text-xs font-semibold text-on-surface-variant">From</span>
                          <input
                            type="date"
                            value={customRangeDraft.from}
                            onChange={(event) =>
                              setCustomRangeDraft((prev) => ({ ...prev, from: event.target.value }))
                            }
                            className="rounded-xl border border-luxury-gold/14 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-midnight-burgundy/35"
                          />
                        </label>

                        <label className="grid gap-1.5 text-sm">
                          <span className="text-xs font-semibold text-on-surface-variant">To</span>
                          <input
                            type="date"
                            value={customRangeDraft.to}
                            min={customRangeDraft.from || undefined}
                            onChange={(event) =>
                              setCustomRangeDraft((prev) => ({ ...prev, to: event.target.value }))
                            }
                            className="rounded-xl border border-luxury-gold/14 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-midnight-burgundy/35"
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          className="flex-1 rounded-xl border border-luxury-gold/14 bg-white px-3 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-lowest"
                          onClick={() => {
                            setCustomRangeDraft({ from: '', to: '' });
                            setCustomRangeApplied({ from: '', to: '' });
                            setSelectedTimeFilter('all');
                            setIsCustomRangeOpen(false);
                          }}
                        >
                          Reset
                        </button>
                        <button
                          disabled={!canApplyCustomRange}
                          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            if (!canApplyCustomRange) return;
                            setCustomRangeApplied(customRangeDraft);
                            setSelectedTimeFilter('custom');
                            setIsCustomRangeOpen(false);
                            setIsTimeDropdownOpen(false);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {tripsQuery.isLoading ? (
            <div className="rounded-[32px] border border-luxury-gold/14 bg-white/92 px-6 py-14 text-center shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
              <p className="text-sm text-on-surface-variant">Loading your trips...</p>
            </div>
          ) : trips.length > 0 ? (
            trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onViewDetail={handleViewDetail}
                onManageBooking={(item) => void handleManageBooking(item)}
                onCheckIn={(item) => void handleCheckIn(item)}
              />
            ))
          ) : (
            <div className="rounded-[32px] border border-luxury-gold/14 bg-white/92 px-6 py-14 text-center shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-luxury-gold/20 bg-midnight-burgundy/5 text-midnight-burgundy">
                <PlaneTakeoff className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <p className="text-lg font-semibold text-on-surface">No trips found</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                No trips match your search or filters in this tab.
              </p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />

      <TripDetailSidebar
        trip={tripDetailQuery.data ?? null}
        isOpen={isSidebarOpen}
        isLoading={tripDetailQuery.isLoading || tripDetailQuery.isFetching}
        onClose={() => {
          setIsSidebarOpen(false);
          setSelectedTripTarget(null);
        }}
      />
    </div>
  );
}
