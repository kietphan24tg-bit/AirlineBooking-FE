/** Flight cabin fare option (results UI). */
export type CabinClassKey = 'Economy' | 'Premium' | 'Business' | 'First';

export interface CabinFare {
  cabin: CabinClassKey;
  /** Formatted for display, e.g. "1.400.000 ₫" */
  priceLabel: string;
  currency?: string;
  /** Numeric total for sorting / filtering (same basis as priceLabel) */
  priceAmount: number;
  highlight?: boolean;
  benefits: string[];
  fareId?: number;
  fareCode?: string;
}

/** One flight option row. */
export interface FlightLeg {
  id: string;
  flightNumber: string;
  aircraft: string;
  airlineLabel: string;
  departureCode: string;
  departureCity: string;
  departureTime: string;
  arrivalCode: string;
  arrivalCity: string;
  arrivalTime: string;
  durationLabel: string;
  /** Minutes between departure and arrival (for sorting). */
  durationMinutes: number;
  direct: boolean;
  badge?: string;
  cabinFares: CabinFare[];
}

export interface FlightSearchSummary {
  routeTitle: string;
  metaLine: string;
}

/** Trip + passenger criteria (URL + API). */
export type FlightSearchTripTypeApi = 'ONE_WAY' | 'ROUND_TRIP';

export interface FlightSearchCriteria {
  tripType: FlightSearchTripTypeApi;
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  adult: number;
  child: number;
  infant: number;
  promoCode?: string;
  /** Display labels from landing (optional). */
  fromCity?: string;
  toCity?: string;
}

/** Extra filters (sidebar) — merged into API query on refetch. */
export interface FlightSearchFilters {
  connectionFilter?: 'ANY' | 'DIRECT_ONLY';
  departureTimeBucket?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  arrivalTimeBucket?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  /** Subset of ECONOMY | PREMIUM | BUSINESS | FIRST — empty = no preference */
  cabinClasses: string[];
  maxBudget: number | null;
}

export interface FlightSearchPageInfo {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface FlightPriceRange {
  minPrice: number;
  maxPrice: number;
  currency: string;
}

export interface FlightSearchResultBundle {
  outbound: FlightLeg[];
  inbound: FlightLeg[];
  outboundPageInfo: FlightSearchPageInfo;
  inboundPageInfo: FlightSearchPageInfo;
  outboundPriceRange: FlightPriceRange | null;
  inboundPriceRange: FlightPriceRange | null;
}
