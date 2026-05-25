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
  expiryDate?: string;
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
  flightId?: number;
  seatNumber?: string;
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

export interface SeatChangeRequest {
  passengerId: number;
  fromSeatId: number;
  toSeatId?: number | null;
}

export type SeatChangeResponse = SeatAssignmentResponse;

// PUT /api/bookings/{bookingId}/services
export interface BookingServiceSelectionInput {
  flightId?: number;
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
  flightId?: number;
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

export type ServiceChangeSettlementType = 'NONE' | 'COLLECT_PAYMENT' | 'REFUND';

export interface ServiceChangePreviewRequest {
  passengers: Array<{
    passengerId: number;
    selections: BookingServiceSelectionInput[];
  }>;
}

export interface ServiceChangePreviewItem {
  flightId?: number;
  passengerId: number;
  passengerName: string | null;
  serviceId: number | null;
  serviceType: string | null;
  serviceName: string | null;
  optionId: number | null;
  optionName: string | null;
  quantity: number;
  oldAmount: number;
  newAmount: number;
  delta: number;
  status: string;
  message: string | null;
}

export interface ServiceChangePreviewResponse {
  bookingId: number;
  currency: string;
  previewToken: string;
  settlementType: ServiceChangeSettlementType;
  items: ServiceChangePreviewItem[];
  summary: {
    additionalAmount: number;
    refundAmount: number;
    netAmount: number;
  };
}

export interface ServiceChangeConfirmRequest {
  passengers: ServiceChangePreviewRequest['passengers'];
  previewToken?: string | null;
  idempotencyKey: string;
  expectedAdditionalAmount: number;
  expectedRefundAmount: number;
  expectedNetAmount: number;
}

export interface ServiceChangeConfirmResponse {
  settlementId?: number | null;
  bookingId: number;
  currency: string;
  settlementType: ServiceChangeSettlementType;
  status: 'COMPLETED' | 'REFUND_PENDING' | 'REFUND_FAILED' | 'PAYMENT_REQUIRED';
  refundStatus?: string | null;
  provider?: string | null;
  providerRefundId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  refundMethod?: {
    type: string;
    label: string;
    maskedAccount: string | null;
    estimatedDays: string | null;
  } | null;
  paymentMethods?: Array<{
    code: string;
    label: string;
    provider: string;
    icon: string | null;
    supported: boolean;
  }> | null;
  summary: {
    additionalAmount: number;
    refundAmount: number;
    netAmount: number;
  };
}

export interface BookingLookupRequest {
  pnrCode: string;
  lastName: string;
}

export interface BookingLookupSeatAssignment {
  flightId: number;
  seatId: number;
  seatNumber: string;
  status: string;
  surchargeAmount: number;
  currency: string;
}

export interface BookingLookupServiceSelection {
  flightId?: number;
  serviceId: number;
  serviceType: string;
  serviceName: string;
  optionId: number;
  optionName: string;
  quantity: number;
  price: number;
}

export interface BookingLookupResponse {
  booking: {
    bookingId: number;
    pnrCode: string;
    status: string;
    statusLabel: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    expiresAt: string | null;
  };
  primaryContact: {
    email: string;
    phone: string;
  };
  paymentDetails: {
    price: {
      baseFare: number;
      discount: number;
      tax: number;
      serviceFee: number;
      seatFee: number;
      total: number;
      currency: string;
    };
  };
  itineraries: Array<{
    flightId: number;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    departureAirportCode: string;
    departureCity: string;
    departureTerminal: string | null;
    arrivalAirportCode: string;
    arrivalCity: string;
    arrivalTerminal: string | null;
    flightStatus: string;
    fareName: string;
    cabinClass: string;
    fareBenefits: {
      fareClassCode: string;
      fareClassName: string;
      cabinClass: string;
      baggageCheckinKg: number;
      baggageHandKg: number;
      changeFee: number;
      refundFee: number;
      refundable: boolean;
      changeable: boolean;
      priorityCheckin: boolean;
      priorityBoarding: boolean;
      loungeAccess: boolean;
      seatSelection: boolean;
      seatSelectionPolicy: string;
      mileageRate: number;
      mealType: string;
      wifiIncluded: boolean;
      fastTrackSecurity: boolean;
      includedSeatCategory: {
        id: number;
        code: string;
        name: string;
      } | null;
    };
  }>;
  passengers: Array<{
    passengerId: number;
    firstName: string;
    lastName: string;
    passengerType: string;
    gender: string;
    dateOfBirth: string;
    segments?: Array<{
      flightId: number;
      eligible: boolean;
      checkInStatus: string;
      seatAssigned: boolean;
      seatNumber: string | null;
      warnings: string[];
    }>;
    selections?: {
      seats: BookingLookupSeatAssignment[];
      services: BookingLookupServiceSelection[];
    };
    // Legacy aliases kept for old UI code.
    seatAssignments?: BookingLookupSeatAssignment[];
    serviceSelections?: BookingLookupServiceSelection[];
  }>;
  actions: {
    canSelectSeat: boolean;
    canBuyAncillaries: boolean;
    // Legacy typo alias kept for old UI code.
    canBuyAancillaries?: boolean;
    canCheckIn: boolean;
    canChangeFlight: boolean;
    canCancel: boolean;
  };
}

export interface BookingManageOptionsResponse {
  bookingId: number;
  bookingStatus: string;
  currency: string;
  passengers: Array<{
    passengerId: number;
    firstName: string;
    lastName: string;
    passengerType: string;
    segments?: Array<{
      flightId: number;
      eligible: boolean;
      checkInStatus: string;
      seatAssigned: boolean;
      seatNumber: string | null;
      warnings: string[];
    }>;
  }>;
  itineraries: Array<{
    flightId: number;
    fareId: number;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    departureAirportCode: string;
    departureCity: string;
    departureTerminal: string | null;
    arrivalAirportCode: string;
    arrivalCity: string;
    arrivalTerminal: string | null;
    fareName: string | null;
    cabinClass: string | null;
    baggageHandKg: number | null;
    baggageCheckinKg: number | null;
    journeyType: string;
    checkInWindow: {
      status: 'OPEN' | 'NOT_OPEN' | 'CLOSED';
      opensAt: string;
      closesAt: string;
      message: string;
    };
    segmentStatus: 'READY' | 'SEAT_SELECTION_REQUIRED' | 'BLOCKED';
  }>;
  seatAssignments: Array<{
    passengerId: number;
    flightId: number;
    seatId: number;
    seatNumber: string;
    status: string;
    surchargeAmount: number;
    currency: string;
  }>;
  serviceSelections: Array<{
    passengerId: number;
    flightId?: number;
    serviceId: number | null;
    serviceType: string | null;
    serviceName: string | null;
    optionId: number | null;
    optionName: string | null;
    quantity: number;
    price: number;
  }>;
}

export interface CheckInContinueRequest {
  pnrCode: string;
  lastName: string;
  segments: Array<{
    flightId: number;
    passengerIds: number[];
  }>;
}

export interface CheckInContinueResponse {
  booking: {
    bookingId: number;
    pnrCode: string;
    status: string;
    contactEmail: string;
    contactPhone: string;
    passengerCount: number;
    currency: string;
    lastName: string;
  };
  segments: Array<{
    flightId: number;
    flightNumber: string;
    journeyType: string;
    status: string;
    checkInWindow: {
      status: string;
      opensAt: string;
      closesAt: string;
      message: string;
    };
    departure: {
      airportCode: string;
      airportName: string;
      city: string;
      terminal: string | null;
      gate: string | null;
      time: string;
    };
    arrival: {
      airportCode: string;
      airportName: string;
      city: string;
      terminal: string | null;
      gate: string | null;
      time: string;
    };
    fare: {
      fareClass: string;
      cabinClass: string;
    };
    passengers: Array<{
      passengerId: number;
      ticketId: number;
      ticketNumber: string;
      fullName: string;
      dateOfBirth: string;
      passengerType: string;
      eligible: boolean;
      checkInStatus: string;
      seat: {
        assigned: boolean;
        seatId: number | null;
        seatNumber: string | null;
      };
      warnings: string[];
    }>;
  }>;
  summary: {
    selectedSegments: number;
    selectedPassengers: number;
    readyPassengers: number;
    blockedPassengers: number;
    passengersWithoutSeat: number;
  };
  actions: {
    allowConfirmCheckIn: boolean;
    allowSeatSelection: boolean;
    nextStep: string;
  };
}

export interface CheckInConfirmRequest {
  pnrCode: string;
  lastName: string;
  segments: Array<{
    flightId: number;
    passengerIds: number[];
  }>;
}

export interface CheckInConfirmResponse {
  booking: {
    bookingId: number;
    pnrCode: string;
    status: string;
  };
  segments: Array<{
    flightId: number;
    flightNumber: string;
    passengers: Array<{
      passengerId: number;
      ticketId: number;
      ticketNumber: string;
      fullName: string;
      seatNumber: string | null;
      boardingPassId: number;
      checkInStatus: string;
    }>;
  }>;
  boardingPasses: Array<{
    boardingPassId: number;
    ticketId: number;
    passengerId: number;
    flightId: number;
    qrCode: string;
    gate: string | null;
    boardingTime: string | null;
    sequenceNumber: number | null;
    seatLabel: string | null;
  }>;
  summary: {
    confirmedPassengers: number;
    confirmedSegments: number;
  };
}

export interface BookingTicketResponse {
  bookingId: number;
  pnrCode: string;
  tickets: Array<{
    id: number;
    ticketNumber: string;
    status: string;
    issuedAt: string;
    passenger: {
      id: number;
      firstName: string;
      lastName: string;
      passengerType: string;
    };
    seat: {
      id: number;
      seatNumber: string;
    } | null;
  }>;
}

export interface BookingCancellationPreviewRequest {
  ticketIds: number[];
}

export interface BookingCancellationSelectionPreviewRequest {
  passengers: Array<{
    passengerId: number;
    flightIds: number[];
  }>;
}

export type BookingCancellationConfirmRequest = BookingCancellationSelectionPreviewRequest;

export interface BookingCancellationPreviewResponse {
  bookingId: number;
  bookingStatus: string;
  paymentStatus: string;
  currency: string;
  items: Array<{
    ticketId: number | null;
    passengerId: number;
    passengerType: string;
    passengerName: string;
    flightIds: number[];
    eligible: boolean;
    reason: string | null;
    fareGross: number;
    promoAllocated: number;
    fareNet: number;
    seatRefund: number;
    serviceRefund: number;
    refundFee: number;
    netRefund: number;
  }>;
  summary: {
    fareGross: number;
    promoAllocated: number;
    fareNet: number;
    seatRefund: number;
    serviceRefund: number;
    refundFee: number;
    netRefund: number;
  };
}

export interface BookingRefundMethod {
  type: string;
  label: string;
  maskedAccount?: string | null;
  estimatedDays: string;
}

export interface BookingCancellationConfirmResponse extends BookingCancellationPreviewResponse {
  cancellationStatus: string;
  cancelledAt: string;
  message: string;
  cancellationCode?: string;
  refundMethod?: BookingRefundMethod;
  refundStatus?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export type SeatChangeSettlementType = 'NONE' | 'REFUND' | 'COLLECT_PAYMENT';

export interface SeatChangePreviewRequest {
  changes: Array<{
    passengerId: number;
    flightId: number;
    fromSeatId: number | null;
    toSeatId: number | null;
  }>;
}

export interface SeatChangePreviewItem {
  passengerId: number;
  passengerName: string | null;
  flightId: number;
  flightNumber: string | null;
  departureAirportCode: string | null;
  arrivalAirportCode: string | null;
  departureTime: string | null;
  fromSeatId: number | null;
  fromSeatNumber: string | null;
  toSeatId: number | null;
  toSeatNumber: string | null;
  oldAmount: number;
  newAmount: number;
  delta: number;
  status: string;
  message: string | null;
}

export interface SeatChangePreviewResponse {
  bookingId: number;
  currency: string;
  previewToken: string;
  settlementType: SeatChangeSettlementType;
  items: SeatChangePreviewItem[];
  summary: {
    additionalAmount: number;
    refundAmount: number;
    netAmount: number;
  };
}

export interface SeatChangeConfirmRequest {
  changes: SeatChangePreviewRequest['changes'];
  previewToken?: string | null;
  idempotencyKey: string;
  expectedAdditionalAmount: number;
  expectedRefundAmount: number;
  expectedNetAmount: number;
}

export interface SeatChangeConfirmResponse {
  settlementId?: number | null;
  bookingId: number;
  currency: string;
  settlementType: SeatChangeSettlementType;
  status: 'COMPLETED' | 'REFUND_PENDING' | 'REFUND_FAILED' | 'PAYMENT_REQUIRED';
  refundStatus?: string | null;
  provider?: string | null;
  providerRefundId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  refundMethod?: BookingRefundMethod | null;
  paymentMethods?: Array<{
    code: string;
    label: string;
    provider: string;
    icon: string | null;
    supported: boolean;
  }> | null;
  summary: {
    additionalAmount: number;
    refundAmount: number;
    netAmount: number;
  };
}
