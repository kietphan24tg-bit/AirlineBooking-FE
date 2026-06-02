/** Flight cabin fare option (results UI). */
export type CabinClassKey = 'Economy' | 'Premium' | 'Business' | 'First';

export interface CabinFare {
  cabin: CabinClassKey;
  /** Formatted for display, e.g. "1.400.000 ₫" */
  priceLabel: string;
  currency?: string;
  /** Numeric total for sorting / filtering (same basis as priceLabel) */
  priceAmount: number;
  originalPrice: number;
  originalPriceLabel: string;
  finalPrice: number;
  finalPriceLabel: string;
  discountAmount: number;
  discountAmountLabel?: string;
  discountPercent: number | null;
  promoStatus?: string;
  promoMessage?: string | null;
  hasDiscount: boolean;
  selectable: boolean;
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
  /** Subset of ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST — empty = no preference */
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

export interface FlightCalendarDay {
  date: string;
  available: boolean;
  lowestPrice: number | null;
  highestPrice: number | null;
  currency: string | null;
  flightCount: number;
  flights: FlightLeg[];
}

export interface FlightCalendarSearchResult {
  centerDate: string;
  selectedDate: string;
  currency: string | null;
  days: FlightCalendarDay[];
  selectedDay: FlightCalendarDay | null;
}

export interface FlightRevalidatePassengerSummary {
  adult: number;
  child: number;
  infant: number;
}

export interface FlightRevalidateFareRequest {
  flightId: number;
  fareId: number;
  promoCode: string;
  passengerSummary: FlightRevalidatePassengerSummary;
}

export interface FlightRevalidatePricing {
  currency: string;
  baseFare: number;
  taxes: number;
  fees: number;
  originalTotalPrice: number;
  discountAmount: number;
  discountPercent: number | null;
  discountedTotalPrice: number;
}

export interface FlightRevalidateFareResponse {
  revalidateId: string;
  expiresInSeconds: number;
  flightId: number;
  fareId: number;
  promoCode: string;
  passengerSummary: FlightRevalidatePassengerSummary;
  pricing: FlightRevalidatePricing;
}

export type FlightItineraryTripType = 'ONE_WAY' | 'ROUND_TRIP';
export type FlightItinerarySegmentDirection = 'OUTBOUND' | 'INBOUND';

export interface FlightRevalidateItinerarySegmentRequest {
  direction: FlightItinerarySegmentDirection;
  flightId: number;
  fareId: number;
}

export interface FlightRevalidateItineraryRequest {
  tripType: FlightItineraryTripType;
  promoCode: string;
  passengerSummary: FlightRevalidatePassengerSummary;
  segments: FlightRevalidateItinerarySegmentRequest[];
}

export interface FlightRevalidateItinerarySegment {
  direction: FlightItinerarySegmentDirection;
  flightId: number;
  fareId: number;
  fareClassId: number;
  fareCode: string;
  fareName: string;
  cabinClass: string;
  currency: string;
  pricing: FlightRevalidatePricing;
}

export interface FlightRevalidateItineraryResponse {
  revalidateId: string;
  expiresInSeconds: number;
  tripType: FlightItineraryTripType;
  promoCode: string;
  passengerSummary: FlightRevalidatePassengerSummary;
  pricing: FlightRevalidatePricing;
  segments: FlightRevalidateItinerarySegment[];
}

export type SeatMapSeatStatus = 'AVAILABLE' | 'RESERVED' | 'BOOKED' | 'UNAVAILABLE';

export type SeatMapSeatType = 'WINDOW' | 'MIDDLE' | 'AISLE';

export type SeatMapSeatCategory = 'STANDARD' | 'PREFERRED' | 'EXIT_ROW' | 'EXTRA_LEGROOM';

export type SeatMapSeatClass = 'BUSINESS' | 'ECONOMY' | string;

export type SeatMapSeatReason = 'SEAT_NOT_ALLOWED_FOR_FARE' | 'SEAT_UNAVAILABLE' | string | null;

export interface SeatMapLayoutZone {
  seatClass: SeatMapSeatClass;
  rowStart: number;
  rowEnd: number;
}

export interface SeatMapLayout {
  columns: string[];
  aisleAfterColumns: string[];
  seatClassZones: SeatMapLayoutZone[];
}

export interface SeatMapLegend {
  statuses: SeatMapSeatStatus[];
  seatTypes: SeatMapSeatType[];
  seatCategories: SeatMapSeatCategory[];
  statusItems?: SeatMapDisplayItem[];
  seatTypeItems?: SeatMapDisplayItem[];
  seatCategoryItems?: SeatMapDisplayItem[];
  pricingItems?: SeatMapDisplayItem[];
}

export interface SeatMapDisplayItem {
  code: string;
  label: string;
  description: string;
}

export interface SeatMapDisplayPrice {
  type: 'FREE' | 'PAID' | 'UNAVAILABLE' | 'NOT_ALLOWED' | string;
  text: string;
  amount: number | null;
  currency: string | null;
  description: string;
}

export interface SeatMapCell {
  columnLetter: string;
  seatId: number;
  seatNumber: string;
  seatClass: SeatMapSeatClass;
  seatType: SeatMapSeatType;
  seatTypeDisplay?: SeatMapDisplayItem;
  seatCategory: SeatMapSeatCategory;
  seatCategoryDisplay?: SeatMapDisplayItem;
  status: SeatMapSeatStatus;
  statusDisplay?: SeatMapDisplayItem;
  selectable: boolean;
  included: boolean;
  extraPrice: number | null;
  currency: string | null;
  reason: SeatMapSeatReason;
  displayPrice?: SeatMapDisplayPrice;
  pricingBadge?: SeatMapDisplayItem;
}

export interface SeatMapRow {
  rowNumber: number;
  seatClass: SeatMapSeatClass;
  cells: SeatMapCell[];
}

export interface SeatMapResponse {
  flightId: number;
  fareId: number;
  fareClassId: number;
  fareCode: string;
  seatSelectionPolicy: string;
  policyDisplay?: SeatMapDisplayItem;
  includedSeatCategoryCode: string | null;
  currency: string;
  layout: SeatMapLayout;
  legend: SeatMapLegend;
  rows: SeatMapRow[];
}

export type ServiceSelectionMode = 'SINGLE' | 'MULTIPLE' | string;

export interface ServiceOption {
  optionId: number;
  serviceId: number;
  serviceType: string;
  serviceName: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  priceLabel: string;
  imageUrl: string | null;
  isActive: boolean;
}

export interface ServiceGroup {
  serviceId: number;
  serviceType: string;
  serviceName: string;
  iconUrl: string | null;
  selectionMode: ServiceSelectionMode;
  options: ServiceOption[];
}

export interface ServiceCatalogResponse {
  currency: string;
  services: ServiceGroup[];
}

export type SelectedServiceOption = ServiceOption;
