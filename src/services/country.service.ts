export type CountryOption = {
  /** ISO 3166-1 alpha-2 (uppercase), e.g. VN — sent to backend as `nationality`. */
  value: string;
  /** Display name (Vietnamese when available). */
  label: string;
  /** Phone dial code, e.g. +84 for Vietnam */
  dialCode?: string;
};

type RestCountryItem = {
  cca2?: string;
  name?: { common?: string };
  idd?: {
    root?: string;
    suffixes?: string[];
  };
};

type CountriesCachePayload = {
  v: number;
  savedAt: number;
  countries: CountryOption[];
};

const COUNTRIES_LS_KEY = 'airline-booking-fe:countries:v3';
const CACHE_SCHEMA_VERSION = 3;
/** Country list changes rarely — cache for 30 days. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=cca2,name,idd';

export const DEFAULT_NATIONALITY_CODE = 'VN';

/** Used when API/localStorage is unavailable. */
export const FALLBACK_COUNTRY_OPTIONS: CountryOption[] = [
  { label: 'Vietnam', value: 'VN', dialCode: '+84' },
  { label: 'United States', value: 'US', dialCode: '+1' },
  { label: 'Japan', value: 'JP', dialCode: '+81' },
  { label: 'South Korea', value: 'KR', dialCode: '+82' },
];

function loadCachedCountries(): CountryOption[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COUNTRIES_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CountriesCachePayload;
    if (
      parsed.v !== CACHE_SCHEMA_VERSION ||
      !Array.isArray(parsed.countries) ||
      parsed.countries.length === 0
    ) {
      return null;
    }
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.countries.filter(
      (c) =>
        typeof c?.value === 'string' &&
        c.value.length === 2 &&
        typeof c?.label === 'string' &&
        c.label.trim().length > 0
    );
  } catch {
    return null;
  }
}

function saveCachedCountries(countries: CountryOption[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: CountriesCachePayload = {
      v: CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      countries,
    };
    localStorage.setItem(COUNTRIES_LS_KEY, JSON.stringify(payload));
  } catch {
    /* quota, private mode, etc. */
  }
}

function toCountryOption(item: RestCountryItem): CountryOption | null {
  const code = item.cca2?.trim().toUpperCase();
  if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return null;
  const label = item.name?.common?.trim() || code;

  // Extract dial code from idd (e.g., {root: "+8", suffixes: ["4"]} => "+84")
  let dialCode: string | undefined;
  if (item.idd?.root) {
    const root = item.idd.root;
    const suffix = item.idd.suffixes?.[0] || '';
    dialCode = `${root}${suffix}`;
  }

  return { value: code, label, dialCode };
}

function sortCountryOptions(countries: CountryOption[]): CountryOption[] {
  return [...countries].sort((a, b) => {
    if (a.value === DEFAULT_NATIONALITY_CODE) return -1;
    if (b.value === DEFAULT_NATIONALITY_CODE) return 1;
    return a.label.localeCompare(b.label, 'en');
  });
}

async function fetchCountriesFromApi(): Promise<CountryOption[]> {
  const res = await fetch(REST_COUNTRIES_URL);
  if (!res.ok) {
    throw new Error(`Countries API failed (${res.status})`);
  }
  const data = (await res.json()) as RestCountryItem[];
  if (!Array.isArray(data)) {
    throw new Error('Countries API returned invalid payload');
  }

  const byCode = new Map<string, CountryOption>();
  for (const item of data) {
    const option = toCountryOption(item);
    if (option) byCode.set(option.value, option);
  }

  const countries = sortCountryOptions([...byCode.values()]);
  if (countries.length === 0) {
    throw new Error('Countries API returned empty list');
  }
  return countries;
}

export type FetchCountryOptions = {
  /** Skip localStorage and always call the API */
  force?: boolean;
};

export const countryService = {
  clearLocalCache(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(COUNTRIES_LS_KEY);
    } catch {
      /* ignore */
    }
  },

  /**
   * Loads ISO alpha-2 country options for UI selects.
   * Uses localStorage when fresh; otherwise fetches RestCountries and writes cache.
   * Backend expects `nationality` as uppercase ISO alpha-2 (e.g. VN).
   */
  async fetchCountryOptions(options?: FetchCountryOptions): Promise<CountryOption[]> {
    if (!options?.force) {
      const cached = loadCachedCountries();
      if (cached && cached.length > 0) return cached;
    }

    try {
      const countries = await fetchCountriesFromApi();
      saveCachedCountries(countries);
      return countries;
    } catch {
      const stale = loadCachedCountries();
      if (stale && stale.length > 0) return stale;
      return FALLBACK_COUNTRY_OPTIONS;
    }
  },
};
