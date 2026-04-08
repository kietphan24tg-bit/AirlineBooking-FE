/** Flight cabin fare option (stitch_plane results UI). */
export interface CabinFare {
  cabin: 'Economy' | 'Premium' | 'Business' | 'First';
  priceLabel: string;
  currency?: string;
  highlight?: boolean;
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
  direct: boolean;
  badge?: string;
  cabinFares: CabinFare[];
}

export interface FlightSearchSummary {
  routeTitle: string;
  metaLine: string;
}
