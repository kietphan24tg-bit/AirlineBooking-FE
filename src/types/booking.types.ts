export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

export interface TripRecord {
  id: string;
  route: string;
  dateLabel: string;
  status: BookingStatus;
  cabin?: string;
}

export interface PassengerProfile {
  id: string;
  fullName: string;
  seat?: string;
}

export type PassengerType = 'ADULT' | 'CHILD' | 'INFANT';

export type IdentifyType = 'ID_CARD' | 'PASSPORT';

/** Passenger details from PassengerInfo, forwarded via `navigate(..., { state })`. */
export interface PassengerBookingDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passengerType: PassengerType;
  identifyType: IdentifyType;
  identifyNumber: string;
  expiryDate: string;
  email?: string;
  phone?: string;
}

export type PassengerInfoNavigationState = {
  passengers: PassengerBookingDetails[];
};

export interface BookingContactPayload {
  email: string;
  phone: string;
  primary: boolean;
}

export interface BookingPassengerPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passengerType: PassengerType;
  identifyType: IdentifyType;
  identifyNumber: string;
  expiryDate: string;
}

export interface BookingCreateRequest {
  revalidateId: string;
  idempotencyKey: string;
  passengerSummary: {
    adult: number;
    child: number;
    infant: number;
  };
  contacts: BookingContactPayload[];
  passengers: BookingPassengerPayload[];
}

export interface BookingCreateResponse {
  id?: string | number;
  bookingId?: string | number;
  booking?: {
    bookingId?: string | number;
    pnrCode?: string;
    bookingCode?: string;
    pnr?: string;
    status?: string;
    expiresAt?: string;
    createdAt?: string;
  };
  flight?: {
    flightId?: number;
    flightNumber?: string;
    flightDate?: string;
    [key: string]: unknown;
  };
  fare?: {
    fareId?: number;
    fareClassId?: number;
    code?: string;
    fareCode?: string;
    name?: string;
    cabinClass?: string;
    [key: string]: unknown;
  };
  bookingCode?: string;
  pnr?: string;
  pricing?: {
    currency: string;
    baseFare: number;
    taxes: number;
    fees: number;
    originalTotalPrice: number;
    discountAmount: number;
    discountPercent: number | null;
    discountedTotalPrice: number;
  } | null;
  contacts?: BookingContactPayload[];
  passengers?: BookingPassengerPayload[];
  passengerSummary?: {
    adult: number;
    child: number;
    infant: number;
  };
  [key: string]: unknown;
}
