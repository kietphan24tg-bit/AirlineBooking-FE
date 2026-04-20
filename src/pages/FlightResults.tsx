import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import FlightResultCard from '../components/booking/FlightResultCard';
import type { FlightLeg, FlightSearchCriteria, FlightSearchFilters } from '../types/flight.types';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import BookingStepper from '../components/booking/BookingStepper';
import { flightService } from '../services/flight.service';
import {
  applyFlightResultsStateToSearchParams,
  buildFlightCriteriaCacheKey,
  buildFlightSearchQueryKey,
  parseFlightSearchCriteria,
  parseFlightResultsFilters,
  parseFlightResultsSort,
  type FlightResultsSort,
} from '../utils/flightSearchUrl';

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
  const routeTitle = `${fromCity} (${c.from}) → ${toCity} (${c.to})`;
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
  if (c.promoCode) bits.push(`Promo ${c.promoCode}`);
  return { routeTitle, metaLine: bits.join(' • ') };
}

function legMinPrice(leg: FlightLeg): number {
  if (!leg.cabinFares.length) return Number.POSITIVE_INFINITY;
  return Math.min(...leg.cabinFares.map((x) => x.priceAmount));
}

function legMaxPrice(leg: FlightLeg): number {
  if (!leg.cabinFares.length) return 0;
  return Math.max(...leg.cabinFares.map((x) => x.priceAmount));
}

function applySort(legs: FlightLeg[], sort: string): FlightLeg[] {
  const out = [...legs];
  if (sort === 'Cheapest') {
    out.sort((a, b) => legMinPrice(a) - legMinPrice(b));
  } else if (sort === 'Fastest') {
    out.sort((a, b) => a.durationMinutes - b.durationMinutes);
  } else if (sort === 'Best Experience') {
    out.sort((a, b) => legMaxPrice(b) - legMaxPrice(a));
  }
  return out;
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

export default function FlightResults() {
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
  /** UI value while dragging; `null` = no cap (slider at max). Committed to `filters.maxBudget` after debounce. */
  const [draftMaxBudget, setDraftMaxBudget] = useState<number | null>(
    () => parseFlightResultsFilters(initialSearchParams).maxBudget
  );
  const priceDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const summary = criteria ? buildSummary(criteria) : null;

  const searchQuery = useQuery({
    queryKey: criteria
      ? buildFlightSearchQueryKey(criteria, filters)
      : ['flight-search', 'invalid'],
    queryFn: () => {
      if (!criteria) throw new Error('Missing search criteria');
      return flightService.searchFlights(criteria, filters);
    },
    enabled: !!criteria,
  });

  const priceRangeQuery = useQuery({
    queryKey: criteria
      ? (['flight-price-range', ...buildFlightSearchQueryKey(criteria, priceRangeFilters)] as const)
      : ['flight-price-range', 'invalid'],
    queryFn: () => {
      if (!criteria) throw new Error('Missing search criteria');
      return flightService.searchFlights(criteria, priceRangeFilters);
    },
    enabled: !!criteria,
    placeholderData: (previousData) => previousData,
  });

  const outboundRange =
    priceRangeQuery.data?.outboundPriceRange ?? searchQuery.data?.outboundPriceRange;

  const sortedOutbound = useMemo(() => {
    const legs = searchQuery.data?.outbound ?? [];
    return applySort(legs, sort);
  }, [searchQuery.data?.outbound, sort]);

  const sortedInbound = useMemo(() => {
    const legs = searchQuery.data?.inbound ?? [];
    return applySort(legs, sort);
  }, [searchQuery.data?.inbound, sort]);

  const loading = searchQuery.isPending;
  const searchError =
    searchQuery.isError && searchQuery.error instanceof Error
      ? searchQuery.error.message
      : searchQuery.isError
        ? 'Search failed'
        : null;

  const sliderMin = outboundRange?.minPrice ?? FALLBACK_SLIDER_MIN;
  const sliderMax = outboundRange?.maxPrice ?? FALLBACK_SLIDER_MAX;
  const currency = outboundRange?.currency ?? FALLBACK_CURRENCY;
  const rawSliderValue = draftMaxBudget ?? sliderMax;
  const sliderValue = Math.min(Math.max(rawSliderValue, sliderMin), sliderMax);

  const rangeMin = outboundRange?.minPrice;
  const rangeMax = outboundRange?.maxPrice;
  useEffect(() => {
    if (rangeMin == null || rangeMax == null) return;
    if (priceDebounceTimerRef.current) return;

    const clamp = (v: number | null): number | null => {
      if (v == null) return null;
      if (v > rangeMax) return null;
      if (v < rangeMin) return rangeMin;
      return v;
    };

    setFilters((f) => {
      const c = clamp(f.maxBudget);
      if (c === f.maxBudget) return f;
      return { ...f, maxBudget: c };
    });
    setDraftMaxBudget((d) => {
      const c = clamp(d);
      if (c === d) return d;
      return c;
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
      <div className="relative min-h-screen bg-surface text-on-surface antialiased">
        <SiteHeader />
        <main className="relative z-10 mx-auto max-w-480 px-4 pb-20 pt-28 md:px-12">
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
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-480 px-4 pb-20 pt-28 md:px-12">
        <BookingStepper current="search" />
        <div className="mb-8 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div>
            <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-on-surface">
              {summary.routeTitle}
            </h1>
            <p className="font-medium text-on-surface-variant">{summary.metaLine}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Sort by:
            </span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as FlightResultsSort)}
                className="cursor-pointer appearance-none rounded-xl border-none bg-surface-container-lowest py-3 pl-6 pr-10 text-sm font-bold text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-secondary-fixed"
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
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <aside className="space-y-8 lg:col-span-3">
            <div className="sticky top-28 rounded-xl border border-surface-variant/30 bg-surface-container-low/90 p-8 backdrop-blur-sm">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-on-surface">
                Filters
              </h3>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Stops
                </span>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="stops"
                    checked={filters.connectionFilter !== 'DIRECT_ONLY'}
                    onChange={() => setFilters((f) => ({ ...f, connectionFilter: 'ANY' }))}
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    No Preference
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="stops"
                    checked={filters.connectionFilter === 'DIRECT_ONLY'}
                    onChange={() => setFilters((f) => ({ ...f, connectionFilter: 'DIRECT_ONLY' }))}
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Direct only
                  </span>
                </label>
              </div>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Departure Time
                </span>
                {(
                  [
                    ['ANY', 'No Preference'],
                    ['MORNING', 'Morning (5am - 12pm)'],
                    ['AFTERNOON', 'Afternoon (12pm - 6pm)'],
                    ['EVENING', 'Evening (6pm - 12am)'],
                  ] as const
                ).map(([val, label]) => (
                  <label
                    key={val}
                    className="group mt-3 flex cursor-pointer items-center gap-3 first:mt-0"
                  >
                    <input
                      type="radio"
                      name="departure-time"
                      checked={filters.departureTimeBucket === val}
                      onChange={() => setFilters((f) => ({ ...f, departureTimeBucket: val }))}
                      className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Arrival Time
                </span>
                {(
                  [
                    ['ANY', 'No Preference'],
                    ['MORNING', 'Morning (5am - 12pm)'],
                    ['AFTERNOON', 'Afternoon (12pm - 6pm)'],
                    ['EVENING', 'Evening (6pm - 12am)'],
                  ] as const
                ).map(([val, label]) => (
                  <label
                    key={val}
                    className="group mt-3 flex cursor-pointer items-center gap-3 first:mt-0"
                  >
                    <input
                      type="radio"
                      name="arrival-time"
                      checked={filters.arrivalTimeBucket === val}
                      onChange={() => setFilters((f) => ({ ...f, arrivalTimeBucket: val }))}
                      className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Cabin Class
                </span>
                {(
                  [
                    ['', 'No Preference'],
                    ['ECONOMY', 'Economy'],
                    ['PREMIUM', 'Premium'],
                    ['BUSINESS', 'Business'],
                    ['FIRST', 'First'],
                  ] as const
                ).map(([val, label]) => (
                  <label
                    key={label}
                    className="group mt-3 flex cursor-pointer items-center gap-3 first:mt-0"
                  >
                    <input
                      type="radio"
                      name="cabin-class"
                      checked={
                        val === ''
                          ? filters.cabinClasses.length === 0
                          : filters.cabinClasses[0] === val && filters.cabinClasses.length === 1
                      }
                      onChange={() =>
                        setFilters((f) => ({
                          ...f,
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
              <div className="mb-8">
                <div className="mb-4 flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Price Range
                  </span>
                  <span className="text-xs font-bold text-secondary">
                    Up to {formatMoneySafe(sliderValue, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={Math.max(1, Math.round((sliderMax - sliderMin) / 200))}
                  value={sliderValue}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const cap = v >= sliderMax ? null : v;
                    setDraftMaxBudget(cap);
                    if (priceDebounceTimerRef.current) {
                      clearTimeout(priceDebounceTimerRef.current);
                    }
                    priceDebounceTimerRef.current = setTimeout(() => {
                      priceDebounceTimerRef.current = null;
                      setFilters((f) => ({
                        ...f,
                        maxBudget: cap,
                      }));
                    }, PRICE_SLIDER_DEBOUNCE_MS);
                  }}
                  className="h-1.5 w-full cursor-pointer accent-primary"
                />
              </div>
            </div>
          </aside>
          <div className="space-y-10 lg:col-span-9">
            {loading ? (
              <p className="text-center text-on-surface-variant">Searching flights…</p>
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
                    <div className="space-y-8">
                      {sortedOutbound.map((leg) => (
                        <FlightResultCard key={leg.id} leg={leg} />
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
                      <div className="space-y-8">
                        {sortedInbound.map((leg) => (
                          <FlightResultCard key={`in-${leg.id}`} leg={leg} />
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
