import api from '../api/axios';
import {
  getMockSeatMapResponse,
  getMockServiceCatalogResponse,
  isManageBookingMockVariant,
  type ManageBookingMockVariant,
} from '../mocks/manageBooking';
import { getMockReservedSeatsForFlight } from './booking.service';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  CabinClassKey,
  CabinFare,
  FlightCalendarDay,
  FlightCalendarSearchResult,
  FlightLeg,
  FlightPriceRange,
  FlightRevalidateFareRequest,
  FlightRevalidateFareResponse,
  FlightRevalidateItineraryRequest,
  FlightRevalidateItineraryResponse,
  FlightSearchCriteria,
  FlightSearchFilters,
  FlightSearchPageInfo,
  FlightSearchResultBundle,
  SeatMapCell,
  SeatMapResponse,
  ServiceCatalogResponse,
  ServiceGroup,
  ServiceOption,
} from '../types/flight.types';
import { mapFlightResultsSortToApiSort, type FlightResultsSort } from '../utils/flightSearchUrl';

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
  selectable?: boolean;
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

export interface FlightCalendarDayDto {
  date: string;
  available: boolean;
  lowestPrice: number | null;
  highestPrice: number | null;
  currency: string | null;
  flightCount: number;
  flights: SearchFlightDto[];
}

export interface FlightCalendarSearchDataDto {
  centerDate: string;
  selectedDate: string;
  currency: string | null;
  days: FlightCalendarDayDto[];
  selectedDay: FlightCalendarDayDto | null;
}

export type FlightCalendarSearchApiEnvelope = {
  success?: boolean;
  data?: FlightCalendarSearchDataDto;
  message?: string;
};

const CABIN_ORDER: CabinClassKey[] = ['Economy', 'Premium', 'Business', 'First'];

function unwrapData(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const b = body as Record<string, unknown>;
  if ('data' in b && b.data != null) return b.data;
  return body;
}

function resolveMockManageVariantForFlights(): ManageBookingMockVariant | null {
  const isDevLocal =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isManageRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/manage-booking');
  if (!isManageRoute) return null;
  const envFlag = import.meta.env?.VITE_MOCK_MANAGE_BOOKING === 'true';
  let urlFlag = false;
  let urlVariant: string | null = null;
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    urlFlag = params.get('mockManageBooking') === '1';
    urlVariant = params.get('mockManageVariant');
  }
  const { mockManageBookingMode, manageOptions, bookingLookup, lookupCriteria } =
    useBookingStore.getState();
  const looksLikePersistedMock =
    isDevLocal &&
    (bookingLookup?.booking?.pnrCode?.trim().toUpperCase() === 'ABC123' ||
      lookupCriteria?.pnrCode?.trim().toUpperCase() === 'ABC123' ||
      manageOptions?.bookingId === 90210);
  if (urlFlag || envFlag) {
    if (urlVariant && isManageBookingMockVariant(urlVariant)) return urlVariant;
    if (mockManageBookingMode || looksLikePersistedMock) {
      if (
        (manageOptions?.passengers?.length ?? 0) === 1 &&
        (manageOptions?.itineraries?.length ?? 0) === 1
      ) {
        return 'CHECKIN_SINGLE';
      }
      return 'CONFIRMED';
    }
    return 'CONFIRMED';
  }

  if (mockManageBookingMode || looksLikePersistedMock) {
    if (
      (manageOptions?.passengers?.length ?? 0) === 1 &&
      (manageOptions?.itineraries?.length ?? 0) === 1
    ) {
      return 'CHECKIN_SINGLE';
    }
    return 'CONFIRMED';
  }

  return null;
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
    const originalPrice = f.originalTotalPrice;
    const discountedPrice =
      f.discountedTotalPrice != null && f.discountedTotalPrice > 0 ? f.discountedTotalPrice : null;
    const finalPrice =
      discountedPrice != null && discountedPrice < originalPrice ? discountedPrice : originalPrice;
    const hasDiscount = finalPrice < originalPrice;
    const existing = byCabin.get(cabin);
    if (!existing || finalPrice < existing.priceAmount) {
      byCabin.set(cabin, {
        cabin,
        priceLabel: formatMoney(finalPrice, cur),
        currency: cur,
        priceAmount: finalPrice,
        originalPrice,
        originalPriceLabel: formatMoney(originalPrice, cur),
        finalPrice,
        finalPriceLabel: formatMoney(finalPrice, cur),
        discountAmount: hasDiscount
          ? Math.max(0, f.discountAmount || originalPrice - finalPrice)
          : 0,
        discountAmountLabel: hasDiscount
          ? formatMoney(Math.max(0, f.discountAmount || originalPrice - finalPrice), cur)
          : undefined,
        discountPercent: hasDiscount ? f.discountPercent : null,
        promoStatus: f.promoStatus,
        promoMessage: f.promoMessage,
        hasDiscount,
        selectable: f.selectable !== false,
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

function mapCalendarDay(
  day: FlightCalendarDayDto,
  criteria: FlightSearchCriteria
): FlightCalendarDay {
  const originCode = criteria.from.toUpperCase();
  const destCode = criteria.to.toUpperCase();
  const originCity = criteria.fromCity?.trim() || originCode;
  const destCity = criteria.toCity?.trim() || destCode;
  const ctx: AirportCityContext = { originCode, destCode, originCity, destCity };

  return {
    date: day.date,
    available: day.available,
    lowestPrice: day.lowestPrice,
    highestPrice: day.highestPrice,
    currency: day.currency,
    flightCount: day.flightCount,
    flights: (day.flights ?? []).map((flight) => mapSearchFlightToLeg(flight, ctx)),
  };
}

function mapCalendarBundle(
  data: FlightCalendarSearchDataDto,
  criteria: FlightSearchCriteria
): FlightCalendarSearchResult {
  const days = (data.days ?? []).map((day) => mapCalendarDay(day, criteria));
  const selectedDay =
    days.find((day) => day.date === data.selectedDate) ??
    (data.selectedDay ? mapCalendarDay(data.selectedDay, criteria) : null);

  return {
    centerDate: data.centerDate,
    selectedDate: data.selectedDate,
    currency: data.currency,
    days,
    selectedDay,
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
  sort: FlightResultsSort,
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
    sortBy: mapFlightResultsSortToApiSort(sort),
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

function buildCalendarApiQuery(
  criteria: FlightSearchCriteria,
  filters: FlightSearchFilters,
  sort: FlightResultsSort,
  extra?: { limit?: number; daysBefore?: number; daysAfter?: number }
): Record<string, unknown> {
  const q = buildApiQuery(criteria, filters, sort, extra ? { limit: extra.limit } : undefined);
  delete q.departureDate;
  q.centerDate = criteria.departureDate;
  if (extra?.daysBefore != null) q.daysBefore = extra.daysBefore;
  if (extra?.daysAfter != null) q.daysAfter = extra.daysAfter;
  return q;
}

function addDays(dateIso: string, offset: number): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  date.setDate(date.getDate() + offset);
  return formatDateOnly(date);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayIso(): string {
  return formatDateOnly(new Date());
}

function atLocalTime(dateIso: string, time: string): string {
  return `${dateIso}T${time}+07:00`;
}

function buildMockCalendarFlight(
  criteria: FlightSearchCriteria,
  dayIso: string,
  dayOffset: number,
  index: number
): SearchFlightDto {
  const prices = [920000, 1080000, 1260000];
  const departureTimes = ['06:30:00', '10:20:00', '18:45:00'];
  const durations = [125, 130, 140];
  const flightNumberSeed = 220 + dayOffset * 3 + index;
  const flightIdSeed = 80000 + dayOffset * 10 + index;
  const basePrice = prices[index] + dayOffset * 35000;
  const mockFarePrices = {
    economy: 700000,
    premium: 1000000,
    business: 1350000,
    first: 1900000,
  };
  const departureTimeIso = atLocalTime(dayIso, departureTimes[index] ?? '08:30:00');
  const departureDate = new Date(departureTimeIso);
  const arrivalDate = new Date(departureDate.getTime() + (durations[index] ?? 125) * 60_000);
  const arrivalTimeIso = arrivalDate.toISOString().replace('Z', '+00:00');

  return {
    flightId: flightIdSeed,
    flightNumber: `VN${flightNumberSeed}`,
    airlineCode: 'VN',
    airlineName: 'Vietnam Airlines',
    fromAirportCode: criteria.from.toUpperCase(),
    toAirportCode: criteria.to.toUpperCase(),
    flightDate: dayIso,
    departureTime: departureTimeIso,
    arrivalTime: arrivalTimeIso,
    currency: 'VND',
    fares: [
      {
        fareId: flightIdSeed * 10 + 1,
        fareCode: 'ECONOMY',
        cabinClass: 'ECONOMY',
        fareStatus: 'AVAILABLE',
        selectable: true,
        originalTotalPrice: mockFarePrices.economy + 120000,
        discountedTotalPrice: mockFarePrices.economy,
        discountAmount: 180000,
        discountPercent: 16,
        promoStatus: 'APPLIED',
        promoMessage: 'Mock calendar fare',
        fareClassBenefits: {
          fareClassId: 1,
          fareClassName: 'Economy Flex',
          fareClassCode: 'ECO',
          baggageCheckinKg: 23,
          baggageHandKg: 7,
          changeFee: 350000,
          refundFee: 650000,
          refundable: true,
          changeable: true,
          priorityCheckin: false,
          priorityBoarding: false,
          mileageRate: 1,
          loungeAccess: false,
          seatSelection: true,
          mealType: 'STANDARD',
          wifiIncluded: false,
          fastTrackSecurity: false,
        },
      },
      {
        fareId: flightIdSeed * 10 + 2,
        fareCode: 'PREMIUM',
        cabinClass: 'PREMIUM_ECONOMY',
        fareStatus: 'AVAILABLE',
        selectable: true,
        originalTotalPrice: mockFarePrices.premium + 120000,
        discountedTotalPrice: mockFarePrices.premium,
        discountAmount: 100000,
        discountPercent: 8,
        promoStatus: 'APPLIED',
        promoMessage: 'Mock premium fare',
        fareClassBenefits: {
          fareClassId: 2,
          fareClassName: 'Premium Economy Flex',
          fareClassCode: 'PRE',
          baggageCheckinKg: 32,
          baggageHandKg: 10,
          changeFee: 250000,
          refundFee: 450000,
          refundable: true,
          changeable: true,
          priorityCheckin: true,
          priorityBoarding: true,
          mileageRate: 1.25,
          loungeAccess: false,
          seatSelection: true,
          mealType: 'PREMIUM',
          wifiIncluded: true,
          fastTrackSecurity: false,
        },
      },
      {
        fareId: flightIdSeed * 10 + 3,
        fareCode: 'BUSINESS',
        cabinClass: 'BUSINESS',
        fareStatus: 'AVAILABLE',
        selectable: true,
        originalTotalPrice: mockFarePrices.business + 180000,
        discountedTotalPrice: mockFarePrices.business,
        discountAmount: 190000,
        discountPercent: 14,
        promoStatus: 'APPLIED',
        promoMessage: 'Mock business fare',
        fareClassBenefits: {
          fareClassId: 3,
          fareClassName: 'Business Flex',
          fareClassCode: 'BUS',
          baggageCheckinKg: 46,
          baggageHandKg: 14,
          changeFee: 0,
          refundFee: 250000,
          refundable: true,
          changeable: true,
          priorityCheckin: true,
          priorityBoarding: true,
          mileageRate: 1.75,
          loungeAccess: true,
          seatSelection: true,
          mealType: 'GOURMET',
          wifiIncluded: true,
          fastTrackSecurity: true,
        },
      },
      {
        fareId: flightIdSeed * 10 + 4,
        fareCode: 'FIRST',
        cabinClass: 'FIRST',
        fareStatus: 'AVAILABLE',
        selectable: true,
        originalTotalPrice: mockFarePrices.first + 220000,
        discountedTotalPrice: mockFarePrices.first,
        discountAmount: 290000,
        discountPercent: 12,
        promoStatus: 'APPLIED',
        promoMessage: 'Mock first fare',
        fareClassBenefits: {
          fareClassId: 4,
          fareClassName: 'First Suite Flex',
          fareClassCode: 'FST',
          baggageCheckinKg: 64,
          baggageHandKg: 18,
          changeFee: 0,
          refundFee: 0,
          refundable: true,
          changeable: true,
          priorityCheckin: true,
          priorityBoarding: true,
          mileageRate: 2,
          loungeAccess: true,
          seatSelection: true,
          mealType: 'GOURMET',
          wifiIncluded: true,
          fastTrackSecurity: true,
        },
      },
    ],
  };
}

function buildMockCalendarSearchResult(
  criteria: FlightSearchCriteria,
  extra?: { limit?: number; daysBefore?: number; daysAfter?: number }
): FlightCalendarSearchResult {
  const effectiveCenterDate =
    criteria.departureDate < getTodayIso() ? getTodayIso() : criteria.departureDate;
  const daysBefore = extra?.daysBefore ?? 3;
  const daysAfter = extra?.daysAfter ?? 3;
  const limit = extra?.limit ?? 10;
  const days: FlightCalendarDay[] = [];

  for (let offset = -daysBefore; offset <= daysAfter; offset += 1) {
    const dayIso = addDays(effectiveCenterDate, offset);
    const noFlights = Math.abs(offset) === 3;
    const rawFlights = noFlights
      ? []
      : [0, 1, 2].map((index) => buildMockCalendarFlight(criteria, dayIso, offset, index)).slice(0, limit);
    const flights = rawFlights.map((flight) =>
      mapSearchFlightToLeg(flight, {
        originCode: criteria.from.toUpperCase(),
        destCode: criteria.to.toUpperCase(),
        originCity: criteria.fromCity?.trim() || criteria.from.toUpperCase(),
        destCity: criteria.toCity?.trim() || criteria.to.toUpperCase(),
      })
    );
    const prices = flights
      .map((flight) =>
        flight.cabinFares
          .filter((fare) => fare.selectable)
          .map((fare) => fare.priceAmount)
          .sort((a, b) => a - b)[0]
      )
      .filter((price): price is number => Number.isFinite(price));

    days.push({
      date: dayIso,
      available: flights.length > 0,
      lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
      highestPrice: prices.length > 0 ? Math.max(...prices) : null,
      currency: flights.length > 0 ? 'VND' : null,
      flightCount: flights.length,
      flights,
    });
  }

  const selectedDay = days.find((day) => day.date === effectiveCenterDate) ?? null;
  return {
    centerDate: effectiveCenterDate,
    selectedDate: effectiveCenterDate,
    currency: days.find((day) => day.currency)?.currency ?? null,
    days,
    selectedDay,
  };
}

export async function searchFlightsMapped(
  criteria: FlightSearchCriteria,
  filters: FlightSearchFilters,
  sort: FlightResultsSort,
  extra?: { limit?: number; outboundCursor?: string; inboundCursor?: string }
): Promise<FlightSearchResultBundle> {
  const query = buildApiQuery(criteria, filters, sort, extra);
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

export async function searchCalendarMapped(
  criteria: FlightSearchCriteria,
  filters: FlightSearchFilters,
  sort: FlightResultsSort,
  extra?: { limit?: number; daysBefore?: number; daysAfter?: number }
): Promise<FlightCalendarSearchResult> {
  const mockVariant = resolveMockManageVariantForFlights();
  if (mockVariant) {
    return buildMockCalendarSearchResult(criteria, extra);
  }

  const query = buildCalendarApiQuery(criteria, filters, sort, extra);
  const qs = serializeSearchParams(query);
  const res = await api.get<FlightCalendarSearchApiEnvelope | FlightCalendarSearchDataDto>(
    `/api/flights/search-calendar?${qs}`
  );
  const raw = unwrapData(res.data) as FlightCalendarSearchDataDto;
  if (!raw || typeof raw !== 'object') {
    return {
      centerDate: criteria.departureDate,
      selectedDate: criteria.departureDate,
      currency: null,
      days: [],
      selectedDay: null,
    };
  }
  return mapCalendarBundle(raw, criteria);
}

export async function revalidateFareMapped(
  payload: FlightRevalidateFareRequest
): Promise<FlightRevalidateFareResponse> {
  // Re-check the selected fare right before booking so the backend can confirm
  // the latest price/availability and return a revalidateId for downstream steps.
  const res = await api.post<
    FlightRevalidateFareResponse | { data?: FlightRevalidateFareResponse }
  >('/api/flights/revalidate-fare', payload);
  const raw = unwrapData(res.data) as FlightRevalidateFareResponse;
  if (!raw?.revalidateId) {
    throw new Error('Fare revalidation failed');
  }
  return raw;
}

export async function revalidateItineraryMapped(
  payload: FlightRevalidateItineraryRequest
): Promise<FlightRevalidateItineraryResponse> {
  const res = await api.post<
    FlightRevalidateItineraryResponse | { data?: FlightRevalidateItineraryResponse }
  >('/api/flights/revalidate-itinerary', payload);
  const raw = unwrapData(res.data) as FlightRevalidateItineraryResponse;
  if (!raw?.revalidateId || !Array.isArray(raw.segments) || raw.segments.length === 0) {
    throw new Error('Itinerary revalidation failed');
  }
  return raw;
}

export async function getSeatMapMapped(flightId: number, fareId: number): Promise<SeatMapResponse> {
  const mockVariant = resolveMockManageVariantForFlights();
  if (mockVariant) {
    const reservedOverrides = getMockReservedSeatsForFlight(mockVariant, flightId);
    const mockSeatMap = getMockSeatMapResponse(mockVariant, flightId, fareId, reservedOverrides);
    if (mockSeatMap) return normalizeSeatMap(mockSeatMap);
  }
  const res = await api.get<SeatMapResponse | { data?: SeatMapResponse }>(
    `/api/flights/${flightId}/seats`,
    {
      params: { fareId },
    }
  );
  const raw = unwrapData(res.data) as SeatMapResponse;
  if (!raw?.layout?.columns?.length || !Array.isArray(raw.rows)) {
    throw new Error('Seat map is unavailable for this fare');
  }
  return normalizeSeatMap(raw);
}

export async function getServicesMapped(
  flightId: number,
  fareId: number
): Promise<ServiceCatalogResponse> {
  const mockVariant = resolveMockManageVariantForFlights();
  if (mockVariant) {
    const mockCatalog = getMockServiceCatalogResponse(mockVariant, flightId, fareId);
    if (mockCatalog) return normalizeServiceCatalog(mockCatalog);
  }
  const res = await api.get<ServiceCatalogResponse | { data?: ServiceCatalogResponse }>(
    '/api/services',
    {
      params: { flightId, fareId },
    }
  );
  const raw = unwrapData(res.data) as ServiceCatalogResponse;
  return normalizeServiceCatalog(raw);
}

function normalizeSeatDisplayText(cell: SeatMapCell, fallbackCurrency: string): string {
  const current = cell.displayPrice?.text?.trim();
  if (current) return current;

  const badgeCode = cell.pricingBadge?.code ?? cell.displayPrice?.type;
  if (!cell.selectable) {
    if (badgeCode === 'NOT_ALLOWED' || cell.reason === 'SEAT_NOT_ALLOWED_FOR_FARE') {
      return 'Not allowed';
    }
    return 'Unavailable';
  }

  if (badgeCode === 'FREE' || cell.included || (cell.extraPrice ?? 0) <= 0) {
    return cell.included ? 'Included' : 'Free';
  }

  const currency = cell.currency ?? fallbackCurrency;
  return `+${cell.extraPrice?.toLocaleString('vi-VN') ?? ''} ${currency}`.trim();
}

function normalizeSeatDisplayType(cell: SeatMapCell): string {
  const current = cell.displayPrice?.type ?? cell.pricingBadge?.code;
  if (current) return current;
  if (!cell.selectable) {
    return cell.reason === 'SEAT_NOT_ALLOWED_FOR_FARE' ? 'NOT_ALLOWED' : 'UNAVAILABLE';
  }
  if (cell.included || (cell.extraPrice ?? 0) <= 0) return 'FREE';
  return 'PAID';
}

function normalizeSeatMap(raw: SeatMapResponse): SeatMapResponse {
  return {
    ...raw,
    rows: raw.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        const type = normalizeSeatDisplayType(cell);
        const text = normalizeSeatDisplayText(cell, raw.currency);
        const currency = cell.currency ?? cell.displayPrice?.currency ?? raw.currency;
        return {
          ...cell,
          displayPrice: {
            type,
            text,
            amount: cell.displayPrice?.amount ?? cell.extraPrice,
            currency: cell.displayPrice?.currency ?? cell.currency,
            description: cell.displayPrice?.description ?? '',
          },
          pricingBadge: {
            code: cell.pricingBadge?.code ?? type,
            label: cell.pricingBadge?.label ?? text,
            description: cell.pricingBadge?.description ?? '',
          },
          currency,
        };
      }),
    })),
  };
}

function normalizeServiceCatalog(raw: ServiceCatalogResponse): ServiceCatalogResponse {
  const fallbackCurrency = raw?.currency || 'VND';
  if (!raw || !Array.isArray(raw.services)) {
    throw new Error('Service catalog is unavailable for this fare');
  }

  return {
    currency: fallbackCurrency,
    services: raw.services
      .filter((service) => service && typeof service === 'object')
      .map((service) => normalizeServiceGroup(service, fallbackCurrency)),
  };
}

function normalizeServiceGroup(service: ServiceGroup, fallbackCurrency: string): ServiceGroup {
  const serviceId = Number(service.serviceId);
  const serviceType = service.serviceType || 'SERVICE';
  const serviceName = service.serviceName || serviceType.replace(/_/g, ' ');

  return {
    serviceId,
    serviceType,
    serviceName,
    iconUrl: service.iconUrl || null,
    selectionMode: service.selectionMode || 'SINGLE',
    options: Array.isArray(service.options)
      ? service.options
          .filter((option) => option && typeof option === 'object')
          .map((option) =>
            normalizeServiceOption(option, serviceId, serviceType, serviceName, fallbackCurrency)
          )
      : [],
  };
}

function normalizeServiceOption(
  option: ServiceOption,
  serviceId: number,
  serviceType: string,
  serviceName: string,
  fallbackCurrency: string
): ServiceOption {
  const price = Number(option.price ?? 0);
  const currency = option.currency || fallbackCurrency;

  return {
    optionId: Number(option.optionId),
    serviceId,
    serviceType,
    serviceName,
    name: option.name || 'Service option',
    description: option.description || '',
    price: Number.isFinite(price) ? price : 0,
    currency,
    priceLabel: formatMoney(Number.isFinite(price) ? price : 0, currency),
    imageUrl: option.imageUrl || null,
    isActive: option.isActive !== false,
  };
}

export const flightService = {
  searchCalendar: searchCalendarMapped,
  searchFlights: searchFlightsMapped,
  revalidateFare: revalidateFareMapped,
  revalidateItinerary: revalidateItineraryMapped,
  getSeatMap: getSeatMapMapped,
  getServices: getServicesMapped,
};
