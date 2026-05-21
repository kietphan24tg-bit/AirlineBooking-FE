import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import BookingStepper from '../components/booking/BookingStepper';
import FlightResultCard from '../components/booking/FlightResultCard';
import FlightResultCardSkeleton from '../components/booking/FlightResultCardSkeleton';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import { flightService } from '../services/flight.service';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  FlightLeg,
  FlightRevalidateFareRequest,
  FlightSearchCriteria,
  FlightSearchFilters,
} from '../types/flight.types';
import {
  applyFlightResultsStateToSearchParams,
  buildFlightCriteriaCacheKey,
  buildFlightSearchQueryKey,
  parseFlightSearchCriteria,
  parseFlightResultsFilters,
  parseFlightResultsSort,
  type FlightResultsSort,
} from '../utils/flightSearchUrl';

const DEPARTURE_TIME_OPTIONS = [
  ['ANY', 'No Preference'],
  ['MORNING', 'Morning (12:00am - 11:59am)'],
  ['AFTERNOON', 'Afternoon (12:00pm - 5:59pm)'],
  ['EVENING', 'Evening (6:00pm - 11:59pm)'],
] as const;

const ARRIVAL_TIME_OPTIONS = [
  ['ANY', 'No Preference'],
  ['MORNING', 'Morning (12:00am - 11:59am)'],
  ['AFTERNOON', 'Afternoon (12:00pm - 5:59pm)'],
  ['EVENING', 'Evening (6:00pm - 11:59pm)'],
] as const;

const CABIN_CLASS_OPTIONS = [
  ['', 'No Preference'],
  ['ECONOMY', 'Economy'],
  ['PREMIUM_ECONOMY', 'Premium'],
  ['BUSINESS', 'Business'],
  ['FIRST', 'First'],
] as const;

const LOADING_SKELETON_COUNT = 3;

function formatTripDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function buildSummary(c: FlightSearchCriteria): { routeTitle: string; metaLine: string } {
  const fromCity = c.fromCity?.trim() || c.from;
  const toCity = c.toCity?.trim() || c.to;
  const routeTitle = `${fromCity} (${c.from}) \u2192 ${toCity} (${c.to})`;
  const bits: string[] = [];
  bits.push(formatTripDate(c.departureDate));
  if (c.tripType === 'ROUND_TRIP' && c.returnDate) {
    bits.push(`Return ${formatTripDate(c.returnDate)}`);
  }
  const pax: string[] = [];
  pax.push(c.adult === 1 ? '1 Adult' : `${c.adult} Adults`);
  if (c.child > 0) pax.push(c.child === 1 ? '1 Child' : `${c.child} Children`);
  if (c.infant > 0) pax.push(c.infant === 1 ? '1 Infant' : `${c.infant} Infants`);
  bits.push(pax.join(', '));
  return { routeTitle, metaLine: bits.join(' \u2022 ') };
}

function deriveLegPriceRange(legs: FlightLeg[]): { minPrice: number; maxPrice: number } | null {
  const prices = legs.flatMap((leg) => leg.cabinFares.map((fare) => fare.priceAmount));
  if (prices.length === 0) return null;
  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}

function areFiltersEqual(a: FlightSearchFilters, b: FlightSearchFilters): boolean {
  return (
    (a.connectionFilter ?? 'ANY') === (b.connectionFilter ?? 'ANY') &&
    (a.departureTimeBucket ?? 'ANY') === (b.departureTimeBucket ?? 'ANY') &&
    (a.arrivalTimeBucket ?? 'ANY') === (b.arrivalTimeBucket ?? 'ANY') &&
    [...a.cabinClasses].slice().sort().join(',') === [...b.cabinClasses].slice().sort().join(',') &&
    a.maxBudget === b.maxBudget
  );
}

/** Debounce before applying price cap to filters / API (ms). */
const PRICE_SLIDER_DEBOUNCE_MS = 400;

const FALLBACK_SLIDER_MIN = 0;
const FALLBACK_SLIDER_MAX = 20_000_000;
const FALLBACK_CURRENCY = 'VND';

function formatMoneySafe(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

interface FilterPanelProps {
  filters: FlightSearchFilters;
  setFilters: Dispatch<SetStateAction<FlightSearchFilters>>;
  sliderMin: number;
  sliderMax: number;
  sliderValue: number;
  displayedMaxPrice: number;
  currency: string;
  priceDebounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setDraftMaxBudget: Dispatch<SetStateAction<number | null>>;
  namePrefix: string;
}

function FilterPanel({
  filters,
  setFilters,
  sliderMin,
  sliderMax,
  sliderValue,
  displayedMaxPrice,
  currency,
  priceDebounceTimerRef,
  setDraftMaxBudget,
  namePrefix,
}: FilterPanelProps) {
  const updateBudget = (value: string) => {
    const numericValue = Number(value);
    const cap = numericValue >= sliderMax ? null : numericValue;
    setDraftMaxBudget(cap);
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
    }
    priceDebounceTimerRef.current = setTimeout(() => {
      priceDebounceTimerRef.current = null;
      setFilters((current) => ({
        ...current,
        maxBudget: cap,
      }));
    }, PRICE_SLIDER_DEBOUNCE_MS);
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Stops
        </span>
        <label className="group flex cursor-pointer items-center gap-3">
          <input
            type="radio"
            name={`${namePrefix}-stops`}
            checked={filters.connectionFilter !== 'DIRECT_ONLY'}
            onChange={() => setFilters((current) => ({ ...current, connectionFilter: 'ANY' }))}
            className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
            No Preference
          </span>
        </label>
        <label className="group mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="radio"
            name={`${namePrefix}-stops`}
            checked={filters.connectionFilter === 'DIRECT_ONLY'}
            onChange={() =>
              setFilters((current) => ({ ...current, connectionFilter: 'DIRECT_ONLY' }))
            }
            className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
            Direct only
          </span>
        </label>
      </div>

      <div>
        <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Departure Time
        </span>
        {DEPARTURE_TIME_OPTIONS.map(([val, label]) => (
          <label key={val} className="group mt-3 flex cursor-pointer items-center gap-3 first:mt-0">
            <input
              type="radio"
              name={`${namePrefix}-departure-time`}
              checked={filters.departureTimeBucket === val}
              onChange={() => setFilters((current) => ({ ...current, departureTimeBucket: val }))}
              className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
              {label}
            </span>
          </label>
        ))}
      </div>

      <div>
        <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Arrival Time
        </span>
        {ARRIVAL_TIME_OPTIONS.map(([val, label]) => (
          <label key={val} className="group mt-3 flex cursor-pointer items-center gap-3 first:mt-0">
            <input
              type="radio"
              name={`${namePrefix}-arrival-time`}
              checked={filters.arrivalTimeBucket === val}
              onChange={() => setFilters((current) => ({ ...current, arrivalTimeBucket: val }))}
              className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
              {label}
            </span>
          </label>
        ))}
      </div>

      <div>
        <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Cabin Class
        </span>
        {CABIN_CLASS_OPTIONS.map(([val, label]) => (
          <label
            key={label}
            className="group mt-3 flex cursor-pointer items-center gap-3 first:mt-0"
          >
            <input
              type="radio"
              name={`${namePrefix}-cabin-class`}
              checked={
                val === ''
                  ? filters.cabinClasses.length === 0
                  : filters.cabinClasses[0] === val && filters.cabinClasses.length === 1
              }
              onChange={() =>
                setFilters((current) => ({
                  ...current,
                  cabinClasses: val ? [val] : [],
                }))
              }
              className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
              {label}
            </span>
          </label>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Price Range
          </span>
          <span className="text-xs font-bold text-secondary">
            Up to {formatMoneySafe(displayedMaxPrice, currency)}
          </span>
        </div>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={Math.max(1_000, Math.round((sliderMax - sliderMin) / 1000))}
          value={sliderValue}
          onChange={(e) => updateBudget(e.target.value)}
          className="h-1.5 w-full cursor-pointer accent-primary"
        />
      </div>
    </div>
  );
}

export default function FlightResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = useMemo(() => parseFlightSearchCriteria(searchParams), [searchParams]);
  const parsedUrlFilters = useMemo(() => parseFlightResultsFilters(searchParams), [searchParams]);
  const parsedUrlSort = useMemo(() => parseFlightResultsSort(searchParams), [searchParams]);

  const initialSearchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const [sort, setSort] = useState<FlightResultsSort>(() =>
    parseFlightResultsSort(initialSearchParams)
  );
  const [filters, setFilters] = useState<FlightSearchFilters>(() =>
    parseFlightResultsFilters(initialSearchParams)
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [pendingFareKey, setPendingFareKey] = useState<string | null>(null);
  const [fareSelectionError, setFareSelectionError] = useState<string | null>(null);
  /** UI value while dragging; `null` = no cap (slider at max). Committed to `filters.maxBudget` after debounce. */
  const [draftMaxBudget, setDraftMaxBudget] = useState<number | null>(
    () => parseFlightResultsFilters(initialSearchParams).maxBudget
  );
  const priceDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearBooking = useBookingStore((state) => state.clearBooking);
  const setRevalidationDraft = useBookingStore((state) => state.setRevalidationDraft);
  const priceRangeFilters = useMemo<FlightSearchFilters>(
    () => ({
      ...filters,
      maxBudget: null,
    }),
    [filters]
  );

  const criteriaKey = useMemo(
    () => (criteria ? buildFlightCriteriaCacheKey(criteria) : ''),
    [criteria]
  );
  const prevCriteriaKeyRef = useRef<string>('');

  useEffect(() => {
    if (!criteria) return;
    if (prevCriteriaKeyRef.current === criteriaKey) return;
    prevCriteriaKeyRef.current = criteriaKey;
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
      priceDebounceTimerRef.current = null;
    }
    setFilters(parsedUrlFilters);
    setDraftMaxBudget(parsedUrlFilters.maxBudget);
    setSort(parsedUrlSort);
    setMobileFiltersOpen(false);
  }, [criteria, criteriaKey, parsedUrlFilters, parsedUrlSort]);

  useEffect(() => {
    if (!criteria) return;
    setFilters((current) =>
      areFiltersEqual(current, parsedUrlFilters) ? current : parsedUrlFilters
    );
    setSort((current) => (current === parsedUrlSort ? current : parsedUrlSort));
    setDraftMaxBudget((current) => {
      return current === parsedUrlFilters.maxBudget ? current : parsedUrlFilters.maxBudget;
    });
  }, [criteria, parsedUrlFilters, parsedUrlSort]);

  useEffect(() => {
    return () => {
      if (priceDebounceTimerRef.current) clearTimeout(priceDebounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen]);

  const summary = criteria ? buildSummary(criteria) : null;

  const searchQuery = useQuery({
    queryKey: criteria
      ? buildFlightSearchQueryKey(criteria, filters, sort)
      : ['flight-search', 'invalid'],
    queryFn: () => {
      if (!criteria) throw new Error('Missing search criteria');
      return flightService.searchFlights(criteria, filters, sort);
    },
    enabled: !!criteria,
  });
  const revalidateFareMutation = useMutation({
    mutationFn: (payload: FlightRevalidateFareRequest) => flightService.revalidateFare(payload),
  });

  const priceRangeQuery = useQuery({
    queryKey: criteria
      ? ([
          'flight-price-range',
          ...buildFlightSearchQueryKey(criteria, priceRangeFilters, sort),
        ] as const)
      : ['flight-price-range', 'invalid'],
    queryFn: () => {
      if (!criteria) throw new Error('Missing search criteria');
      return flightService.searchFlights(criteria, priceRangeFilters, sort);
    },
    enabled: !!criteria,
    placeholderData: (previousData) => previousData,
  });

  const sortedOutbound = searchQuery.data?.outbound ?? [];
  const sortedInbound = searchQuery.data?.inbound ?? [];

  const loading = searchQuery.isPending;
  const searchError =
    searchQuery.isError && searchQuery.error instanceof Error
      ? searchQuery.error.message
      : searchQuery.isError
        ? 'Search failed'
        : null;

  const availableOutboundRange = useMemo(
    () =>
      deriveLegPriceRange(priceRangeQuery.data?.outbound ?? []) ??
      priceRangeQuery.data?.outboundPriceRange ??
      deriveLegPriceRange(searchQuery.data?.outbound ?? []) ??
      searchQuery.data?.outboundPriceRange,
    [
      priceRangeQuery.data?.outbound,
      priceRangeQuery.data?.outboundPriceRange,
      searchQuery.data?.outbound,
      searchQuery.data?.outboundPriceRange,
    ]
  );
  const currentOutboundRange = useMemo(
    () =>
      deriveLegPriceRange(searchQuery.data?.outbound ?? []) ?? searchQuery.data?.outboundPriceRange,
    [searchQuery.data?.outbound, searchQuery.data?.outboundPriceRange]
  );

  const sliderMin = availableOutboundRange?.minPrice ?? FALLBACK_SLIDER_MIN;
  const sliderMax = availableOutboundRange?.maxPrice ?? FALLBACK_SLIDER_MAX;
  const currency =
    searchQuery.data?.outboundPriceRange?.currency ??
    priceRangeQuery.data?.outboundPriceRange?.currency ??
    FALLBACK_CURRENCY;
  const rawSliderValue = draftMaxBudget ?? sliderMax;
  const sliderValue = Math.min(Math.max(rawSliderValue, sliderMin), sliderMax);

  const rangeMin = availableOutboundRange?.minPrice;
  const rangeMax = availableOutboundRange?.maxPrice;
  const displayedMaxPrice = currentOutboundRange?.maxPrice ?? sliderValue;
  const activeFiltersCount =
    (filters.connectionFilter === 'DIRECT_ONLY' ? 1 : 0) +
    (filters.departureTimeBucket !== 'ANY' ? 1 : 0) +
    (filters.arrivalTimeBucket !== 'ANY' ? 1 : 0) +
    (filters.cabinClasses.length > 0 ? 1 : 0) +
    (filters.maxBudget != null ? 1 : 0);
  const filterSummary =
    activeFiltersCount === 0
      ? 'No filters applied'
      : `${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'} active`;

  const handleSelectFare = async (payload: { leg: FlightLeg; fareId: number; fareKey: string }) => {
    if (!criteria || pendingFareKey) return;
    const flightId = Number(payload.leg.id);
    if (!Number.isFinite(flightId) || flightId <= 0) {
      setFareSelectionError('Unable to select this fare. Please try another option.');
      return;
    }
    setFareSelectionError(null);
    setPendingFareKey(payload.fareKey);
    try {
      const revalidated = await revalidateFareMutation.mutateAsync({
        flightId,
        fareId: payload.fareId,
        promoCode: criteria.promoCode?.trim() ?? '',
        passengerSummary: {
          adult: criteria.adult,
          child: criteria.child,
          infant: criteria.infant,
        },
      });
      clearBooking();
      setRevalidationDraft(revalidated);
      navigate('/booking/passengers');
    } catch (error) {
      setFareSelectionError(
        error instanceof Error ? error.message : 'Could not verify latest fare. Please try again.'
      );
    } finally {
      setPendingFareKey(null);
    }
  };

  useEffect(() => {
    if (rangeMin == null || rangeMax == null) return;
    if (priceDebounceTimerRef.current) return;

    const clamp = (v: number | null): number | null => {
      if (v == null) return null;
      if (v > rangeMax) return null;
      if (v < rangeMin) return rangeMin;
      return v;
    };

    setFilters((current) => {
      const clamped = clamp(current.maxBudget);
      if (clamped === current.maxBudget) return current;
      return { ...current, maxBudget: clamped };
    });
    setDraftMaxBudget((current) => {
      const clamped = clamp(current);
      if (clamped === current) return current;
      return clamped;
    });
  }, [rangeMin, rangeMax]);

  useEffect(() => {
    if (!criteria) return;
    setSearchParams(
      (prev) => {
        const next = applyFlightResultsStateToSearchParams(prev, filters, sort);
        if (next.toString() === prev.toString()) return prev;
        return next;
      },
      { replace: true }
    );
  }, [criteria, filters, setSearchParams, sort]);

  if (!criteria || !summary) {
    return (
      <div className="relative flex min-h-screen flex-col bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="relative z-10 mx-auto flex-1 w-full max-w-480 px-4 pb-20 pt-28 md:px-12">
          <BookingStepper current="search" />
          <p className="mb-4 text-on-surface-variant">
            Missing or invalid search parameters. Start a new search from the home page.
          </p>
          <Link
            to="/"
            className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary"
          >
            Back to search
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex-1 w-full max-w-480 px-4 pb-16 pt-24 sm:px-6 md:px-12 md:pb-20 md:pt-28">
        <BookingStepper current="search" />

        <div className="mb-8 flex flex-col gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-5xl">
            <h1 className="mb-2 text-3xl font-black uppercase leading-none tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
              {summary.routeTitle}
            </h1>
            <p className="max-w-3xl text-sm font-medium text-on-surface-variant sm:text-base">
              {summary.metaLine}
            </p>
            {criteria?.promoCode?.trim() ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/80">
                Promo code: {criteria.promoCode.trim()}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface shadow-sm lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-on-primary">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Sort by:
              </span>
              <div className="relative w-full sm:w-auto">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as FlightResultsSort)}
                  className="w-full cursor-pointer appearance-none rounded-xl border-none bg-surface-container-lowest py-3 pl-4 pr-10 text-sm font-bold text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-secondary-fixed sm:min-w-56 sm:pl-6"
                >
                  <option>Recommended</option>
                  <option>Cheapest</option>
                  <option>Fastest</option>
                  <option>Best Experience</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              </div>
            </div>
          </div>
        </div>

        {mobileFiltersOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close filters"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] border border-surface-container-high bg-surface px-4 pb-6 pt-4 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Filters
                  </p>
                  <p className="text-sm font-semibold text-on-surface">{filterSummary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                sliderMin={sliderMin}
                sliderMax={sliderMax}
                sliderValue={sliderValue}
                displayedMaxPrice={displayedMaxPrice}
                currency={currency}
                priceDebounceTimerRef={priceDebounceTimerRef}
                setDraftMaxBudget={setDraftMaxBudget}
                namePrefix="mobile"
              />

              <div className="sticky bottom-0 mt-6 bg-surface pt-4">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary"
                >
                  Show results
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28 rounded-xl border border-surface-variant/30 bg-surface-container-low/90 p-8 backdrop-blur-sm">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-on-surface">
                Filters
              </h3>
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                sliderMin={sliderMin}
                sliderMax={sliderMax}
                sliderValue={sliderValue}
                displayedMaxPrice={displayedMaxPrice}
                currency={currency}
                priceDebounceTimerRef={priceDebounceTimerRef}
                setDraftMaxBudget={setDraftMaxBudget}
                namePrefix="desktop"
              />
            </div>
          </aside>

          <div className="space-y-8 lg:col-span-9 lg:space-y-10">
            {fareSelectionError ? (
              <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
                {fareSelectionError}
              </div>
            ) : null}
            {loading ? (
              <section aria-label="Loading flight results" className="space-y-6 lg:space-y-8">
                {Array.from({ length: LOADING_SKELETON_COUNT }).map((_, index) => (
                  <FlightResultCardSkeleton key={index} />
                ))}
              </section>
            ) : searchError ? (
              <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-center">
                <p className="mb-3 text-on-surface">{searchError}</p>
                <button
                  type="button"
                  onClick={() => void searchQuery.refetch()}
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-on-primary"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <section>
                  <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
                    Outbound
                  </h2>
                  {sortedOutbound.length === 0 ? (
                    <p className="text-on-surface-variant">
                      No outbound flights match your filters.
                    </p>
                  ) : (
                    <div className="space-y-6 lg:space-y-8">
                      {sortedOutbound.map((leg) => (
                        <FlightResultCard
                          key={leg.id}
                          leg={leg}
                          pendingFareKey={pendingFareKey}
                          onSelectFare={handleSelectFare}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {criteria.tripType === 'ROUND_TRIP' ? (
                  <section>
                    <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
                      Return
                    </h2>
                    {sortedInbound.length === 0 ? (
                      <p className="text-on-surface-variant">
                        No return flights for this search yet.
                      </p>
                    ) : (
                      <div className="space-y-6 lg:space-y-8">
                        {sortedInbound.map((leg) => (
                          <FlightResultCard
                            key={`in-${leg.id}`}
                            leg={leg}
                            pendingFareKey={pendingFareKey}
                            onSelectFare={handleSelectFare}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
