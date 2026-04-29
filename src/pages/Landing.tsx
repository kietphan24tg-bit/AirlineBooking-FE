import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Sparkles,
  MoveRight,
  Minus,
  User,
  UtensilsCrossed,
  Headset,
  RotateCcw,
  Search,
  MapPin,
  Gift,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import { airportService, type Airport } from '../services/airport.service';
import { buildFlightResultsSearch, airportLabel } from '../utils/flightSearchUrl';

//const HERO_WING = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhbnWHSXyZEIc2WLBnhOd8qPY45Y8JYORsa-L0oq7JPRn9I4oA9_W7OkkNhMz9zF8JD3bicGF4GrcM506MBeGkuKj4o9A6fHVkHaAMgcqxRr2xqWTzrWEdOFtljcl0_8qdOxagUmxX_oTMFP_3N2YaRyH0RGeVAXtvJvdRu6KhMFIrrcWTVzmVFSeaeNi7vqxkms17m4cZWkdLwWtdz1zZ17qMDCUZ_3_1otxOuya4kNUb_BN5Wc7E4sM56D5JgO3fZytmZtSOOyJU';

const MAX_BOOKING_PASSENGERS = 9;

type TravelerCounts = { adults: number; children: number; infants: number };

function clampTravelers(p: TravelerCounts): TravelerCounts {
  let adults = Math.max(1, Math.min(9, p.adults));
  let children = Math.max(0, Math.min(8, p.children));
  let infants = Math.max(0, Math.min(p.infants, adults));
  let total = adults + children + infants;
  if (total > MAX_BOOKING_PASSENGERS) {
    children = Math.max(0, children - (total - MAX_BOOKING_PASSENGERS));
    total = adults + children + infants;
    if (total > MAX_BOOKING_PASSENGERS) {
      infants = Math.max(0, infants - (total - MAX_BOOKING_PASSENGERS));
    }
    total = adults + children + infants;
    if (total > MAX_BOOKING_PASSENGERS && adults > 1) {
      adults = Math.max(1, adults - (total - MAX_BOOKING_PASSENGERS));
      infants = Math.min(infants, adults);
    }
  }
  infants = Math.min(infants, adults);
  return { adults, children, infants };
}

function canBumpTraveler(p: TravelerCounts, field: keyof TravelerCounts, delta: number): boolean {
  const bumped = { ...p, [field]: p[field] + delta } as TravelerCounts;
  const c = clampTravelers(bumped);
  return c[field] !== p[field];
}

function formatTravelerSummary(p: TravelerCounts): string {
  const total = p.adults + p.children + p.infants;
  return total === 1 ? '1 Passenger' : `${total} Passengers`;
}

const destinations = [
  {
    tag: 'TRENDING',
    tagClass: 'bg-midnight-burgundy text-luxury-gold',
    city: 'Dubai',
    line: 'From $1,240 | First Class Experience',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzQoRszQ9DoYWqrmkICRM_5R6URZXKVjMsaosolUgHNilP8s5srYmEPnNXXBAPikFHweburezdnp1Z94bpBFM7TBcfeHKjeMNUfdqUgpD250iLKxHouuXEHRH5vSdk9MmR-99-COmPExlTcMfWiym3-b9z9mEYntXklDSt265R2qmcYwluquIBakeFin-WyilQvHpz9tTZUNCw83Br2bsGIq3_63Rj_g1H9xulMmpBe6chtogNz7g4N77Q2YM6Q_4lgDb6Ppp36bop',
    offset: '',
  },
  {
    tag: 'FEATURED',
    tagClass: 'bg-luxury-gold text-midnight-burgundy',
    city: 'Paris',
    line: 'From $980 | Cultural Elegance',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGJCt58g5Q3lJDwA8yHseLk4ECQqDj8JwZtvA3ub7MIh3sFCnqMKvFmEU93nt0fnkqRlGTMXucg2alHD-bssfl3pnBJGsLUvSJf2ziz1xk5QXAnFzjFd_I2sTyQAIDsUKSL0J8D3Rr9pm4M717Ts3krl_V_cdhkB2xarlNhsjRpwtXWs5fhZoVv8PD7mpgGhUNohZ1oX67E5we99w4MdsvY73zBGUl2bXjj9N9bPse7uDjM_scP87xFnl7YyQnYexRjC8U5WUz37FD',
    offset: 'md:-translate-y-8',
  },
  {
    tag: 'LIMITED',
    tagClass: 'bg-midnight-burgundy text-luxury-gold',
    city: 'Tokyo',
    line: 'From $1,560 | Urban Sophistication',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmSdCW-K2plV9pnsU7pJS-1INqVfmROXBQGkU-LLL4aOhQ62VnWMUqAVXilhgQSAI6DWZuvDZ3PjI32_XeWOLCy9HihdXoNGpiFrKPWlMm6cWeA_k_HICKIc18PkmRNABDcoHhwo3n8SQVqSU1NfcHNZxUiXtuj07yPsrh2tpJW1UashVTXXjXe-JoOVjehMnKISgiVO87usxTH_G4XxEFalM59OaESVoGglNSj4FroDwEfMBsq0TTOZf3UmbB-S3anh2EFDBbAw6U',
    offset: '',
  },
];

const BANNER_SUITE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PIrZqKqBOtsY76vWhimpUUlYthHM4y8zXe5e86W9R3JOSoVuyVdG5jLy-9XzNeh0csUNmMGRt1W3uyTrrHXnUScKQQrmKEmgj82-slcm4Y9RGYse7U7bbQ_aA4EVIr_x6_tDglJHOhU1KWXQpJcEKBRX5QN7c5ch24nFs2RNda4O47SK-NcJyuLklQzGsa-oubeIJxP8ElytxX1ZV1EHUCS_FJgUg8Q0I5oe88Zt91sZNupuXXqReEwWT5-Zxjs10dEIYXsmWOAG';
const LOUNGE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCsUmrFTguffDPAip5caMzo-6w8SGik8CYxr5xZYpSrT0PGYy3FAlhkZYgdVbEZgWk1ylqMlVK3-kJcsIfyfzmLA7GAs3d_n-bsMcPm9z2vK3uoPuIHuuQ3A8Is7GtSbD4Bmlwq3VF-lpp_b9fICXSL53eOcsfcIdUTtlQePXn6yQxK5nZm2wM_wymmKZShM72nVOyNqVUEfmszVbsI2XpJ4uHIZUUBa_ny2_oEKQlYCj29ck3vKmz9-TrlgFSLUHygfklssHwC-nW6';
const TAIL_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDGid7JcZ9bpqlgE2oSAlcjguLckow2RBVAa_jYKWWVC7LecTproe0o3KrEwqVs4N_npAHgJH6IVIKYN6ZJuwdxjamXoIc4fkfrKvqSVLI3Vj3GKlrvPn2nWadx-BYGvODXykTTcwyYMZEVzp7EadmLX3WDFGGq91L0pBpjrH5P4dNjYup3fqJ3FR6kJ2d7bb-VL8_6kmEmVVh5CIZxhsUoOUxk5L-XjxXN8nMirmO4um3DE8TdCWge8R-zMOVVlsccuEk5-SSYakdh';

function filterAirports(list: Airport[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (a) =>
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q)
  );
}

function excludeAirport(list: Airport[], excluded: Airport | null): Airport[] {
  if (!excluded) return list;
  return list.filter((airport) => airport.id !== excluded.id && airport.code !== excluded.code);
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function openNativeDatePicker(el: HTMLInputElement | null) {
  if (!el) return;
  if (typeof el.showPicker === 'function') {
    try {
      el.showPicker();
      return;
    } catch {
      /* not allowed or unsupported */
    }
  }
  el.focus();
  el.click();
}

type LandingAirportSearchPanelProps = {
  regionsModalOpen: boolean;
  onCloseRegionsModal: () => void;
  onOpenRegionsExplorer: () => void;
  regionKeys: string[];
  selectedRegionKey: string;
  onSelectRegion: (key: string) => void;
  airportsInSelectedRegion: Airport[];
  hoveredModalAirportId: number | null;
  onHoverModalAirport: (id: number | null) => void;
  airportSearchQuery: string;
  onAirportSearchQueryChange: (q: string) => void;
  airportSearchInputRef: RefObject<HTMLInputElement | null>;
  mainPickerAirports: Airport[];
  pickerLoading: boolean;
  hoveredAirportId: number | null;
  onHoverAirport: (id: number | null) => void;
  onPickAirport: (a: Airport) => void;
};

/** Module-level component so React does not remount on every parent re-render (fixes scroll jump). */
function LandingAirportSearchPanel({
  regionsModalOpen,
  onCloseRegionsModal,
  onOpenRegionsExplorer,
  regionKeys,
  selectedRegionKey,
  onSelectRegion,
  airportsInSelectedRegion,
  hoveredModalAirportId,
  onHoverModalAirport,
  airportSearchQuery,
  onAirportSearchQueryChange,
  airportSearchInputRef,
  mainPickerAirports,
  pickerLoading,
  hoveredAirportId,
  onHoverAirport,
  onPickAirport,
}: LandingAirportSearchPanelProps) {
  return (
    <div
      className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-1.5rem,26.25rem)] overflow-hidden rounded-xl border border-luxury-gold/20 bg-white shadow-[0_12px_40px_rgba(26,28,28,0.12)]"
      role="listbox"
      aria-label="Search airports"
    >
      {!regionsModalOpen ? (
        <div className="border-b border-luxury-gold/10 bg-white p-4">
          <div className="flex items-stretch overflow-hidden rounded-lg border border-midnight-burgundy/25 bg-white">
            <div className="flex shrink-0 items-center justify-center pl-3 pr-2">
              <Search className="h-5 w-5 text-midnight-burgundy" strokeWidth={2} aria-hidden />
            </div>
            <div
              className="my-2.5 w-px shrink-0 self-stretch bg-midnight-burgundy/25"
              aria-hidden
            />
            <input
              ref={airportSearchInputRef}
              type="search"
              value={airportSearchQuery}
              onChange={(e) => onAirportSearchQueryChange(e.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent py-3 pl-3 pr-4 font-body text-base text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
              autoComplete="off"
            />
          </div>
        </div>
      ) : null}
      {regionsModalOpen ? (
        <>
          <div className="border-b border-luxury-gold/10 bg-white p-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-2 py-1.5 font-label text-[0.6875rem] font-bold uppercase tracking-wide text-midnight-burgundy transition-colors hover:bg-surface-container-low"
              onClick={onCloseRegionsModal}
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              Back
            </button>
          </div>
          <div className="flex h-[21rem] min-h-0">
            <aside className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto overscroll-y-contain border-r border-luxury-gold/15 bg-surface-container-low p-2 touch-pan-y">
              {regionKeys.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-on-surface-variant">Loading...</p>
              ) : (
                regionKeys.map((key) => {
                  const active = selectedRegionKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-lg px-2.5 py-2 text-left font-label text-base leading-tight font-bold uppercase tracking-wide transition-colors ${
                        active
                          ? 'bg-midnight-burgundy text-luxury-gold'
                          : 'text-on-surface hover:bg-white'
                      }`}
                      onClick={() => onSelectRegion(key)}
                    >
                      {key.toUpperCase()}
                    </button>
                  );
                })
              )}
            </aside>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-white touch-pan-y">
              {airportsInSelectedRegion.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  {regionKeys.length === 0 ? 'No region data.' : 'No airports in this region.'}
                </p>
              ) : (
                airportsInSelectedRegion.map((a) => {
                  const active = hoveredModalAirportId === a.id;
                  const subtitle = `${a.city} (${a.code})`;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`group/item flex w-full items-center justify-between border-l-4 p-4 text-left transition-colors ${
                        active
                          ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                          : 'border-transparent hover:bg-surface-container'
                      }`}
                      onMouseEnter={() => onHoverModalAirport(a.id)}
                      onMouseLeave={() => onHoverModalAirport(null)}
                      onClick={() => onPickAirport(a)}
                    >
                      <div>
                        <div
                          className={`font-headline text-lg font-bold leading-tight ${
                            active ? 'text-midnight-burgundy' : 'text-on-surface'
                          }`}
                        >
                          {a.city}
                        </div>
                        <div
                          className={`font-body text-sm ${
                            active ? 'text-midnight-burgundy/80' : 'text-on-surface-variant'
                          }`}
                        >
                          {selectedRegionKey}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 pl-2">
                        <span
                          className={`font-headline text-xs font-semibold tracking-wider rounded-full border px-3 py-1 ${
                            active
                              ? 'border-midnight-burgundy text-midnight-burgundy'
                              : 'border-midnight-burgundy/35 text-midnight-burgundy group-hover/item:border-midnight-burgundy'
                          }`}
                        >
                          {a.code}
                        </span>
                        <span
                          className={`font-body text-xs ${
                            active
                              ? 'text-midnight-burgundy/80'
                              : 'text-on-surface-variant group-hover/item:text-midnight-burgundy/70'
                          }`}
                        >
                          {subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="max-h-[min(22rem,calc(100dvh-12rem))] min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y">
            {airportSearchQuery.trim() === '' && pickerLoading ? (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">Loading...</p>
            ) : mainPickerAirports.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                No matching airports.
              </p>
            ) : (
              mainPickerAirports.map((a) => {
                const active = hoveredAirportId === a.id;
                const subtitle = `${a.city} (${a.code})`;
                const secondary = a.country?.trim() || a.name;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`group/item flex w-full items-center justify-between border-l-4 p-4 text-left transition-colors ${
                      active
                        ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                        : 'border-transparent hover:bg-surface-container'
                    }`}
                    onMouseEnter={() => onHoverAirport(a.id)}
                    onMouseLeave={() => onHoverAirport(null)}
                    onClick={() => onPickAirport(a)}
                  >
                    <div>
                      <div
                        className={`font-headline text-lg font-bold leading-tight ${
                          active ? 'text-midnight-burgundy' : 'text-on-surface'
                        }`}
                      >
                        {a.city}
                      </div>
                      <div
                        className={`font-body text-sm ${
                          active ? 'text-midnight-burgundy/80' : 'text-on-surface-variant'
                        }`}
                      >
                        {secondary}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pl-2">
                      <span
                        className={`font-headline text-xs font-semibold tracking-wider rounded-full border px-3 py-1 ${
                          active
                            ? 'border-midnight-burgundy text-midnight-burgundy'
                            : 'border-midnight-burgundy/35 text-midnight-burgundy group-hover/item:border-midnight-burgundy'
                        }`}
                      >
                        {a.code}
                      </span>
                      <span
                        className={`font-body text-xs ${
                          active
                            ? 'text-midnight-burgundy/80'
                            : 'text-on-surface-variant group-hover/item:text-midnight-burgundy/70'
                        }`}
                      >
                        {subtitle}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-outline-variant/30 bg-surface-container-lowest">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 py-2.5 font-headline text-sm font-bold text-midnight-burgundy transition-colors hover:bg-midnight-burgundy/5 hover:text-midnight-burgundy"
              onClick={onOpenRegionsExplorer}
            >
              <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              View all
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [airportList, setAirportList] = useState<Airport[]>([]);
  const [airportsByRegion, setAirportsByRegion] = useState<Record<string, Airport[]>>({});
  const [isFromPicking, setIsFromPicking] = useState(false);
  const [isToPicking, setIsToPicking] = useState(false);
  const [airportSearchQuery, setAirportSearchQuery] = useState('');
  const [hoveredAirportId, setHoveredAirportId] = useState<number | null>(null);
  const [regionsModalOpen, setRegionsModalOpen] = useState(false);
  const [selectedRegionKey, setSelectedRegionKey] = useState<string>('');
  const [hoveredModalAirportId, setHoveredModalAirportId] = useState<number | null>(null);
  const [pickerSuggestions, setPickerSuggestions] = useState<Airport[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const fromFieldRef = useRef<HTMLDivElement>(null);
  const toFieldRef = useRef<HTMLDivElement>(null);
  const airportSearchInputRef = useRef<HTMLInputElement>(null);
  const glassPanelRef = useRef<HTMLDivElement>(null);
  const travelersFieldRef = useRef<HTMLDivElement>(null);
  const departDateInputRef = useRef<HTMLInputElement>(null);
  const returnDateInputRef = useRef<HTMLInputElement>(null);
  const pickerContextRef = useRef<'from' | 'to' | null>(null);

  const [bookingPanelBlur, setBookingPanelBlur] = useState(false);
  const [travelersMenuOpen, setTravelersMenuOpen] = useState(false);
  const [searchSubmitFocused, setSearchSubmitFocused] = useState(false);

  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [fromAirport, setFromAirport] = useState<Airport | null>(null);
  const [toAirport, setToAirport] = useState<Airport | null>(null);
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelerCounts, setTravelerCounts] = useState<TravelerCounts>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [promoCode, setPromoCode] = useState('');

  const activePickerContext = isFromPicking ? 'from' : isToPicking ? 'to' : null;
  const airportExcludedFromPicker =
    activePickerContext === 'from' ? toAirport : activePickerContext === 'to' ? fromAirport : null;

  const travelerSummaryLabel = useMemo(
    () => formatTravelerSummary(travelerCounts),
    [travelerCounts]
  );

  const todayMin = toDateInputValue(new Date());
  const returnDateMin = departDate && departDate >= todayMin ? departDate : todayMin;

  useEffect(() => {
    const state = location.state as { paymentExpired?: boolean } | null;
    if (!state?.paymentExpired) return;
    toast.error('Phiên thanh toán đã hết hạn. Ghế/đặt chỗ không còn được giữ. Vui lòng đặt lại.');
    navigate('/', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!departDate) return;
    if (departDate < todayMin) setDepartDate(todayMin);
  }, [departDate, todayMin]);

  useEffect(() => {
    if (tripType !== 'round-trip') return;
    setReturnDate((r) => {
      if (!r) return r;
      return r < returnDateMin ? returnDateMin : r;
    });
  }, [tripType, returnDateMin]);

  const onSearch = () => {
    if (
      !fromAirport ||
      !toAirport ||
      fromAirport.code === toAirport.code ||
      !departDate ||
      (tripType === 'round-trip' && !returnDate) ||
      travelerCounts.adults < 1 ||
      (tripType === 'round-trip' && returnDate && departDate && returnDate < departDate)
    ) {
      alert('Please fill in all required fields');
      return;
    }

    const qs = buildFlightResultsSearch({
      tripType: tripType === 'round-trip' ? 'ROUND_TRIP' : 'ONE_WAY',
      from: fromAirport.code,
      to: toAirport.code,
      departureDate: departDate,
      returnDate: tripType === 'round-trip' ? returnDate : undefined,
      adult: travelerCounts.adults,
      child: travelerCounts.children,
      infant: travelerCounts.infants,
      promoCode: promoCode.trim() || undefined,
      fromCity: fromAirport.city,
      toCity: toAirport.city,
    });
    navigate(`/flights?${qs}`);
  };

  const syncBookingPanelBlur = () => {
    const panel = glassPanelRef.current;
    if (!panel) return;
    const ae = document.activeElement;
    if (!ae || !(ae instanceof Element) || !panel.contains(ae)) {
      setBookingPanelBlur(false);
      return;
    }
    if (ae.closest('[data-booking-search-submit]')) {
      setBookingPanelBlur(false);
      return;
    }
    setBookingPanelBlur(true);
  };

  const filteredAirports = filterAirports(airportList, airportSearchQuery);
  const mainPickerAirports = useMemo(() => {
    const source = airportSearchQuery.trim() ? filteredAirports : pickerSuggestions;
    return excludeAirport(source, airportExcludedFromPicker);
  }, [airportSearchQuery, filteredAirports, pickerSuggestions, airportExcludedFromPicker]);
  const regionKeys = useMemo(() => Object.keys(airportsByRegion), [airportsByRegion]);
  const airportsInSelectedRegion = useMemo(() => {
    const source =
      selectedRegionKey && airportsByRegion[selectedRegionKey]
        ? airportsByRegion[selectedRegionKey]
        : [];
    return excludeAirport(source, airportExcludedFromPicker);
  }, [selectedRegionKey, airportsByRegion, airportExcludedFromPicker]);

  const resetAirportPickerUi = () => {
    setIsFromPicking(false);
    setIsToPicking(false);
    setRegionsModalOpen(false);
    setAirportSearchQuery('');
    setHoveredAirportId(null);
    setHoveredModalAirportId(null);
    pickerContextRef.current = null;
  };

  const closeAirportPicker = () => {
    resetAirportPickerUi();
  };

  const closeRegionsModal = () => {
    setRegionsModalOpen(false);
    setHoveredModalAirportId(null);
  };

  const resetBookingOverlayState = () => {
    setBookingPanelBlur(false);
    setTravelersMenuOpen(false);
    setSearchSubmitFocused(false);
    closeAirportPicker();
    closeRegionsModal();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const applyAirportSelection = (a: Airport) => {
    const ctx = pickerContextRef.current;
    if (ctx === 'from') setFromAirport(a);
    else if (ctx === 'to') setToAirport(a);
    pickerContextRef.current = null;
    setIsFromPicking(false);
    setIsToPicking(false);
    setAirportSearchQuery('');
    setHoveredAirportId(null);
    setHoveredModalAirportId(null);
    setRegionsModalOpen(false);
  };

  const openRegionsExplorer = () => {
    setTravelersMenuOpen(false);
    const keys = Object.keys(airportsByRegion);
    setSelectedRegionKey(keys[0] ?? '');
    setRegionsModalOpen(true);
    airportSearchInputRef.current?.blur();
  };

  useEffect(() => {
    if (!isFromPicking && !isToPicking) return;
    const id = requestAnimationFrame(() => airportSearchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isFromPicking, isToPicking, closeAirportPicker]);

  useEffect(() => {
    if (!isFromPicking && !isToPicking) return;
    let cancelled = false;
    setPickerLoading(true);
    airportService
      .fetchAirportPicker()
      .then((list) => {
        if (!cancelled) setPickerSuggestions(list);
      })
      .catch(() => {
        if (!cancelled) setPickerSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isFromPicking, isToPicking]);

  useEffect(() => {
    if (!isFromPicking && !isToPicking) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (fromFieldRef.current?.contains(t) || toFieldRef.current?.contains(t)) return;
      closeAirportPicker();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isFromPicking, isToPicking]);

  useEffect(() => {
    if (!travelersMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (travelersFieldRef.current?.contains(t)) return;
      setTravelersMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [travelersMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (regionsModalOpen) {
        closeRegionsModal();
        return;
      }
      if (travelersMenuOpen) {
        setTravelersMenuOpen(false);
        return;
      }
      if (isFromPicking || isToPicking) closeAirportPicker();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isFromPicking, isToPicking, regionsModalOpen, travelersMenuOpen, closeAirportPicker]);

  const updateairports = async () => {
    try {
      const { byCountry, list } = await airportService.fetchAirportsForUI();
      setAirportsByRegion(byCountry);
      setAirportList(list);
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };

  useEffect(() => {
    updateairports();
  }, []);

  const showHeroBookingBlur =
    !searchSubmitFocused && (bookingPanelBlur || isFromPicking || isToPicking || travelersMenuOpen);

  const bumpTraveler = (field: keyof TravelerCounts, delta: number) => {
    if (!canBumpTraveler(travelerCounts, field, delta)) return;
    setTravelerCounts((p) => clampTravelers({ ...p, [field]: p[field] + delta }));
  };

  useEffect(() => {
    if (!regionsModalOpen) return;
    const keys = Object.keys(airportsByRegion);
    if (keys.length === 0) return;
    setSelectedRegionKey((prev) => (prev && keys.includes(prev) ? prev : keys[0]));
  }, [regionsModalOpen, airportsByRegion]);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased">
      <MarketingNav active="book" />

      <main className="relative">
        {/* Full-viewport tinted blur (Vietnam Airlines–style); hero stays above via z-index */}
        <div
          className={`fixed inset-0 z-[52] bg-black/50 transition-opacity duration-300 ease-out ${
            showHeroBookingBlur
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }`}
          onClick={resetBookingOverlayState}
          aria-hidden
        />
        <section
          className={`relative flex h-260 w-full items-stretch ${
            isFromPicking || isToPicking || travelersMenuOpen
              ? 'overflow-visible'
              : 'overflow-hidden'
          }`}
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img alt="" src="/src/assets/sky4.jpg" className="sky-flow-track" />
            <div className="absolute inset-0 bg-linear-to-t from-black/30 to-white/10" />
            <img
              alt=""
              src="/src/assets/wing.png"
              className="absolute inset-0 pl-70 h-full w-full object-cover"
            />
            <img
              alt=""
              src="/src/assets/wing1.png"
              className="absolute inset-0 pl-70 h-full w-full object-cover opacity-0 animate-wing-flash"
            />
            <img
              alt=""
              src="/src/assets/window.png"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="relative mx-auto flex h-220 w-full min-w-0 max-w-480 flex-col px-4 pb-0 pt-24 sm:px-6 md:px-20 md:pb-0">
            <div className="max-w-full mt-50 pt-4 md:pt-6">
              <h1 className="mb-4 font-headline text-4xl font-black leading-[0.92] tracking-tighter text-white md:mb-5 md:text-7xl drop-shadow-2xl">
                REDEFINING <br />
                THE <span className="text-luxury-gold">EXCEPTIONAL</span>
              </h1>
              <div className="mt-12 flex items-center gap-4">
                <div className="h-px w-20 bg-luxury-gold" />
                <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-luxury-gold">
                  Make it an incredible journey
                </span>
                <div className="h-px w-20 bg-luxury-gold" />
              </div>
            </div>
            <div
              ref={glassPanelRef}
              onFocusCapture={() => queueMicrotask(syncBookingPanelBlur)}
              onBlurCapture={() => queueMicrotask(syncBookingPanelBlur)}
              className="glass-panel relative z-55 mt-auto w-full min-w-0 max-w-500 rounded-xl border border-luxury-gold/20 p-1 shadow-2xl"
            >
              {/* Trip Type Toggle */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-luxury-gold/10 px-4 py-2.5 sm:px-5 sm:py-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="tripType"
                    value="one-way"
                    checked={tripType === 'one-way'}
                    onChange={(e) => setTripType(e.target.value as 'one-way' | 'round-trip')}
                    className="cursor-pointer"
                  />
                  <span className="font-headline font-bold text-midnight-burgundy">One-Way</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="tripType"
                    value="round-trip"
                    checked={tripType === 'round-trip'}
                    onChange={(e) => setTripType(e.target.value as 'one-way' | 'round-trip')}
                    className="cursor-pointer"
                  />
                  <span className="font-headline font-bold text-midnight-burgundy">Round-Trip</span>
                </label>
              </div>

              {/* Search Form Grid: stack on small screens; tablet3×2 for round-trip; full row from xl / lg */}
              <div
                className={`landing-booking-grid ${tripType === 'round-trip' ? 'landing-booking-grid--roundtrip' : 'landing-booking-grid--oneway'} grid min-w-0 gap-0 p-2.5 sm:p-4 [&>*]:min-w-0 ${
                  tripType === 'round-trip'
                    ? 'grid-cols-1 divide-y divide-luxury-gold/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:[grid-template-columns:repeat(5,minmax(0,1fr))_1.28fr]'
                    : 'grid-cols-1 divide-y divide-luxury-gold/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5'
                }`}
              >
                {/* From */}
                <div
                  ref={fromFieldRef}
                  className={`booking-field booking-field--from relative space-y-1 p-3 sm:min-h-[9rem] sm:p-4 ${isFromPicking ? 'z-30' : ''} ${
                    tripType === 'round-trip'
                      ? 'sm:border-b sm:border-luxury-gold/10 xl:border-b-0'
                      : 'sm:border-b sm:border-luxury-gold/10 lg:border-b-0'
                  }`}
                >
                  <label
                    htmlFor="from"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    From
                  </label>
                  <button
                    id="from"
                    type="button"
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 py-2 transition-all ${
                      isFromPicking
                        ? 'border-midnight-burgundy/25 shadow-[0_0_8px_rgba(125,6,51,0.15)]'
                        : 'border-transparent'
                    }`}
                    onClick={() => {
                      setTravelersMenuOpen(false);
                      setAirportSearchQuery('');
                      setIsToPicking(false);
                      setIsFromPicking((v) => {
                        const next = !v;
                        pickerContextRef.current = next ? 'from' : null;
                        return next;
                      });
                    }}
                  >
                    <PlaneTakeoff
                      className="h-5 w-5 shrink-0 text-midnight-burgundy"
                      strokeWidth={1.75}
                    />
                    <p
                      className={`font-headline text-base font-bold sm:text-lg ${
                        fromAirport ? 'text-midnight-burgundy' : 'text-midnight-burgundy/45'
                      }`}
                    >
                      {fromAirport ? airportLabel(fromAirport) : 'FROM'}
                    </p>
                  </button>
                  {isFromPicking && (
                    <LandingAirportSearchPanel
                      regionsModalOpen={regionsModalOpen}
                      onCloseRegionsModal={() => setRegionsModalOpen(false)}
                      onOpenRegionsExplorer={openRegionsExplorer}
                      regionKeys={regionKeys}
                      selectedRegionKey={selectedRegionKey}
                      onSelectRegion={setSelectedRegionKey}
                      airportsInSelectedRegion={airportsInSelectedRegion}
                      hoveredModalAirportId={hoveredModalAirportId}
                      onHoverModalAirport={setHoveredModalAirportId}
                      airportSearchQuery={airportSearchQuery}
                      onAirportSearchQueryChange={setAirportSearchQuery}
                      airportSearchInputRef={airportSearchInputRef}
                      mainPickerAirports={mainPickerAirports}
                      pickerLoading={pickerLoading}
                      hoveredAirportId={hoveredAirportId}
                      onHoverAirport={setHoveredAirportId}
                      onPickAirport={applyAirportSelection}
                    />
                  )}
                </div>

                {/* To */}
                <div
                  ref={toFieldRef}
                  className={`booking-field booking-field--to relative space-y-1 p-3 sm:min-h-[9rem] sm:p-4 ${isToPicking ? 'z-30' : ''} ${
                    tripType === 'round-trip'
                      ? 'sm:border-b sm:border-luxury-gold/10 xl:border-b-0'
                      : 'sm:border-b sm:border-luxury-gold/10 lg:border-b-0'
                  }`}
                >
                  <label
                    htmlFor="to"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    To
                  </label>
                  <button
                    id="to"
                    type="button"
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 py-2 transition-all ${
                      isToPicking
                        ? 'border-midnight-burgundy/25 shadow-[0_0_8px_rgba(125,6,51,0.15)]'
                        : 'border-transparent'
                    }`}
                    onClick={() => {
                      setTravelersMenuOpen(false);
                      setAirportSearchQuery('');
                      setIsFromPicking(false);
                      setIsToPicking((v) => {
                        const next = !v;
                        pickerContextRef.current = next ? 'to' : null;
                        return next;
                      });
                    }}
                  >
                    <PlaneLanding
                      className="h-5 w-5 shrink-0 text-midnight-burgundy"
                      strokeWidth={1.75}
                    />
                    <p
                      className={`font-headline text-base font-bold sm:text-lg ${
                        toAirport ? 'text-midnight-burgundy' : 'text-midnight-burgundy/45'
                      }`}
                    >
                      {toAirport ? airportLabel(toAirport) : 'TO'}
                    </p>
                  </button>
                  {isToPicking && (
                    <LandingAirportSearchPanel
                      regionsModalOpen={regionsModalOpen}
                      onCloseRegionsModal={() => setRegionsModalOpen(false)}
                      onOpenRegionsExplorer={openRegionsExplorer}
                      regionKeys={regionKeys}
                      selectedRegionKey={selectedRegionKey}
                      onSelectRegion={setSelectedRegionKey}
                      airportsInSelectedRegion={airportsInSelectedRegion}
                      hoveredModalAirportId={hoveredModalAirportId}
                      onHoverModalAirport={setHoveredModalAirportId}
                      airportSearchQuery={airportSearchQuery}
                      onAirportSearchQueryChange={setAirportSearchQuery}
                      airportSearchInputRef={airportSearchInputRef}
                      mainPickerAirports={mainPickerAirports}
                      pickerLoading={pickerLoading}
                      hoveredAirportId={hoveredAirportId}
                      onHoverAirport={setHoveredAirportId}
                      onPickAirport={applyAirportSelection}
                    />
                  )}
                </div>

                {/* Depart Date */}
                <div
                  className={`booking-field booking-field--depart space-y-1 p-3 sm:min-h-[9rem] sm:p-4 ${
                    tripType === 'round-trip'
                      ? 'sm:border-b sm:border-luxury-gold/10 xl:border-b-0'
                      : 'sm:border-b sm:border-luxury-gold/10 lg:border-b-0'
                  }`}
                >
                  <label
                    htmlFor="depart-date"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    {tripType === 'round-trip' ? 'Depart' : 'Date'}
                  </label>
                  <div className="flex min-h-10 w-full items-center gap-2 rounded-lg border-2 border-transparent px-2 py-1.5 text-midnight-burgundy transition-[box-shadow,border-color] focus-within:border-midnight-burgundy/25 focus-within:bg-white focus-within:shadow-[0_0_8px_rgba(125,6,51,0.15)] sm:min-h-12 sm:py-2">
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded-md p-0.5 text-midnight-burgundy transition-opacity hover:opacity-80 focus-visible:outline focus-visible:ring-2 focus-visible:ring-midnight-burgundy/30"
                      aria-label="Select departure date"
                      onClick={() => openNativeDatePicker(departDateInputRef.current)}
                    >
                      <Calendar
                        className="h-5 w-5 stroke-midnight-burgundy"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                    <div className="group relative min-w-0 flex-1">
                      <input
                        ref={departDateInputRef}
                        id="depart-date"
                        type="date"
                        min={todayMin}
                        value={departDate}
                        onChange={(e) => setDepartDate(e.target.value)}
                        className={`search-widget-date-input relative z-[1] min-w-0 w-full border-none bg-transparent p-0 font-headline text-lg font-bold shadow-none outline-none focus:border-transparent focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none ${
                          departDate
                            ? 'text-midnight-burgundy'
                            : 'search-widget-date-input--empty text-transparent'
                        }`}
                      />
                      {!departDate ? (
                        <span className="pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2 font-headline text-base font-bold text-midnight-burgundy/45 group-focus-within:hidden sm:text-lg">
                          mm/dd/yyyy
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Return Date (only for round-trip) */}
                {tripType === 'round-trip' && (
                  <div className="booking-field booking-field--return space-y-1 border-t border-luxury-gold/10 p-3 sm:min-h-[9rem] sm:border-t-0 sm:border-b sm:border-luxury-gold/10 sm:p-4 xl:border-b-0">
                    <label
                      htmlFor="return-date"
                      className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                    >
                      Return
                    </label>
                    <div className="flex min-h-10 w-full items-center gap-2 rounded-lg border-2 border-transparent px-2 py-1.5 text-midnight-burgundy transition-[box-shadow,border-color] focus-within:border-midnight-burgundy/25 focus-within:bg-white focus-within:shadow-[0_0_8px_rgba(125,6,51,0.15)] sm:min-h-12 sm:py-2">
                      <button
                        type="button"
                        className="inline-flex shrink-0 rounded-md p-0.5 text-midnight-burgundy transition-opacity hover:opacity-80 focus-visible:outline focus-visible:ring-2 focus-visible:ring-midnight-burgundy/30"
                        aria-label="Select return date"
                        onClick={() => openNativeDatePicker(returnDateInputRef.current)}
                      >
                        <RotateCcw
                          className="h-5 w-5 stroke-midnight-burgundy"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                      <div className="group relative min-w-0 flex-1">
                        <input
                          ref={returnDateInputRef}
                          id="return-date"
                          type="date"
                          min={returnDateMin}
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className={`search-widget-date-input relative z-[1] min-w-0 w-full border-none bg-transparent p-0 font-headline text-lg font-bold shadow-none outline-none focus:border-transparent focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none ${
                            returnDate
                              ? 'text-midnight-burgundy'
                              : 'search-widget-date-input--empty text-transparent'
                          }`}
                        />
                        {!returnDate ? (
                          <span className="pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2 font-headline text-base font-bold text-midnight-burgundy/45 group-focus-within:hidden sm:text-lg">
                            mm/dd/yyyy
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Travelers */}
                <div
                  ref={travelersFieldRef}
                  className={`booking-field booking-field--travelers relative space-y-1 p-3 sm:min-h-[9rem] sm:p-4 ${travelersMenuOpen ? 'z-[60]' : ''}`}
                >
                  <label
                    htmlFor="travelers-trigger"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    Passengers
                  </label>
                  <button
                    id="travelers-trigger"
                    type="button"
                    aria-expanded={travelersMenuOpen}
                    aria-haspopup="dialog"
                    onClick={() => setTravelersMenuOpen((o) => !o)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 py-2 pl-0 pr-2 text-left transition-all ${
                      travelersMenuOpen
                        ? 'border-midnight-burgundy/25 shadow-[0_0_8px_rgba(125,6,51,0.15)]'
                        : 'border-transparent'
                    }`}
                  >
                    <User
                      className="h-5 w-5 shrink-0 stroke-midnight-burgundy text-midnight-burgundy"
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0 flex-1 font-headline text-base font-bold text-midnight-burgundy sm:text-lg">
                      {travelerSummaryLabel}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-midnight-burgundy/60 transition-transform ${
                        travelersMenuOpen ? 'rotate-180' : ''
                      }`}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>

                  {travelersMenuOpen ? (
                    <div
                      className="absolute left-0 top-full z-[80] mt-2 max-h-[min(28rem,calc(100dvh-9rem))] w-[min(100%,22rem)] min-w-[16rem] overflow-hidden rounded-xl border border-luxury-gold/20 bg-white shadow-[0_12px_40px_rgba(26,28,28,0.12)]"
                      role="dialog"
                      aria-label="Select number of travelers"
                    >
                      <div className="max-h-[min(24rem,calc(100dvh-13rem))] divide-y divide-luxury-gold/10 overflow-y-auto px-4">
                        <div className="flex items-center gap-3 py-4">
                          <button
                            type="button"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              canBumpTraveler(travelerCounts, 'adults', -1)
                                ? 'border-midnight-burgundy/25 text-midnight-burgundy hover:bg-surface-container-low'
                                : 'cursor-not-allowed border-outline-variant/35 text-on-surface-variant/40'
                            }`}
                            aria-label={'Decrease adults'}
                            disabled={!canBumpTraveler(travelerCounts, 'adults', -1)}
                            onClick={() => bumpTraveler('adults', -1)}
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-headline text-base font-bold text-midnight-burgundy">
                              {`${travelerCounts.adults} Adults`}
                            </p>
                            <p className="mt-0.5 text-sm text-on-surface-variant">
                              {'From 12 years'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              canBumpTraveler(travelerCounts, 'adults', 1)
                                ? 'border-midnight-burgundy/25 text-midnight-burgundy hover:bg-surface-container-low'
                                : 'cursor-not-allowed border-outline-variant/35 text-on-surface-variant/40'
                            }`}
                            aria-label={'Increase adults'}
                            disabled={!canBumpTraveler(travelerCounts, 'adults', 1)}
                            onClick={() => bumpTraveler('adults', 1)}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 py-4">
                          <button
                            type="button"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              canBumpTraveler(travelerCounts, 'children', -1)
                                ? 'border-midnight-burgundy/25 text-midnight-burgundy hover:bg-surface-container-low'
                                : 'cursor-not-allowed border-outline-variant/35 text-on-surface-variant/40'
                            }`}
                            aria-label={'Decrease children'}
                            disabled={!canBumpTraveler(travelerCounts, 'children', -1)}
                            onClick={() => bumpTraveler('children', -1)}
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-headline text-base font-bold text-midnight-burgundy">
                              {`${travelerCounts.children} Children`}
                            </p>
                            <p className="mt-0.5 text-sm text-on-surface-variant">{'2-12 years'}</p>
                          </div>
                          <button
                            type="button"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              canBumpTraveler(travelerCounts, 'children', 1)
                                ? 'border-midnight-burgundy/25 text-midnight-burgundy hover:bg-surface-container-low'
                                : 'cursor-not-allowed border-outline-variant/35 text-on-surface-variant/40'
                            }`}
                            aria-label={'Increase children'}
                            disabled={!canBumpTraveler(travelerCounts, 'children', 1)}
                            onClick={() => bumpTraveler('children', 1)}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 py-4">
                          <button
                            type="button"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              canBumpTraveler(travelerCounts, 'infants', -1)
                                ? 'border-midnight-burgundy/25 text-midnight-burgundy hover:bg-surface-container-low'
                                : 'cursor-not-allowed border-outline-variant/35 text-on-surface-variant/40'
                            }`}
                            aria-label={'Decrease infants'}
                            disabled={!canBumpTraveler(travelerCounts, 'infants', -1)}
                            onClick={() => bumpTraveler('infants', -1)}
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-headline text-base font-bold text-midnight-burgundy">
                              {`${travelerCounts.infants} Infants`}
                            </p>
                            <p className="mt-0.5 text-sm text-on-surface-variant">
                              {'Under 2 years'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              canBumpTraveler(travelerCounts, 'infants', 1)
                                ? 'border-midnight-burgundy/25 text-midnight-burgundy hover:bg-surface-container-low'
                                : 'cursor-not-allowed border-outline-variant/35 text-on-surface-variant/40'
                            }`}
                            aria-label={'Increase infants'}
                            disabled={!canBumpTraveler(travelerCounts, 'infants', 1)}
                            onClick={() => bumpTraveler('infants', 1)}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end border-t border-luxury-gold/10 px-4 py-3">
                        <button
                          type="button"
                          className="rounded-full bg-midnight-burgundy px-7 py-2.5 font-headline text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-[0.98]"
                          onClick={() => setTravelersMenuOpen(false)}
                        >
                          {'Select'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Promo + Search (same column) */}
                <div
                  className={`booking-field booking-field--actions flex min-h-0 flex-col gap-3 p-3 sm:gap-4 sm:p-4 ${
                    tripType === 'round-trip'
                      ? 'border-t border-luxury-gold/10 sm:col-span-2 xl:col-span-1 xl:h-full xl:justify-between xl:border-t-0'
                      : 'border-t border-luxury-gold/10 sm:col-span-2 lg:col-span-1 lg:h-full lg:justify-between lg:border-t-0'
                  }`}
                >
                  <div className="flex min-h-10 items-center gap-2 rounded-lg border border-midnight-burgundy/10 px-3 py-1.5 sm:min-h-12 sm:border-0 sm:px-0 sm:py-2">
                    <Gift
                      className="h-5 w-5 shrink-0 text-midnight-burgundy"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <input
                      id="promo-code"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder={'Promo code'}
                      autoComplete="off"
                      aria-label={'Promo code'}
                      className="min-w-0 flex-1 border-0 border-none bg-transparent p-0 font-headline text-base font-bold text-midnight-burgundy shadow-none outline-none ring-0 placeholder:text-midnight-burgundy/45 focus:border-0 focus:ring-0 focus:outline-none sm:text-lg"
                    />
                  </div>
                  <button
                    data-booking-search-submit
                    onClick={onSearch}
                    type="submit"
                    onFocus={() => setSearchSubmitFocused(true)}
                    onBlur={() => setSearchSubmitFocused(false)}
                    className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-midnight-burgundy px-4 py-3 font-headline text-sm font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-95 sm:min-h-13 sm:py-4 sm:text-base"
                  >
                    SEARCH FLIGHTS
                    <ArrowRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-6 py-24 md:px-20">
          <div className="relative z-10 mx-auto max-w-480">
            <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="font-label mb-4 block font-extrabold tracking-[0.2em] text-midnight-burgundy">
                  CURATED COLLECTIONS
                </span>
                <h2 className="font-headline text-5xl font-black tracking-tighter text-on-surface">
                  Bespoke Destinations
                </h2>
              </div>
              <Link
                to="/flights"
                className="group flex items-center gap-2 font-headline font-bold text-midnight-burgundy"
              >
                VIEW ALL DESTINATIONS
                <MoveRight
                  className="transition-transform group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {destinations.map((d) => (
                <div
                  key={d.city}
                  className={`group relative aspect-3/4 overflow-hidden rounded-xl border border-luxury-gold/10 bg-surface-container-low shadow-sm ${d.offset}`}
                >
                  <img
                    alt=""
                    src={d.img}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="destination-overlay absolute inset-0" />
                  <div className="absolute bottom-0 left-0 w-full p-8">
                    <span
                      className={`mb-3 inline-block px-3 py-1 text-[0.65rem] font-bold tracking-widest ${d.tagClass}`}
                    >
                      {d.tag}
                    </span>
                    <h3 className="mb-2 font-headline text-3xl font-black text-white">{d.city}</h3>
                    <p className="mb-6 font-medium text-white/70">{d.line}</p>
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-luxury-gold text-midnight-burgundy shadow-lg transition-colors hover:brightness-110"
                      aria-label={`Explore ${d.city}`}
                    >
                      <Plus className="h-6 w-6" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-480 px-6 py-12 md:px-20">
          <div className="grid h-auto grid-cols-1 gap-6 lg:h-125 lg:grid-cols-12">
            <div className="relative overflow-hidden rounded-xl border border-luxury-gold/10 shadow-lg lg:col-span-8">
              <img
                alt=""
                src={BANNER_SUITE}
                className="h-full min-h-70 w-full object-cover lg:min-h-0"
              />
              <div className="absolute inset-0 flex flex-col justify-center bg-linear-to-r from-black/80 via-black/40 to-transparent p-8 md:p-12">
                <span className="font-label mb-4 font-black tracking-widest text-luxury-gold">
                  THE BUSINESS CLASS REDEFINED
                </span>
                <h3 className="mb-6 max-w-lg font-headline text-4xl font-black leading-tight text-white md:text-5xl">
                  Work, Relax, <br />
                  And Arrive Inspired.
                </h3>
                <p className="mb-8 max-w-md font-medium text-white/80">
                  Experience our new suites with fully flat beds, artisanal dining, and exclusive
                  onboard connectivity.
                </p>
                <button
                  type="button"
                  className="w-fit rounded-lg bg-luxury-gold px-8 py-4 font-headline font-bold text-midnight-burgundy transition-all hover:brightness-110"
                >
                  DISCOVER THE SUITE
                </button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-luxury-gold/20 bg-midnight-burgundy shadow-lg lg:col-span-4">
              <div className="absolute inset-0 opacity-20">
                <img alt="" src={LOUNGE_IMG} className="h-full w-full object-cover" />
              </div>
              <div className="relative z-10 flex h-full min-h-80 flex-col p-10 lg:min-h-0">
                <Sparkles className="mb-6 h-12 w-12 text-luxury-gold" strokeWidth={1.25} />
                <h3 className="mb-4 font-headline text-3xl font-black uppercase tracking-tight text-white">
                  The Sovereign Platinum Lounge
                </h3>
                <p className="mb-auto font-medium text-white/80">
                  Your journey starts long before takeoff. Enjoy sanctuary in our award-winning
                  global lounges.
                </p>
                <Link
                  to="/flights"
                  className="group mt-8 inline-flex w-fit items-center gap-2 border-b-2 border-luxury-gold pb-1 font-bold tracking-wide text-luxury-gold"
                >
                  EXPLORE BENEFITS
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-12 overflow-hidden bg-surface-container-low py-24">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <svg
              className="h-full w-full stroke-luxury-gold"
              preserveAspectRatio="none"
              viewBox="0 0 1000 1000"
            >
              <path
                d="M1050,50 C800,150 600,100 400,400 C200,700 100,900 -100,950"
                fill="none"
                strokeWidth="0.75"
                opacity={0.1}
              />
            </svg>
          </div>
          <div className="relative z-10 mx-auto grid max-w-480 grid-cols-1 items-center gap-20 px-6 md:grid-cols-2 md:px-20">
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-2xl border border-luxury-gold/10 shadow-2xl">
                <img alt="" src={TAIL_IMG} className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-10 -right-10 hidden max-w-xs rounded-xl border-l-4 border-luxury-gold bg-white p-8 shadow-xl lg:block">
                <p className="mb-2 font-headline text-2xl font-bold italic text-midnight-burgundy">
                  &quot;Unmatched service that feels entirely personal.&quot;
                </p>
                <p className="font-medium text-on-surface-variant">— Condé Nast Traveler</p>
              </div>
            </div>
            <div>
              <span className="font-label mb-4 block font-extrabold tracking-[0.2em] text-midnight-burgundy">
                THE SOVEREIGN DIFFERENCE
              </span>
              <h2 className="mb-8 font-headline text-5xl font-black tracking-tighter text-on-surface">
                Elevating Every <br />
                Altitude
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-on-surface-variant">
                From the moment you arrive at the airport to your final destination, The Sovereign
                provides a seamless flow of luxury. We don&apos;t just transport you; we curate an
                environment of tranquility and excellence.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-headline text-lg font-bold text-midnight-burgundy">
                    <UtensilsCrossed className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    Gourmet Dining
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    Menus crafted by Michelin-starred chefs using seasonal ingredients.
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-headline text-lg font-bold text-midnight-burgundy">
                    <Headset className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    Concierge Service
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    Dedicated assistance for your every need throughout the journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
