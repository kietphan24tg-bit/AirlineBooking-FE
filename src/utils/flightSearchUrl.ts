import type {
  FlightSearchCriteria,
  FlightSearchFilters,
  FlightSearchTripTypeApi,
} from '../types/flight.types';
import type { Airport } from '../services/airport.service';

export type FlightResultsSort = 'Recommended' | 'Cheapest' | 'Fastest' | 'Best Experience';
export type FlightSearchApiSort = 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'BEST_EXPERIENCE';

const VALID_CONNECTION_FILTERS = new Set<NonNullable<FlightSearchFilters['connectionFilter']>>([
  'ANY',
  'DIRECT_ONLY',
]);
const VALID_TIME_BUCKETS = new Set<NonNullable<FlightSearchFilters['departureTimeBucket']>>([
  'ANY',
  'MORNING',
  'AFTERNOON',
  'EVENING',
]);
const VALID_CABIN_CLASSES = new Set(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);
const VALID_SORTS = new Set<FlightResultsSort>([
  'Recommended',
  'Cheapest',
  'Fastest',
  'Best Experience',
]);

export function buildFlightResultsSearch(criteria: FlightSearchCriteria): string {
  const sp = new URLSearchParams();
  sp.set('tripType', criteria.tripType);
  sp.set('from', criteria.from);
  sp.set('to', criteria.to);
  sp.set('departureDate', criteria.departureDate);
  sp.set('adult', String(criteria.adult));
  sp.set('child', String(criteria.child));
  sp.set('infant', String(criteria.infant));
  if (criteria.returnDate) sp.set('returnDate', criteria.returnDate);
  if (criteria.promoCode?.trim()) sp.set('promoCode', criteria.promoCode.trim());
  if (criteria.fromCity?.trim()) sp.set('fromCity', criteria.fromCity.trim());
  if (criteria.toCity?.trim()) sp.set('toCity', criteria.toCity.trim());
  return sp.toString();
}

/** Optional sidebar filter: max total price (API `maxBudget`). */
export function parseMaxBudgetFromSearchParams(sp: URLSearchParams): number | null {
  const raw = sp.get('maxBudget');
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function normalizeCabinFilterValue(cabin: string | null): string | null {
  if (!cabin) return null;
  if (cabin === 'PREMIUM') return 'PREMIUM_ECONOMY';
  return VALID_CABIN_CLASSES.has(cabin) ? cabin : null;
}

export function parseFlightResultsFilters(sp: URLSearchParams): FlightSearchFilters {
  const connectionFilter = sp.get('stops');
  const departureTimeBucket = sp.get('departureTime');
  const arrivalTimeBucket = sp.get('arrivalTime');
  const cabin = normalizeCabinFilterValue(sp.get('cabin'));

  return {
    connectionFilter: VALID_CONNECTION_FILTERS.has(
      connectionFilter as NonNullable<FlightSearchFilters['connectionFilter']>
    )
      ? (connectionFilter as NonNullable<FlightSearchFilters['connectionFilter']>)
      : 'ANY',
    departureTimeBucket: VALID_TIME_BUCKETS.has(
      departureTimeBucket as NonNullable<FlightSearchFilters['departureTimeBucket']>
    )
      ? (departureTimeBucket as NonNullable<FlightSearchFilters['departureTimeBucket']>)
      : 'ANY',
    arrivalTimeBucket: VALID_TIME_BUCKETS.has(
      arrivalTimeBucket as NonNullable<FlightSearchFilters['arrivalTimeBucket']>
    )
      ? (arrivalTimeBucket as NonNullable<FlightSearchFilters['arrivalTimeBucket']>)
      : 'ANY',
    cabinClasses: cabin ? [cabin] : [],
    maxBudget: parseMaxBudgetFromSearchParams(sp),
  };
}

export function parseFlightResultsSort(sp: URLSearchParams): FlightResultsSort {
  const sort = sp.get('sort');
  if (sort && VALID_SORTS.has(sort as FlightResultsSort)) {
    return sort as FlightResultsSort;
  }
  return 'Recommended';
}

export function mapFlightResultsSortToApiSort(sort: FlightResultsSort): FlightSearchApiSort {
  switch (sort) {
    case 'Cheapest':
      return 'CHEAPEST';
    case 'Fastest':
      return 'FASTEST';
    case 'Best Experience':
      return 'BEST_EXPERIENCE';
    case 'Recommended':
    default:
      return 'RECOMMENDED';
  }
}

export function applyFlightResultsStateToSearchParams(
  sp: URLSearchParams,
  filters: FlightSearchFilters,
  sort: FlightResultsSort
): URLSearchParams {
  const next = new URLSearchParams(sp);

  if (filters.connectionFilter && filters.connectionFilter !== 'ANY') {
    next.set('stops', filters.connectionFilter);
  } else {
    next.delete('stops');
  }

  if (filters.departureTimeBucket && filters.departureTimeBucket !== 'ANY') {
    next.set('departureTime', filters.departureTimeBucket);
  } else {
    next.delete('departureTime');
  }

  if (filters.arrivalTimeBucket && filters.arrivalTimeBucket !== 'ANY') {
    next.set('arrivalTime', filters.arrivalTimeBucket);
  } else {
    next.delete('arrivalTime');
  }

  const cabin = filters.cabinClasses[0];
  if (cabin && VALID_CABIN_CLASSES.has(cabin)) {
    next.set('cabin', cabin);
  } else {
    next.delete('cabin');
  }

  if (filters.maxBudget != null) {
    next.set('maxBudget', String(Math.round(filters.maxBudget)));
  } else {
    next.delete('maxBudget');
  }

  if (sort !== 'Recommended') {
    next.set('sort', sort);
  } else {
    next.delete('sort');
  }

  return next;
}

/** Stable id for “same flight search” from URL criteria (resets sidebar when this changes). */
export function buildFlightCriteriaCacheKey(c: FlightSearchCriteria): string {
  return [
    c.tripType,
    c.from,
    c.to,
    c.departureDate,
    c.returnDate ?? '',
    c.adult,
    c.child,
    c.infant,
    c.promoCode ?? '',
  ].join('|');
}

export function parseFlightSearchCriteria(sp: URLSearchParams): FlightSearchCriteria | null {
  const tripType = sp.get('tripType') as FlightSearchTripTypeApi | null;
  const from = sp.get('from')?.trim();
  const to = sp.get('to')?.trim();
  const departureDate = sp.get('departureDate')?.trim();
  const adultRaw = sp.get('adult');
  if (!tripType || !from || !to || !departureDate || adultRaw == null) return null;
  if (tripType !== 'ONE_WAY' && tripType !== 'ROUND_TRIP') return null;
  const adult = Number.parseInt(adultRaw, 10);
  if (!Number.isFinite(adult) || adult < 1 || adult > 9) return null;

  const child = Math.min(9, Math.max(0, Number.parseInt(sp.get('child') || '0', 10) || 0));
  const infant = Math.min(9, Math.max(0, Number.parseInt(sp.get('infant') || '0', 10) || 0));
  const returnDate = sp.get('returnDate')?.trim();
  if (tripType === 'ROUND_TRIP' && !returnDate) return null;

  const promo = sp.get('promoCode')?.trim();

  return {
    tripType,
    from,
    to,
    departureDate,
    returnDate: returnDate || undefined,
    adult,
    child,
    infant,
    promoCode: promo || undefined,
    fromCity: sp.get('fromCity')?.trim() || undefined,
    toCity: sp.get('toCity')?.trim() || undefined,
  };
}

export function airportLabel(a: Airport): string {
  return `${a.city} (${a.code})`;
}

/** Stable query key for TanStack Query — primitives only, avoids redundant refetches. */
export function buildFlightSearchQueryKey(
  criteria: FlightSearchCriteria,
  filters: FlightSearchFilters,
  sort: FlightResultsSort
): readonly unknown[] {
  return [
    'flight-search',
    criteria.tripType,
    criteria.from,
    criteria.to,
    criteria.departureDate,
    criteria.returnDate ?? '',
    criteria.adult,
    criteria.child,
    criteria.infant,
    criteria.promoCode ?? '',
    criteria.fromCity ?? '',
    criteria.toCity ?? '',
    filters.connectionFilter ?? 'ANY',
    filters.departureTimeBucket ?? 'ANY',
    filters.arrivalTimeBucket ?? 'ANY',
    [...filters.cabinClasses].slice().sort().join(','),
    filters.maxBudget ?? 'none',
    sort,
  ] as const;
}
