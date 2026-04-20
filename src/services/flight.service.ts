import api from '../api/axios';
import type {
  CabinClassKey,
  CabinFare,
  FlightLeg,
  FlightPriceRange,
  FlightSearchCriteria,
  FlightSearchFilters,
  FlightSearchPageInfo,
  FlightSearchResultBundle,
} from '../types/flight.types';

// --- Raw API shapes (searchFlights) ------------------------------------------

export interface FareClassBenefitsDto {
  fareClassId: number;
  fareClassName: string;
  fareClassCode: string;
  baggageCheckinKg: number;
  baggageHandKg: number;
  changeFee: number;
  refundFee: number;
  refundable: boolean;
  changeable: boolean;
  priorityCheckin: boolean;
  priorityBoarding: boolean;
  mileageRate: number;
  loungeAccess: boolean;
  seatSelection: boolean;
  mealType: string;
  wifiIncluded: boolean;
  fastTrackSecurity: boolean;
}

export interface FlightFareDto {
  fareId: number;
  fareCode: string;
  cabinClass: string;
  fareStatus: string;
  originalTotalPrice: number;
  discountedTotalPrice: number | null;
  discountAmount: number;
  discountPercent: number | null;
  promoStatus: string;
  promoMessage: string | null;
  fareClassBenefits: FareClassBenefitsDto;
}

export interface SearchFlightDto {
  flightId: number;
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  fromAirportCode: string;
  toAirportCode: string;
  flightDate: string;
  departureTime: string;
  arrivalTime: string;
  currency: string;
  fares: FlightFareDto[];
}

export interface FlightSearchDataDto {
  outbound: SearchFlightDto[];
  inbound: SearchFlightDto[];
  outboundPageInfo: FlightSearchPageInfo;
  inboundPageInfo: FlightSearchPageInfo;
  outboundPriceRange: FlightPriceRange | null;
  inboundPriceRange: FlightPriceRange | null;
}

export type FlightSearchApiEnvelope = {
  success?: boolean;
  data?: FlightSearchDataDto;
  message?: string;
};

const CABIN_ORDER: CabinClassKey[] = ['Economy', 'Premium', 'Business', 'First'];

function unwrapData(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const b = body as Record<string, unknown>;
  if ('data' in b && b.data != null) return b.data;
  return body;
}

function formatMoney(amount: number, currency: string): string {
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

function formatClockLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function durationMinutesBetween(depIso: string, arrIso: string): number {
  const a = new Date(depIso).getTime();
  const b = new Date(arrIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 60000);
}

function formatDurationLabel(depIso: string, arrIso: string): string {
  const mins = durationMinutesBetween(depIso, arrIso);
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function buildBenefitsFromFareClass(b: FareClassBenefitsDto, currency: string): string[] {
  const out: string[] = [];
  const cur = currency || 'VND';
  if (b.baggageHandKg > 0) {
    out.push(`${b.baggageHandKg}kg carry-on bag`);
  }
  if (b.baggageCheckinKg > 0) {
    if (b.baggageCheckinKg >= 500) {
      out.push('Generous checked baggage allowance');
    } else {
      out.push(`${b.baggageCheckinKg}kg checked baggage`);
    }
  }
  const meal = String(b.mealType || '').toUpperCase();
  if (meal === 'STANDARD') out.push('Standard meal service');
  else if (meal === 'PREMIUM') out.push('Premium meals');
  else if (meal === 'GOURMET') out.push('Gourmet dining');
  if (b.seatSelection) out.push('Seat selection');
  if (b.priorityBoarding) out.push('Priority boarding');
  if (b.priorityCheckin) out.push('Priority check-in');
  if (b.loungeAccess) out.push('Lounge access');
  if (b.wifiIncluded) out.push('Wi-Fi included');
  if (b.fastTrackSecurity) out.push('Fast-track security');
  if (b.changeable) {
    out.push(
      b.changeFee > 0
        ? `Changes allowed (fee from ${formatMoney(b.changeFee, cur)})`
        : 'Flexible changes'
    );
  }
  if (b.refundable) {
    out.push(
      b.refundFee > 0 ? `Refundable (fee from ${formatMoney(b.refundFee, cur)})` : 'Refundable fare'
    );
  }
  return out;
}

function normalizeCabin(fare: FlightFareDto): CabinClassKey {
  const code = fare.fareCode?.toUpperCase() ?? '';
  const cabin = fare.cabinClass?.toUpperCase() ?? '';
  const name = fare.fareClassBenefits?.fareClassName ?? '';
  if (code === 'ECONOMY' || cabin === 'ECONOMY') return 'Economy';
  if (code === 'PREMIUM' || cabin === 'PREMIUM_ECONOMY' || name.toLowerCase().includes('premium'))
    return 'Premium';
  if (code === 'BUSINESS' || cabin === 'BUSINESS') return 'Business';
  if (code === 'FIRST' || cabin === 'FIRST') return 'First';
  return 'Economy';
}

function mapFaresToCabinFares(fares: FlightFareDto[], currency: string): CabinFare[] {
  const cur = currency || 'VND';
  const byCabin = new Map<CabinClassKey, CabinFare>();
  for (const f of fares) {
    if (f.fareStatus && f.fareStatus !== 'AVAILABLE') continue;
    const cabin = normalizeCabin(f);
    const amount =
      f.discountedTotalPrice != null && f.discountedTotalPrice > 0
        ? f.discountedTotalPrice
        : f.originalTotalPrice;
    const existing = byCabin.get(cabin);
    if (!existing || amount < existing.priceAmount) {
      byCabin.set(cabin, {
        cabin,
        priceLabel: formatMoney(amount, cur),
        currency: cur,
        priceAmount: amount,
        benefits: buildBenefitsFromFareClass(f.fareClassBenefits, cur),
        fareId: f.fareId,
        fareCode: f.fareCode,
      });
    }
  }
  const ordered: CabinFare[] = [];
  for (const c of CABIN_ORDER) {
    const cf = byCabin.get(c);
    if (cf) ordered.push(cf);
  }
  const business = ordered.find((x) => x.cabin === 'Business');
  if (business) business.highlight = true;
  return ordered;
}

export type AirportCityContext = {
  originCode: string;
  destCode: string;
  originCity: string;
  destCity: string;
};

function resolveCityName(code: string, ctx: AirportCityContext): string {
  if (code === ctx.originCode) return ctx.originCity;
  if (code === ctx.destCode) return ctx.destCity;
  return code;
}

export function mapSearchFlightToLeg(flight: SearchFlightDto, ctx: AirportCityContext): FlightLeg {
  const depCity = resolveCityName(flight.fromAirportCode, ctx);
  const arrCity = resolveCityName(flight.toAirportCode, ctx);
  return {
    id: String(flight.flightId),
    flightNumber: flight.flightNumber,
    aircraft: '',
    airlineLabel: flight.airlineName || flight.airlineCode,
    departureCode: flight.fromAirportCode,
    departureCity: depCity,
    departureTime: formatClockLocal(flight.departureTime),
    arrivalCode: flight.toAirportCode,
    arrivalCity: arrCity,
    arrivalTime: formatClockLocal(flight.arrivalTime),
    durationLabel: formatDurationLabel(flight.departureTime, flight.arrivalTime),
    durationMinutes: durationMinutesBetween(flight.departureTime, flight.arrivalTime),
    direct: true,
    cabinFares: mapFaresToCabinFares(flight.fares ?? [], flight.currency),
  };
}

function mapBundle(
  data: FlightSearchDataDto,
  criteria: FlightSearchCriteria
): FlightSearchResultBundle {
  const originCode = criteria.from.toUpperCase();
  const destCode = criteria.to.toUpperCase();
  const originCity = criteria.fromCity?.trim() || originCode;
  const destCity = criteria.toCity?.trim() || destCode;
  const outCtx: AirportCityContext = { originCode, destCode, originCity, destCity };
  const inCtx: AirportCityContext = {
    originCode: destCode,
    destCode: originCode,
    originCity: destCity,
    destCity: originCity,
  };

  return {
    outbound: (data.outbound ?? []).map((f) => mapSearchFlightToLeg(f, outCtx)),
    inbound: (data.inbound ?? []).map((f) => mapSearchFlightToLeg(f, inCtx)),
    outboundPageInfo: data.outboundPageInfo,
    inboundPageInfo: data.inboundPageInfo,
    outboundPriceRange: data.outboundPriceRange,
    inboundPriceRange: data.inboundPriceRange,
  };
}

function serializeSearchParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item !== undefined && item !== null && item !== '') sp.append(key, String(item));
      }
      continue;
    }
    if (raw === '') continue;
    sp.append(key, String(raw));
  }
  return sp.toString();
}

function buildApiQuery(
  criteria: FlightSearchCriteria,
  filters: FlightSearchFilters,
  extra?: { limit?: number; outboundCursor?: string; inboundCursor?: string }
): Record<string, unknown> {
  const q: Record<string, unknown> = {
    tripType: criteria.tripType,
    from: criteria.from,
    to: criteria.to,
    departureDate: criteria.departureDate,
    adult: criteria.adult,
    child: criteria.child,
    infant: criteria.infant,
  };
  if (criteria.tripType === 'ROUND_TRIP' && criteria.returnDate) {
    q.returnDate = criteria.returnDate;
  }
  if (criteria.promoCode?.trim()) q.promoCode = criteria.promoCode.trim();

  const cf = filters.connectionFilter;
  if (cf && cf !== 'ANY') q.connectionFilter = cf;

  const dt = filters.departureTimeBucket;
  if (dt && dt !== 'ANY') q.departureTimeBucket = dt;

  const at = filters.arrivalTimeBucket;
  if (at && at !== 'ANY') q.arrivalTimeBucket = at;

  if (filters.cabinClasses.length > 0) {
    q.cabinClasses = filters.cabinClasses;
  }
  if (filters.maxBudget != null && filters.maxBudget > 0) {
    q.maxBudget = filters.maxBudget;
  }
  if (extra?.limit != null) q.limit = extra.limit;
  if (extra?.outboundCursor) q.outboundCursor = extra.outboundCursor;
  if (extra?.inboundCursor) q.inboundCursor = extra.inboundCursor;
  return q;
}

export async function searchFlightsMapped(
  criteria: FlightSearchCriteria,
  filters: FlightSearchFilters,
  extra?: { limit?: number; outboundCursor?: string; inboundCursor?: string }
): Promise<FlightSearchResultBundle> {
  const query = buildApiQuery(criteria, filters, extra);
  const qs = serializeSearchParams(query);
  const res = await api.get<FlightSearchApiEnvelope | FlightSearchDataDto>(
    `/api/flights/search?${qs}`
  );
  const raw = unwrapData(res.data) as FlightSearchDataDto;
  if (!raw || typeof raw !== 'object') {
    return {
      outbound: [],
      inbound: [],
      outboundPageInfo: { nextCursor: null, hasMore: false, limit: 20 },
      inboundPageInfo: { nextCursor: null, hasMore: false, limit: 20 },
      outboundPriceRange: null,
      inboundPriceRange: null,
    };
  }
  return mapBundle(raw, criteria);
}

export const flightService = {
  searchFlights: searchFlightsMapped,
};
