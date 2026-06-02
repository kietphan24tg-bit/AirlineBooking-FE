import api from '../api/axios';

export { getClientTimezone } from '../utils/clientTimezone';

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
  /** When present (e.g. picker API), shown as secondary line in cards */
  country?: string;
}

/**
 * API may return either:
 * - `{ success?, data: { "United States": Airport[], ... } }`, or
 * - a flat map `{ "United States": Airport[], ... }` if something unwraps `data`.
 *
 * All service methods return Promises — use `await` or `.then()` (never treat as sync).
 */
export type AirportsListResponse = {
  success?: boolean;
  data: Record<string, Airport[]>;
};

const AIRPORTS_LS_KEY = 'airline-booking-fe:airports:v1';
/** Grouped list (GET /api/airports) — powers “View all” / region explorer. TTL 7 days. */
const AIRPORTS_GROUPED_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_SCHEMA_VERSION = 1;

const PICKER_LS_PREFIX = 'airline-booking-fe:airport-picker:v1';
/** Picker suggestions (GET /api/airports/picker) — dropdown before search. TTL 1 day. */
const PICKER_CACHE_TTL_MS = 1 * 24 * 60 * 60 * 1000;
const PICKER_CACHE_SCHEMA_VERSION = 1;

type AirportsCachePayload = {
  v: number;
  savedAt: number;
  byCountry: Record<string, Airport[]>;
};

function loadCachedGrouped(): Record<string, Airport[]> | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AIRPORTS_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AirportsCachePayload;
    if (
      parsed.v !== CACHE_SCHEMA_VERSION ||
      !parsed.byCountry ||
      typeof parsed.byCountry !== 'object' ||
      Array.isArray(parsed.byCountry)
    ) {
      return null;
    }
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > AIRPORTS_GROUPED_CACHE_TTL_MS) return null;
    if (Object.keys(parsed.byCountry).length === 0) return null;
    return parsed.byCountry;
  } catch {
    return null;
  }
}

function saveCachedGrouped(byCountry: Record<string, Airport[]>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: AirportsCachePayload = {
      v: CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      byCountry,
    };
    localStorage.setItem(AIRPORTS_LS_KEY, JSON.stringify(payload));
  } catch {
    /* quota, private mode, etc. */
  }
}

type PickerCachePayload = {
  v: number;
  savedAt: number;
  airports: Airport[];
};

function pickerStorageKey(paramsKey: string): string {
  return `${PICKER_LS_PREFIX}:${paramsKey}`;
}

function pickerParamsKey(params?: AirportPickerParams): string {
  if (!params) return 'default';
  const { limit, recentLimit, suggestedLimit } = params;
  if (limit == null && recentLimit == null && suggestedLimit == null) return 'default';
  return JSON.stringify({ limit, recentLimit, suggestedLimit });
}

function loadCachedPicker(paramsKey: string): Airport[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(pickerStorageKey(paramsKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PickerCachePayload;
    if (
      parsed.v !== PICKER_CACHE_SCHEMA_VERSION ||
      !Array.isArray(parsed.airports) ||
      typeof parsed.savedAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > PICKER_CACHE_TTL_MS) return null;
    if (parsed.airports.length === 0) return null;
    return parsed.airports;
  } catch {
    return null;
  }
}

function saveCachedPicker(paramsKey: string, airports: Airport[]): void {
  if (typeof localStorage === 'undefined') return;
  if (airports.length === 0) return;
  try {
    const payload: PickerCachePayload = {
      v: PICKER_CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      airports,
    };
    localStorage.setItem(pickerStorageKey(paramsKey), JSON.stringify(payload));
  } catch {
    /* quota, private mode, etc. */
  }
}

function removeAllPickerCacheEntries(): void {
  if (typeof localStorage === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(`${PICKER_LS_PREFIX}:`)) keys.push(k);
  }
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

/** Clear grouped airports + picker caches (e.g. after backend updates the list) */
export function clearAirportsLocalCache(): void {
  try {
    localStorage.removeItem(AIRPORTS_LS_KEY);
  } catch {
    /* ignore */
  }
  removeAllPickerCacheEntries();
}

/** Keep only entries whose values are arrays (country → airports) */
function asCountryAirportMap(obj: Record<string, unknown>): Record<string, Airport[]> {
  const out: Record<string, Airport[]> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) {
      out[key] = val as Airport[];
    }
  }
  return out;
}

/**
 * Accepts full envelope or already-unwrapped map (e.g. after an axios interceptor).
 */
function extractGroupedAirports(body: unknown): Record<string, Airport[]> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};

  const b = body as Record<string, unknown>;

  if ('data' in b && b.data != null && typeof b.data === 'object' && !Array.isArray(b.data)) {
    return asCountryAirportMap(b.data as Record<string, unknown>);
  }

  return asCountryAirportMap(b);
}

export type FetchAirportsOptions = {
  /** Skip localStorage and always call the API */
  force?: boolean;
};

export type AirportPickerParams = {
  /** Backend clamps 8–12 */
  limit?: number;
  /** Backend clamps 3–5 */
  recentLimit?: number;
  /** Backend clamps 6–10 */
  suggestedLimit?: number;
};

export type FetchAirportPickerOptions = {
  /** Skip localStorage and always call the API */
  force?: boolean;
};

function unwrapData(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const b = body as Record<string, unknown>;
  if ('data' in b && b.data != null) return b.data;
  return body;
}

function extractPickerRecentAirports(body: unknown): Airport[] {
  const data = unwrapData(body);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const recent = (data as Record<string, unknown>).recent;
  return Array.isArray(recent) ? (recent as Airport[]) : [];
}

function extractPickerAirports(body: unknown): Airport[] {
  const data = unwrapData(body);
  if (!data) return [];
  if (Array.isArray(data)) return data as Airport[];

  if (typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;

  const asList = (x: unknown): Airport[] => (Array.isArray(x) ? (x as Airport[]) : []);

  const recent = asList(d.recent);
  const suggested = asList(d.suggested);
  if (recent.length > 0 || suggested.length > 0) {
    const seen = new Set<number>();
    const out: Airport[] = [];
    for (const a of [...recent, ...suggested]) {
      if (a && typeof a.id === 'number' && !seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
    return out;
  }

  const airports = asList(d.airports);
  if (airports.length > 0) return airports;

  const items = asList(d.items);
  if (items.length > 0) return items;

  const results = asList(d.results);
  if (results.length > 0) return results;

  return [];
}

export const airportService = {
  clearLocalCache: clearAirportsLocalCache,

  /**
   * GET /api/airports — country name → airports.
   * Uses localStorage when fresh; otherwise fetches and writes cache.
   */
  fetchGroupedByCountry: async (
    options?: FetchAirportsOptions
  ): Promise<Record<string, Airport[]>> => {
    if (!options?.force) {
      const cached = loadCachedGrouped();
      if (cached) return cached;
    }

    const res = await api.get<AirportsListResponse | Record<string, Airport[]>>('/api/airports');
    const grouped = extractGroupedAirports(res.data);
    if (Object.keys(grouped).length > 0) {
      saveCachedGrouped(grouped);
    }
    return grouped;
  },

  /** @returns Promise — must await */
  fetchAirports: async (options?: FetchAirportsOptions): Promise<Airport[]> => {
    const grouped = await airportService.fetchGroupedByCountry(options);
    return Object.values(grouped).flat();
  },

  /** @returns Promise — must await */
  fetchAirportsForUI: async (
    options?: FetchAirportsOptions
  ): Promise<{
    byCountry: Record<string, Airport[]>;
    list: Airport[];
  }> => {
    const byCountry = await airportService.fetchGroupedByCountry(options);
    const list = Object.values(byCountry).flat();
    return { byCountry, list };
  },

  /**
   * GET /api/airports/picker — suggestions for the From/To dropdown (before user searches).
   * Cached in localStorage for 1 day per param set. `X-Timezone` is set on all requests via the axios interceptor.
   */
  fetchAirportPicker: async (
    params?: AirportPickerParams,
    options?: FetchAirportPickerOptions
  ): Promise<Airport[]> => {
    const pk = pickerParamsKey(params);
    if (!options?.force) {
      const cached = loadCachedPicker(pk);
      if (cached) return cached;
    }

    const res = await api.get<unknown>('/api/airports/picker', { params });
    const list = extractPickerAirports(res.data);
    if (list.length > 0) {
      saveCachedPicker(pk, list);
    }
    return list;
  },

  /** Recent airports only — for account profile (authenticated users). */
  fetchRecentAirportsForAccount: async (
    options?: FetchAirportPickerOptions
  ): Promise<Airport[]> => {
    const params: AirportPickerParams = { recentLimit: 8, suggestedLimit: 0, limit: 0 };
    const pk = pickerParamsKey(params);
    if (!options?.force) {
      const cached = loadCachedPicker(pk);
      if (cached) return cached;
    }

    const res = await api.get<unknown>('/api/airports/picker', { params });
    const list = extractPickerRecentAirports(res.data);
    if (list.length > 0) {
      saveCachedPicker(pk, list);
    }
    return list;
  },
};
