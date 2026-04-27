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

/** Contact as returned from `POST /api/bookings` (adds server id). */
export type BookingContactWithId = BookingContactPayload & {
  contactId?: number;
};

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

/**
 * Passenger as returned from `POST /api/bookings` (adds `passengerId`).
 * `identifyType` may be `CCCD` in API responses; forms still use `ID_CARD` / `PASSPORT`.
 */
export type BookingPassengerWithId = Omit<BookingPassengerPayload, 'identifyType'> & {
  identifyType: BookingPassengerPayload['identifyType'] | 'CCCD';
  passengerId?: number;
  id?: number;
};

export interface BookingEntity {
  bookingId?: string | number;
  pnrCode?: string;
  bookingCode?: string;
  pnr?: string;
  status?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface BookingPromotion {
  promoCode: string | null;
  promotionId: number | null;
  discountAmount: number;
  discountPercent: number | null;
}

export interface SeatReservationInfo {
  reservedSeatCount: number;
  status: string;
  reservedUntil: string;
}

export interface BookingNextAction {
  type: string;
  endpoint: string;
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

/**
 * `POST /api/bookings` success body — all nested detail is also kept on `BookingSession.raw`
 * for follow-up steps (seats, payment, etc.).
 */
export interface BookingCreateResponse {
  id?: string | number;
  bookingId?: string | number;
  booking?: BookingEntity;
  flight?: {
    flightId?: number;
    flightNumber?: string;
    flightDate?: string;
    status?: string;
    airline?: Record<string, unknown>;
    departure?: Record<string, unknown>;
    arrival?: Record<string, unknown>;
    [key: string]: unknown;
  };
  fare?: {
    fareId?: number;
    fareClassId?: number;
    status?: string;
    code?: string;
    fareCode?: string;
    name?: string;
    cabinClass?: string;
    basePrice?: number;
    taxes?: number;
    totalPrice?: number;
    currency?: string;
    baggageCheckinKg?: number;
    baggageHandKg?: number;
    isRefundable?: boolean;
    isChangeable?: boolean;
    changeFee?: number;
    refundFee?: number;
    [key: string]: unknown;
  };
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
  promotion?: BookingPromotion;
  seatReservation?: SeatReservationInfo;
  nextAction?: BookingNextAction;
  bookingCode?: string;
  pnr?: string;
  contacts?: BookingContactWithId[];
  passengers?: BookingPassengerWithId[];
  passengerSummary?: {
    adult: number;
    child: number;
    infant: number;
  };
  [key: string]: unknown;
}

export interface SeatAssignmentPair {
  passengerId: number;
  seatId: number;
}

export interface SeatAssignmentRequest {
  assignments: SeatAssignmentPair[];
}

export interface SeatAssignmentItem {
  passengerId: number;
  seatId: number;
  status: string;
  surchargeAmount: number;
  currency: string;
}

export interface SeatAssignmentResponse {
  bookingId: number;
  status: string;
  seatSurchargeTotal: number;
  totalAmount: number;
  assignments: SeatAssignmentItem[];
}

export type SeatUnassignmentRequest = SeatAssignmentRequest;
export type SeatUnassignmentResponse = SeatAssignmentResponse;

// PUT /api/bookings/{bookingId}/services
export interface BookingServiceSelectionInput {
  optionId: number;
  quantity: number;
}

export interface BookingServicesPassengerInput {
  passengerId: number;
  selections: BookingServiceSelectionInput[];
}

export interface PutBookingServicesRequest {
  passengers: BookingServicesPassengerInput[];
}

export interface BookingServiceSelectionItem {
  serviceId: number;
  serviceType: string;
  serviceName: string;
  optionId: number;
  optionName: string;
  quantity: number;
  price: number;
}

export interface PassengerWithServiceSelections {
  passengerId: number;
  selections: BookingServiceSelectionItem[];
}

export interface PutBookingServicesResponse {
  bookingId: number;
  ancillaryTotal: number;
  totalAmount: number;
  currency: string;
  passengers: PassengerWithServiceSelections[];
}
