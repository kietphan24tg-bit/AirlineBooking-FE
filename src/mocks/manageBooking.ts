import type {
  BookingCancellationConfirmRequest,
  BookingCancellationConfirmResponse,
  BookingCancellationPreviewResponse,
  BookingCancellationSelectionPreviewRequest,
  BookingLookupResponse,
  BookingLookupSeatAssignment,
  BookingLookupServiceSelection,
  BookingManageOptionsResponse,
  ServiceChangeConfirmRequest,
  ServiceChangeConfirmResponse,
  ServiceChangePreviewRequest,
  ServiceChangePreviewResponse,
  SeatChangeConfirmRequest,
  SeatChangeConfirmResponse,
  SeatChangePreviewRequest,
  SeatChangePreviewResponse,
  BookingTicketResponse,
} from '../types/booking.types';
import type { SeatMapResponse, ServiceCatalogResponse } from '../types/flight.types';

/**
 * Variants we want the UI to be able to render without a working backend.
 * Names mirror the backend booking statuses (`CONFIRMED`, `PENDING_PAYMENT`,
 * `CANCELLED`) plus a frontend-only `CHECKED_IN_LOCKED` view that BE does not
 * yet expose explicitly â€” see "follow-ups" notes in the chat.
 */
export type ManageBookingMockVariant =
  | 'CONFIRMED'
  | 'CHECKIN_SINGLE'
  | 'PENDING_PAYMENT'
  | 'CHECKED_IN_LOCKED'
  | 'CANCELLED';

export const MANAGE_BOOKING_MOCK_VARIANTS: readonly ManageBookingMockVariant[] = [
  'CONFIRMED',
  'CHECKIN_SINGLE',
  'PENDING_PAYMENT',
  'CHECKED_IN_LOCKED',
  'CANCELLED',
];

export function isManageBookingMockVariant(value: unknown): value is ManageBookingMockVariant {
  return (
    typeof value === 'string' && (MANAGE_BOOKING_MOCK_VARIANTS as readonly string[]).includes(value)
  );
}

/** Canonical IDs / strings shared by both lookup and manage-options projections. */
const BOOKING_ID = 90210;
const PNR_CODE = 'ABC123';
const CURRENCY = 'VND';
const CREATED_AT = '2026-05-20T08:30:00+07:00';
const EXPIRES_AT_PENDING = '2026-05-20T09:00:00+07:00';

const PASSENGER_PRIMARY_ID = 9001;
const PASSENGER_SECONDARY_ID = 9002;
const TICKET_PRIMARY_ID = 7001;
const TICKET_SECONDARY_ID = 7002;

const FLIGHT_OUTBOUND_ID = 600;
const FLIGHT_RETURN_ID = 601;
const FARE_OUTBOUND_ID = 7001;
const FARE_RETURN_ID = 7002;

const SEAT_ROW_PRIMARY = {
  seatId: 8001,
  seatNumber: '11A',
};
const SEAT_ROW_SECONDARY = {
  seatId: 8002,
  seatNumber: '11B',
};
const SEAT_ROW_PRIMARY_RETURN = {
  seatId: 8003,
  seatNumber: '14A',
};
const SEAT_ROW_SECONDARY_RETURN = {
  seatId: 8004,
  seatNumber: '14B',
};

const SERVICE_MEAL = {
  serviceId: 5001,
  serviceType: 'MEAL',
  serviceName: 'Pre-order Meals',
  optionId: 5101,
  optionName: 'Beef Pho Meal',
  price: 90000,
};

const SERVICE_BAGGAGE = {
  serviceId: 5002,
  serviceType: 'BAGGAGE',
  serviceName: 'Baggage Add-on',
  optionId: 5201,
  optionName: 'Extra 15kg',
  price: 180000,
};

const SERVICE_MEAL_RETURN = {
  serviceId: 5001,
  serviceType: 'MEAL',
  serviceName: 'Pre-order Meals',
  optionId: 6102,
  optionName: 'Chicken Rice Meal',
  price: 95000,
};

const SERVICE_BAGGAGE_RETURN = {
  serviceId: 5002,
  serviceType: 'BAGGAGE',
  serviceName: 'Baggage Add-on',
  optionId: 6202,
  optionName: 'Extra 20kg',
  price: 250000,
};

const DEFAULT_FULL_SERVICE_FEE =
  SERVICE_MEAL.price +
  SERVICE_MEAL_RETURN.price +
  SERVICE_BAGGAGE.price +
  SERVICE_BAGGAGE_RETURN.price;

const SERVICE_INSURANCE = {
  serviceId: 5003,
  serviceType: 'INSURANCE',
  serviceName: 'Travel Insurance',
};

const SERVICE_LOUNGE = {
  serviceId: 5004,
  serviceType: 'LOUNGE',
  serviceName: 'Airport Lounge',
};

interface VariantOverrides {
  status: string;
  statusLabel: string;
  expiresAt: string | null;
  seatAssignmentStatus: string;
  /** When false, the variant should report no booked seats (e.g. fresh CONFIRMED w/o paid seats). */
  includeSeats: boolean;
  /** When false, no ancillary services should appear. */
  includeServices: boolean;
  serviceFee: number;
  seatFee: number;
  includeReturnFlight: boolean;
  includeSecondaryPassenger: boolean;
  actions: BookingLookupResponse['actions'];
}

function getVariantOverrides(variant: ManageBookingMockVariant): VariantOverrides {
  switch (variant) {
    case 'CONFIRMED':
      return {
        status: 'CONFIRMED',
        statusLabel: 'Confirmed',
        expiresAt: null,
        seatAssignmentStatus: 'BOOKED',
        includeSeats: true,
        includeServices: true,
        serviceFee: DEFAULT_FULL_SERVICE_FEE,
        seatFee: 200000,
        includeReturnFlight: true,
        includeSecondaryPassenger: true,
        actions: {
          canSelectSeat: true,
          canBuyAncillaries: true,
          canBuyAancillaries: true,
          canCheckIn: true,
          canChangeFlight: true,
          canCancel: true,
        },
      };
    case 'CHECKIN_SINGLE':
      return {
        status: 'CONFIRMED',
        statusLabel: 'Confirmed',
        expiresAt: null,
        seatAssignmentStatus: 'BOOKED',
        includeSeats: true,
        includeServices: false,
        serviceFee: 0,
        seatFee: 120000,
        includeReturnFlight: true,
        includeSecondaryPassenger: false,
        actions: {
          canSelectSeat: true,
          canBuyAncillaries: true,
          canBuyAancillaries: true,
          canCheckIn: true,
          canChangeFlight: true,
          canCancel: true,
        },
      };
    case 'PENDING_PAYMENT':
      return {
        status: 'PENDING_PAYMENT',
        statusLabel: 'Pending payment',
        expiresAt: EXPIRES_AT_PENDING,
        seatAssignmentStatus: 'HELD',
        includeSeats: false,
        includeServices: false,
        serviceFee: 0,
        seatFee: 0,
        includeReturnFlight: true,
        includeSecondaryPassenger: true,
        actions: {
          canSelectSeat: false,
          canBuyAncillaries: false,
          canBuyAancillaries: false,
          canCheckIn: false,
          canChangeFlight: false,
          canCancel: true,
        },
      };
    case 'CHECKED_IN_LOCKED':
      return {
        status: 'CHECKED_IN',
        statusLabel: 'Checked in',
        expiresAt: null,
        seatAssignmentStatus: 'CHECKED_IN',
        includeSeats: true,
        includeServices: true,
        serviceFee: DEFAULT_FULL_SERVICE_FEE,
        seatFee: 200000,
        includeReturnFlight: true,
        includeSecondaryPassenger: true,
        actions: {
          canSelectSeat: false,
          canBuyAncillaries: false,
          canBuyAancillaries: false,
          canCheckIn: false,
          canChangeFlight: false,
          canCancel: false,
        },
      };
    case 'CANCELLED':
      return {
        status: 'CANCELLED',
        statusLabel: 'Cancelled',
        expiresAt: null,
        seatAssignmentStatus: 'CANCELLED',
        includeSeats: false,
        includeServices: false,
        serviceFee: 0,
        seatFee: 0,
        includeReturnFlight: true,
        includeSecondaryPassenger: true,
        actions: {
          canSelectSeat: false,
          canBuyAncillaries: false,
          canBuyAancillaries: false,
          canCheckIn: false,
          canChangeFlight: false,
          canCancel: false,
        },
      };
  }
}

function buildLookupSeatAssignments(overrides: VariantOverrides): {
  primary: BookingLookupSeatAssignment[];
  secondary: BookingLookupSeatAssignment[];
} {
  if (!overrides.includeSeats) return { primary: [], secondary: [] };
  const baseSurcharge = overrides.seatFee / 2;
  return {
    primary: [
      {
        flightId: FLIGHT_OUTBOUND_ID,
        seatId: SEAT_ROW_PRIMARY.seatId,
        seatNumber: SEAT_ROW_PRIMARY.seatNumber,
        status: overrides.seatAssignmentStatus,
        surchargeAmount: baseSurcharge,
        currency: CURRENCY,
      },
      {
        flightId: FLIGHT_RETURN_ID,
        seatId: SEAT_ROW_PRIMARY_RETURN.seatId,
        seatNumber: SEAT_ROW_PRIMARY_RETURN.seatNumber,
        status: overrides.seatAssignmentStatus,
        surchargeAmount: baseSurcharge,
        currency: CURRENCY,
      },
    ],
    secondary: [
      {
        flightId: FLIGHT_OUTBOUND_ID,
        seatId: SEAT_ROW_SECONDARY.seatId,
        seatNumber: SEAT_ROW_SECONDARY.seatNumber,
        status: overrides.seatAssignmentStatus,
        surchargeAmount: baseSurcharge,
        currency: CURRENCY,
      },
      {
        flightId: FLIGHT_RETURN_ID,
        seatId: SEAT_ROW_SECONDARY_RETURN.seatId,
        seatNumber: SEAT_ROW_SECONDARY_RETURN.seatNumber,
        status: overrides.seatAssignmentStatus,
        surchargeAmount: baseSurcharge,
        currency: CURRENCY,
      },
    ],
  };
}

function buildLookupServices(overrides: VariantOverrides): {
  primary: BookingLookupServiceSelection[];
  secondary: BookingLookupServiceSelection[];
} {
  if (!overrides.includeServices) return { primary: [], secondary: [] };
  const primary: BookingLookupServiceSelection[] = [
    {
      flightId: FLIGHT_OUTBOUND_ID,
      serviceId: SERVICE_MEAL.serviceId,
      serviceType: SERVICE_MEAL.serviceType,
      serviceName: SERVICE_MEAL.serviceName,
      optionId: SERVICE_MEAL.optionId,
      optionName: SERVICE_MEAL.optionName,
      quantity: 1,
      price: SERVICE_MEAL.price,
    },
    {
      flightId: FLIGHT_RETURN_ID,
      serviceId: SERVICE_MEAL_RETURN.serviceId,
      serviceType: SERVICE_MEAL_RETURN.serviceType,
      serviceName: SERVICE_MEAL_RETURN.serviceName,
      optionId: SERVICE_MEAL_RETURN.optionId,
      optionName: SERVICE_MEAL_RETURN.optionName,
      quantity: 1,
      price: SERVICE_MEAL_RETURN.price,
    },
  ];
  const secondary: BookingLookupServiceSelection[] = [
    {
      flightId: FLIGHT_OUTBOUND_ID,
      serviceId: SERVICE_BAGGAGE.serviceId,
      serviceType: SERVICE_BAGGAGE.serviceType,
      serviceName: SERVICE_BAGGAGE.serviceName,
      optionId: SERVICE_BAGGAGE.optionId,
      optionName: SERVICE_BAGGAGE.optionName,
      quantity: 1,
      price: SERVICE_BAGGAGE.price,
    },
    {
      flightId: FLIGHT_RETURN_ID,
      serviceId: SERVICE_BAGGAGE_RETURN.serviceId,
      serviceType: SERVICE_BAGGAGE_RETURN.serviceType,
      serviceName: SERVICE_BAGGAGE_RETURN.serviceName,
      optionId: SERVICE_BAGGAGE_RETURN.optionId,
      optionName: SERVICE_BAGGAGE_RETURN.optionName,
      quantity: 1,
      price: SERVICE_BAGGAGE_RETURN.price,
    },
  ];
  return {
    primary: primary.filter(
      (service) => overrides.includeReturnFlight || service.flightId !== FLIGHT_RETURN_ID
    ),
    secondary: secondary.filter(
      (service) => overrides.includeReturnFlight || service.flightId !== FLIGHT_RETURN_ID
    ),
  };
}

function buildPassengerSegments(
  overrides: VariantOverrides,
  seats: ReturnType<typeof buildLookupSeatAssignments>
): {
  primary: NonNullable<BookingLookupResponse['passengers'][number]['segments']>;
  secondary: NonNullable<BookingLookupResponse['passengers'][number]['segments']>;
} {
  const outboundEligible = overrides.status !== 'CANCELLED';
  const returnEligible = overrides.status !== 'CANCELLED' && overrides.includeReturnFlight;
  const returnCheckInOpen = overrides.includeReturnFlight && overrides.status !== 'CANCELLED';

  return {
    primary: [
      {
        flightId: FLIGHT_OUTBOUND_ID,
        eligible: outboundEligible,
        checkInStatus: outboundEligible ? 'READY' : 'BOOKING_NOT_CONFIRMED',
        seatAssigned: seats.primary.some((seat) => seat.flightId === FLIGHT_OUTBOUND_ID),
        seatNumber:
          seats.primary.find((seat) => seat.flightId === FLIGHT_OUTBOUND_ID)?.seatNumber ?? null,
        warnings: [],
      },
      {
        flightId: FLIGHT_RETURN_ID,
        eligible: returnEligible,
        checkInStatus: returnCheckInOpen ? 'READY' : 'CHECKIN_NOT_OPEN',
        seatAssigned: seats.primary.some((seat) => seat.flightId === FLIGHT_RETURN_ID),
        seatNumber:
          seats.primary.find((seat) => seat.flightId === FLIGHT_RETURN_ID)?.seatNumber ?? null,
        warnings: returnCheckInOpen ? [] : ['CHECKIN_NOT_OPEN'],
      },
    ].filter((segment) => overrides.includeReturnFlight || segment.flightId !== FLIGHT_RETURN_ID),
    secondary: [
      {
        flightId: FLIGHT_OUTBOUND_ID,
        eligible: outboundEligible,
        checkInStatus: outboundEligible ? 'READY' : 'BOOKING_NOT_CONFIRMED',
        seatAssigned: seats.secondary.some((seat) => seat.flightId === FLIGHT_OUTBOUND_ID),
        seatNumber:
          seats.secondary.find((seat) => seat.flightId === FLIGHT_OUTBOUND_ID)?.seatNumber ?? null,
        warnings: [],
      },
      {
        flightId: FLIGHT_RETURN_ID,
        eligible: returnEligible,
        checkInStatus: returnCheckInOpen ? 'READY' : 'CHECKIN_NOT_OPEN',
        seatAssigned: seats.secondary.some((seat) => seat.flightId === FLIGHT_RETURN_ID),
        seatNumber:
          seats.secondary.find((seat) => seat.flightId === FLIGHT_RETURN_ID)?.seatNumber ?? null,
        warnings: returnCheckInOpen ? [] : ['CHECKIN_NOT_OPEN'],
      },
    ].filter((segment) => overrides.includeReturnFlight || segment.flightId !== FLIGHT_RETURN_ID),
  };
}

const BASE_FARE = 4000000;
const TAX = 400000;
const DISCOUNT = 0;
const SEAT_MAP_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEAT_MAP_ROWS = [10, 11, 12, 13, 14, 15];
const MOCK_FAILED_CANCELLATION_ROUTE = {
  from: 'HAN',
  to: 'SGN',
};

export function getMockBookingLookupResponse(
  variant: ManageBookingMockVariant
): BookingLookupResponse {
  const overrides = getVariantOverrides(variant);
  const seats = buildLookupSeatAssignments(overrides);
  const services = buildLookupServices(overrides);
  const passengerSegments = buildPassengerSegments(overrides, seats);
  const total = BASE_FARE + TAX + overrides.serviceFee + overrides.seatFee - DISCOUNT;

  return {
    booking: {
      bookingId: BOOKING_ID,
      pnrCode: PNR_CODE,
      status: overrides.status,
      statusLabel: overrides.statusLabel,
      totalAmount: total,
      currency: CURRENCY,
      createdAt: CREATED_AT,
      expiresAt: overrides.expiresAt,
    },
    primaryContact: {
      email: 'guest@example.com',
      phone: '0901111222',
    },
    paymentDetails: {
      price: {
        baseFare: BASE_FARE,
        discount: DISCOUNT,
        tax: TAX,
        serviceFee: overrides.serviceFee,
        seatFee: overrides.seatFee,
        total,
        currency: CURRENCY,
      },
    },
    itineraries: [
      {
        flightId: FLIGHT_OUTBOUND_ID,
        flightNumber: 'VN123',
        departureTime: '2026-06-01T08:30:00+07:00',
        arrivalTime: '2026-06-01T10:35:00+07:00',
        departureAirportCode: 'SGN',
        departureCity: 'Ho Chi Minh City',
        departureTerminal: 'T1',
        arrivalAirportCode: 'HAN',
        arrivalCity: 'Hanoi',
        arrivalTerminal: 'T1',
        flightStatus: 'SCHEDULED',
        fareName: 'Eco',
        cabinClass: 'ECONOMY',
        fareBenefits: {
          fareClassCode: 'ECO',
          fareClassName: 'Eco',
          cabinClass: 'ECONOMY',
          baggageCheckinKg: 23,
          baggageHandKg: 7,
          changeFee: 500000,
          refundFee: 300000,
          refundable: true,
          changeable: true,
          priorityCheckin: false,
          priorityBoarding: false,
          loungeAccess: false,
          seatSelection: true,
          seatSelectionPolicy: 'STANDARD',
          mileageRate: 1,
          mealType: 'STANDARD',
          wifiIncluded: false,
          fastTrackSecurity: false,
          includedSeatCategory: null,
        },
      },
      {
        flightId: FLIGHT_RETURN_ID,
        flightNumber: 'VN456',
        departureTime: '2026-06-05T18:10:00+07:00',
        arrivalTime: '2026-06-05T20:20:00+07:00',
        departureAirportCode: 'HAN',
        departureCity: 'Hanoi',
        departureTerminal: 'T1',
        arrivalAirportCode: 'SGN',
        arrivalCity: 'Ho Chi Minh City',
        arrivalTerminal: 'T1',
        flightStatus: 'SCHEDULED',
        fareName: 'Eco',
        cabinClass: 'ECONOMY',
        fareBenefits: {
          fareClassCode: 'ECO',
          fareClassName: 'Eco',
          cabinClass: 'ECONOMY',
          baggageCheckinKg: 23,
          baggageHandKg: 7,
          changeFee: 500000,
          refundFee: 300000,
          refundable: true,
          changeable: true,
          priorityCheckin: false,
          priorityBoarding: false,
          loungeAccess: false,
          seatSelection: true,
          seatSelectionPolicy: 'STANDARD',
          mileageRate: 1,
          mealType: 'STANDARD',
          wifiIncluded: false,
          fastTrackSecurity: false,
          includedSeatCategory: null,
        },
      },
    ].filter(
      (itinerary) => overrides.includeReturnFlight || itinerary.flightId !== FLIGHT_RETURN_ID
    ),
    passengers: [
      {
        passengerId: PASSENGER_PRIMARY_ID,
        firstName: 'Văn A',
        lastName: 'Nguyễn',
        passengerType: 'ADULT',
        gender: 'MALE',
        dateOfBirth: '1990-01-01',
        segments: passengerSegments.primary,
        selections: {
          seats: seats.primary,
          services: services.primary,
        },
        seatAssignments: seats.primary,
        serviceSelections: services.primary,
      },
      {
        passengerId: PASSENGER_SECONDARY_ID,
        firstName: 'Thị B',
        lastName: 'Nguyễn',
        passengerType: 'ADULT',
        gender: 'FEMALE',
        dateOfBirth: '1992-05-15',
        segments: passengerSegments.secondary,
        selections: {
          seats: seats.secondary,
          services: services.secondary,
        },
        seatAssignments: seats.secondary,
        serviceSelections: services.secondary,
      },
    ].filter(
      (passenger) =>
        overrides.includeSecondaryPassenger || passenger.passengerId !== PASSENGER_SECONDARY_ID
    ),
    actions: overrides.actions,
  };
}

export function getMockManageOptionsResponse(
  variant: ManageBookingMockVariant
): BookingManageOptionsResponse {
  const overrides = getVariantOverrides(variant);
  const lookupSeats = buildLookupSeatAssignments(overrides);
  const lookupServices = buildLookupServices(overrides);
  const passengerSegments = buildPassengerSegments(overrides, lookupSeats);

  const seatAssignments: BookingManageOptionsResponse['seatAssignments'] = [
    ...lookupSeats.primary.map((seat) => ({
      passengerId: PASSENGER_PRIMARY_ID,
      flightId: seat.flightId,
      seatId: seat.seatId,
      seatNumber: seat.seatNumber,
      status: seat.status,
      surchargeAmount: seat.surchargeAmount,
      currency: seat.currency,
    })),
    ...lookupSeats.secondary.map((seat) => ({
      passengerId: PASSENGER_SECONDARY_ID,
      flightId: seat.flightId,
      seatId: seat.seatId,
      seatNumber: seat.seatNumber,
      status: seat.status,
      surchargeAmount: seat.surchargeAmount,
      currency: seat.currency,
    })),
  ].filter(
    (seat) =>
      (overrides.includeSecondaryPassenger || seat.passengerId !== PASSENGER_SECONDARY_ID) &&
      (overrides.includeReturnFlight || seat.flightId !== FLIGHT_RETURN_ID)
  );

  const serviceSelections: BookingManageOptionsResponse['serviceSelections'] = [
    ...lookupServices.primary.map((service) => ({
      passengerId: PASSENGER_PRIMARY_ID,
      flightId: service.flightId,
      serviceId: service.serviceId,
      serviceType: service.serviceType,
      serviceName: service.serviceName,
      optionId: service.optionId,
      optionName: service.optionName,
      quantity: service.quantity,
      price: service.price,
    })),
    ...lookupServices.secondary.map((service) => ({
      passengerId: PASSENGER_SECONDARY_ID,
      flightId: service.flightId,
      serviceId: service.serviceId,
      serviceType: service.serviceType,
      serviceName: service.serviceName,
      optionId: service.optionId,
      optionName: service.optionName,
      quantity: service.quantity,
      price: service.price,
    })),
  ].filter(
    (service) =>
      overrides.includeSecondaryPassenger || service.passengerId !== PASSENGER_SECONDARY_ID
  );

  const itinerariesBase = [
    {
      flightId: FLIGHT_OUTBOUND_ID,
      fareId: FARE_OUTBOUND_ID,
      flightNumber: 'VN123',
      departureTime: '2026-06-01T08:30:00+07:00',
      arrivalTime: '2026-06-01T10:35:00+07:00',
      departureAirportCode: 'SGN',
      departureCity: 'Ho Chi Minh City',
      departureTerminal: 'T1',
      arrivalAirportCode: 'HAN',
      arrivalCity: 'Hanoi',
      arrivalTerminal: 'T1',
      fareName: 'Economy Flex',
      cabinClass: 'Economy',
      baggageHandKg: 7,
      baggageCheckinKg: 20,
      journeyType: 'DOMESTIC',
      checkInWindow: {
        status: 'OPEN',
        opensAt: '2026-05-31T08:30:00+07:00',
        closesAt: '2026-06-01T07:50:00+07:00',
        message: 'Online check-in is available',
      },
      segmentStatus: 'READY',
    },
    {
      flightId: FLIGHT_RETURN_ID,
      fareId: FARE_RETURN_ID,
      flightNumber: 'VN456',
      departureTime: '2026-06-05T18:10:00+07:00',
      arrivalTime: '2026-06-05T20:20:00+07:00',
      departureAirportCode: 'HAN',
      departureCity: 'Hanoi',
      departureTerminal: 'T1',
      arrivalAirportCode: 'SGN',
      arrivalCity: 'Ho Chi Minh City',
      arrivalTerminal: 'T1',
      fareName: 'Economy Flex',
      cabinClass: 'Economy',
      baggageHandKg: 7,
      baggageCheckinKg: 20,
      journeyType: 'DOMESTIC',
      checkInWindow: {
        status: overrides.includeReturnFlight ? 'OPEN' : 'NOT_OPEN',
        opensAt: '2026-06-03T18:10:00+07:00',
        closesAt: '2026-06-05T17:30:00+07:00',
        message: overrides.includeReturnFlight
          ? 'Online check-in is available'
          : 'Online check-in is not open yet',
      },
      segmentStatus: overrides.includeReturnFlight ? 'READY' : 'BLOCKED',
    },
  ] satisfies BookingManageOptionsResponse['itineraries'];
  const itineraries: BookingManageOptionsResponse['itineraries'] = itinerariesBase.filter(
    (itinerary) => overrides.includeReturnFlight || itinerary.flightId !== FLIGHT_RETURN_ID
  );

  return {
    bookingId: BOOKING_ID,
    bookingStatus: overrides.status,
    currency: CURRENCY,
    passengers: [
      {
        passengerId: PASSENGER_PRIMARY_ID,
        firstName: 'Văn A',
        lastName: 'Nguyễn',
        passengerType: 'ADULT',
        segments: passengerSegments.primary,
      },
      {
        passengerId: PASSENGER_SECONDARY_ID,
        firstName: 'Thị B',
        lastName: 'Nguyễn',
        passengerType: 'ADULT',
        segments: passengerSegments.secondary,
      },
    ].filter(
      (passenger) =>
        overrides.includeSecondaryPassenger || passenger.passengerId !== PASSENGER_SECONDARY_ID
    ),
    itineraries,
    seatAssignments,
    serviceSelections,
  };
}

export type MockReservedSeatInfo = { surchargeAmount: number | null };

export function getMockSeatMapResponse(
  variant: ManageBookingMockVariant,
  flightId: number,
  fareId: number,
  reservedSeatOverrides?: ReadonlyMap<number, MockReservedSeatInfo> | null
): SeatMapResponse | null {
  const overrides = getVariantOverrides(variant);
  const validFlightIds = overrides.includeReturnFlight
    ? [FLIGHT_OUTBOUND_ID, FLIGHT_RETURN_ID]
    : [FLIGHT_OUTBOUND_ID];
  if (!validFlightIds.includes(flightId)) return null;
  if (flightId === FLIGHT_OUTBOUND_ID && fareId !== FARE_OUTBOUND_ID) return null;
  if (flightId === FLIGHT_RETURN_ID && fareId !== FARE_RETURN_ID) return null;

  const reservedSeats = new Map<
    number,
    { status: 'BOOKED' | 'UNAVAILABLE'; price: number | null }
  >();
  if (reservedSeatOverrides && reservedSeatOverrides.size > 0) {
    for (const [seatId, info] of reservedSeatOverrides) {
      reservedSeats.set(seatId, { status: 'BOOKED', price: info.surchargeAmount });
    }
  } else {
    if (flightId === FLIGHT_OUTBOUND_ID) {
      reservedSeats.set(SEAT_ROW_PRIMARY.seatId, { status: 'BOOKED', price: 100000 });
      reservedSeats.set(SEAT_ROW_SECONDARY.seatId, { status: 'BOOKED', price: 100000 });
    }
    if (flightId === FLIGHT_RETURN_ID) {
      reservedSeats.set(SEAT_ROW_PRIMARY_RETURN.seatId, { status: 'BOOKED', price: 100000 });
      reservedSeats.set(SEAT_ROW_SECONDARY_RETURN.seatId, { status: 'BOOKED', price: 100000 });
    }
  }

  let seatIdCounter = flightId * 1000;
  const rows = SEAT_MAP_ROWS.map((rowNumber) => ({
    rowNumber,
    seatClass: 'ECONOMY',
    cells: SEAT_MAP_COLUMNS.map((columnLetter, columnIndex) => {
      const seatNumber = `${rowNumber}${columnLetter}`;
      const specialSeatId =
        flightId === FLIGHT_OUTBOUND_ID
          ? seatNumber === SEAT_ROW_PRIMARY.seatNumber
            ? SEAT_ROW_PRIMARY.seatId
            : seatNumber === SEAT_ROW_SECONDARY.seatNumber
              ? SEAT_ROW_SECONDARY.seatId
              : null
          : seatNumber === SEAT_ROW_PRIMARY_RETURN.seatNumber
            ? SEAT_ROW_PRIMARY_RETURN.seatId
            : seatNumber === SEAT_ROW_SECONDARY_RETURN.seatNumber
              ? SEAT_ROW_SECONDARY_RETURN.seatId
              : null;
      const seatId = specialSeatId ?? ++seatIdCounter;
      const reserved = reservedSeats.get(seatId);
      const isPreferred = rowNumber <= 11;
      const isUnavailable = rowNumber === 13 && (columnLetter === 'C' || columnLetter === 'D');
      const extraPrice = reserved?.price ?? (isPreferred ? 120000 : 40000);
      const selectable = !reserved && !isUnavailable;

      return {
        columnLetter,
        seatId,
        seatNumber,
        seatClass: 'ECONOMY',
        seatType:
          columnIndex === 0 || columnIndex === SEAT_MAP_COLUMNS.length - 1
            ? 'WINDOW'
            : columnIndex === 2 || columnIndex === 3
              ? 'AISLE'
              : 'MIDDLE',
        seatTypeDisplay: {
          code: 'STANDARD',
          label:
            columnIndex === 0 || columnIndex === SEAT_MAP_COLUMNS.length - 1
              ? 'Window'
              : columnIndex === 2 || columnIndex === 3
                ? 'Aisle'
                : 'Middle',
          description: '',
        },
        seatCategory: isPreferred ? 'PREFERRED' : 'STANDARD',
        seatCategoryDisplay: {
          code: isPreferred ? 'PREFERRED' : 'STANDARD',
          label: isPreferred ? 'Preferred seat' : 'Standard seat',
          description: '',
        },
        status: reserved ? reserved.status : isUnavailable ? 'UNAVAILABLE' : 'AVAILABLE',
        statusDisplay: {
          code: reserved ? reserved.status : isUnavailable ? 'UNAVAILABLE' : 'AVAILABLE',
          label: reserved ? 'Booked' : isUnavailable ? 'Unavailable' : 'Available',
          description: '',
        },
        selectable,
        included: false,
        extraPrice: selectable ? extraPrice : null,
        currency: CURRENCY,
        reason: reserved ? 'SEAT_UNAVAILABLE' : isUnavailable ? 'SEAT_UNAVAILABLE' : null,
        displayPrice: {
          type: reserved
            ? 'UNAVAILABLE'
            : isUnavailable
              ? 'UNAVAILABLE'
              : extraPrice > 0
                ? 'PAID'
                : 'FREE',
          text: reserved ? 'Unavailable' : `+${extraPrice.toLocaleString('vi-VN')} ${CURRENCY}`,
          amount: selectable ? extraPrice : null,
          currency: CURRENCY,
          description: '',
        },
        pricingBadge: {
          code: reserved
            ? 'UNAVAILABLE'
            : isUnavailable
              ? 'UNAVAILABLE'
              : extraPrice > 0
                ? 'PAID'
                : 'FREE',
          label: reserved ? 'Unavailable' : extraPrice > 0 ? 'Paid' : 'Free',
          description: '',
        },
      } satisfies SeatMapResponse['rows'][number]['cells'][number];
    }),
  }));

  return {
    flightId,
    fareId,
    fareClassId: fareId,
    fareCode: 'ECONOMY',
    seatSelectionPolicy: 'STANDARD',
    policyDisplay: {
      code: 'STANDARD',
      label: 'Standard seat selection',
      description:
        'Choose an available seat for the selected passenger before continuing check-in.',
    },
    includedSeatCategoryCode: null,
    currency: CURRENCY,
    layout: {
      columns: SEAT_MAP_COLUMNS,
      aisleAfterColumns: ['C'],
      seatClassZones: [{ seatClass: 'ECONOMY', rowStart: 10, rowEnd: 15 }],
    },
    legend: {
      statuses: ['AVAILABLE', 'BOOKED', 'UNAVAILABLE'],
      seatTypes: ['WINDOW', 'MIDDLE', 'AISLE'],
      seatCategories: ['STANDARD', 'PREFERRED'],
    },
    rows,
  };
}

function findMockSeatDetails(
  variant: ManageBookingMockVariant,
  flightId: number,
  seatId: number | null
): { seatNumber: string | null; amount: number } {
  if (seatId == null) return { seatNumber: null, amount: 0 };
  const itinerary = getMockManageOptionsResponse(variant).itineraries.find(
    (item) => item.flightId === flightId
  );
  if (!itinerary) return { seatNumber: null, amount: 0 };
  const seatMap = getMockSeatMapResponse(variant, flightId, itinerary.fareId);
  const seat =
    seatMap?.rows.flatMap((row) => row.cells).find((cell) => cell.seatId === seatId) ?? null;
  if (!seat) return { seatNumber: null, amount: 0 };
  return { seatNumber: seat.seatNumber, amount: seat.extraPrice ?? 0 };
}

export function getMockServiceCatalogResponse(
  variant: ManageBookingMockVariant,
  flightId: number,
  fareId: number
): ServiceCatalogResponse | null {
  const overrides = getVariantOverrides(variant);
  const validFlightIds = overrides.includeReturnFlight
    ? [FLIGHT_OUTBOUND_ID, FLIGHT_RETURN_ID]
    : [FLIGHT_OUTBOUND_ID];
  if (!validFlightIds.includes(flightId)) return null;
  if (flightId === FLIGHT_OUTBOUND_ID && fareId !== FARE_OUTBOUND_ID) return null;
  if (flightId === FLIGHT_RETURN_ID && fareId !== FARE_RETURN_ID) return null;

  const formatMoney = (amount: number) => `${amount.toLocaleString('vi-VN')} ${CURRENCY}`;
  const isReturnFlight = flightId === FLIGHT_RETURN_ID;
  const baggageOptionBase = isReturnFlight ? 6200 : 5200;
  const mealOptionBase = isReturnFlight ? 6100 : 5100;

  return {
    currency: CURRENCY,
    services: [
      {
        serviceId: SERVICE_BAGGAGE.serviceId,
        serviceType: SERVICE_BAGGAGE.serviceType,
        serviceName: SERVICE_BAGGAGE.serviceName,
        iconUrl: 'https://img.icons8.com/fluency/96/suitcase.png',
        selectionMode: 'SINGLE',
        options: [
          {
            optionId: baggageOptionBase + 1,
            serviceId: SERVICE_BAGGAGE.serviceId,
            serviceType: SERVICE_BAGGAGE.serviceType,
            serviceName: SERVICE_BAGGAGE.serviceName,
            name: 'Extra 15kg',
            description: 'Add one checked baggage allowance up to 15kg.',
            price: 180000,
            currency: CURRENCY,
            priceLabel: formatMoney(180000),
            imageUrl:
              'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: baggageOptionBase + 2,
            serviceId: SERVICE_BAGGAGE.serviceId,
            serviceType: SERVICE_BAGGAGE.serviceType,
            serviceName: SERVICE_BAGGAGE.serviceName,
            name: 'Extra 20kg',
            description: 'Add one checked baggage allowance up to 20kg.',
            price: 250000,
            currency: CURRENCY,
            priceLabel: formatMoney(250000),
            imageUrl:
              'https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: baggageOptionBase + 3,
            serviceId: SERVICE_BAGGAGE.serviceId,
            serviceType: SERVICE_BAGGAGE.serviceType,
            serviceName: SERVICE_BAGGAGE.serviceName,
            name: 'Extra 25kg',
            description: 'Add one checked baggage allowance up to 25kg.',
            price: 320000,
            currency: CURRENCY,
            priceLabel: formatMoney(320000),
            imageUrl:
              'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: baggageOptionBase + 4,
            serviceId: SERVICE_BAGGAGE.serviceId,
            serviceType: SERVICE_BAGGAGE.serviceType,
            serviceName: SERVICE_BAGGAGE.serviceName,
            name: 'Extra 30kg',
            description: 'Add one checked baggage allowance up to 30kg.',
            price: 390000,
            currency: CURRENCY,
            priceLabel: formatMoney(390000),
            imageUrl:
              'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: baggageOptionBase + 5,
            serviceId: SERVICE_BAGGAGE.serviceId,
            serviceType: SERVICE_BAGGAGE.serviceType,
            serviceName: SERVICE_BAGGAGE.serviceName,
            name: 'Extra 40kg',
            description: 'Add one checked baggage allowance up to 40kg.',
            price: 520000,
            currency: CURRENCY,
            priceLabel: formatMoney(520000),
            imageUrl:
              'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
        ],
      },
      {
        serviceId: SERVICE_MEAL.serviceId,
        serviceType: SERVICE_MEAL.serviceType,
        serviceName: SERVICE_MEAL.serviceName,
        iconUrl: 'https://img.icons8.com/fluency/96/meal.png',
        selectionMode: 'SINGLE',
        options: [
          {
            optionId: mealOptionBase + 1,
            serviceId: SERVICE_MEAL.serviceId,
            serviceType: SERVICE_MEAL.serviceType,
            serviceName: SERVICE_MEAL.serviceName,
            name: 'Beef Pho Meal',
            description: 'Hot Vietnamese beef pho served with beverage.',
            price: 90000,
            currency: CURRENCY,
            priceLabel: formatMoney(90000),
            imageUrl:
              'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: mealOptionBase + 2,
            serviceId: SERVICE_MEAL.serviceId,
            serviceType: SERVICE_MEAL.serviceType,
            serviceName: SERVICE_MEAL.serviceName,
            name: 'Chicken Rice Meal',
            description: 'Hot chicken rice meal with seasonal side dish.',
            price: 95000,
            currency: CURRENCY,
            priceLabel: formatMoney(95000),
            imageUrl:
              'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: mealOptionBase + 3,
            serviceId: SERVICE_MEAL.serviceId,
            serviceType: SERVICE_MEAL.serviceType,
            serviceName: SERVICE_MEAL.serviceName,
            name: 'Vegetarian Delight',
            description: 'Vegetarian meal with fresh vegetables and rice.',
            price: 95000,
            currency: CURRENCY,
            priceLabel: formatMoney(95000),
            imageUrl:
              'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: mealOptionBase + 4,
            serviceId: SERVICE_MEAL.serviceId,
            serviceType: SERVICE_MEAL.serviceType,
            serviceName: SERVICE_MEAL.serviceName,
            name: 'Halal Chicken Meal',
            description: 'Halal-certified chicken meal with side vegetables.',
            price: 110000,
            currency: CURRENCY,
            priceLabel: formatMoney(110000),
            imageUrl:
              'https://images.unsplash.com/photo-1604908554027-97a5bbdf3f1c?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: mealOptionBase + 5,
            serviceId: SERVICE_MEAL.serviceId,
            serviceType: SERVICE_MEAL.serviceType,
            serviceName: SERVICE_MEAL.serviceName,
            name: 'Kids Pasta Set',
            description: 'Child-friendly pasta set with juice and dessert.',
            price: 85000,
            currency: CURRENCY,
            priceLabel: formatMoney(85000),
            imageUrl:
              'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: 5106,
            serviceId: SERVICE_MEAL.serviceId,
            serviceType: SERVICE_MEAL.serviceType,
            serviceName: SERVICE_MEAL.serviceName,
            name: 'Premium Combo Meal',
            description: 'Upgraded meal with main course, dessert, and beverage.',
            price: 150000,
            currency: CURRENCY,
            priceLabel: formatMoney(150000),
            imageUrl:
              'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
        ],
      },
      {
        serviceId: SERVICE_INSURANCE.serviceId,
        serviceType: SERVICE_INSURANCE.serviceType,
        serviceName: SERVICE_INSURANCE.serviceName,
        iconUrl: 'https://img.icons8.com/fluency/96/health-book.png',
        selectionMode: 'SINGLE',
        options: [
          {
            optionId: 5311,
            serviceId: SERVICE_INSURANCE.serviceId,
            serviceType: SERVICE_INSURANCE.serviceType,
            serviceName: SERVICE_INSURANCE.serviceName,
            name: 'Domestic Basic Cover',
            description: 'Medical and trip protection for domestic itineraries.',
            price: 65000,
            currency: CURRENCY,
            priceLabel: formatMoney(65000),
            imageUrl:
              'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: 5312,
            serviceId: SERVICE_INSURANCE.serviceId,
            serviceType: SERVICE_INSURANCE.serviceType,
            serviceName: SERVICE_INSURANCE.serviceName,
            name: 'Domestic Premium Cover',
            description: 'Expanded medical, baggage, and delay protection for domestic trips.',
            price: 99000,
            currency: CURRENCY,
            priceLabel: formatMoney(99000),
            imageUrl:
              'https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: 5313,
            serviceId: SERVICE_INSURANCE.serviceId,
            serviceType: SERVICE_INSURANCE.serviceType,
            serviceName: SERVICE_INSURANCE.serviceName,
            name: 'International Basic Cover',
            description: 'Essential overseas medical and baggage protection.',
            price: 160000,
            currency: CURRENCY,
            priceLabel: formatMoney(160000),
            imageUrl:
              'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: 5314,
            serviceId: SERVICE_INSURANCE.serviceId,
            serviceType: SERVICE_INSURANCE.serviceType,
            serviceName: SERVICE_INSURANCE.serviceName,
            name: 'International Premium Cover',
            description:
              'Comprehensive international protection including delays and missed connections.',
            price: 245000,
            currency: CURRENCY,
            priceLabel: formatMoney(245000),
            imageUrl:
              'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
        ],
      },
      {
        serviceId: SERVICE_LOUNGE.serviceId,
        serviceType: SERVICE_LOUNGE.serviceType,
        serviceName: SERVICE_LOUNGE.serviceName,
        iconUrl: 'https://img.icons8.com/fluency/96/lounge-chair.png',
        selectionMode: 'SINGLE',
        options: [
          {
            optionId: 5411,
            serviceId: SERVICE_LOUNGE.serviceId,
            serviceType: SERVICE_LOUNGE.serviceType,
            serviceName: SERVICE_LOUNGE.serviceName,
            name: 'Domestic Lounge Pass',
            description: 'Single-use domestic lounge access with snacks and Wi-Fi.',
            price: 350000,
            currency: CURRENCY,
            priceLabel: formatMoney(350000),
            imageUrl:
              'https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
          {
            optionId: 5412,
            serviceId: SERVICE_LOUNGE.serviceId,
            serviceType: SERVICE_LOUNGE.serviceType,
            serviceName: SERVICE_LOUNGE.serviceName,
            name: 'International Lounge Pass',
            description:
              'Single-use international lounge access with refreshments and shower facilities.',
            price: 550000,
            currency: CURRENCY,
            priceLabel: formatMoney(550000),
            imageUrl:
              'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=800&q=80',
            isActive: true,
          },
        ],
      },
    ],
  };
}

export function getMockSeatChangePreviewResponse(
  variant: ManageBookingMockVariant,
  body: SeatChangePreviewRequest
): SeatChangePreviewResponse {
  const lookup = getMockBookingLookupResponse(variant);
  const items = body.changes.map((change) => {
    const from = findMockSeatDetails(variant, change.flightId, change.fromSeatId);
    const to = findMockSeatDetails(variant, change.flightId, change.toSeatId);
    const passenger = lookup.passengers.find((item) => item.passengerId === change.passengerId);
    const itinerary = lookup.itineraries.find((item) => item.flightId === change.flightId);
    const delta = to.amount - from.amount;
    return {
      passengerId: change.passengerId,
      passengerName: passenger ? `${passenger.lastName} ${passenger.firstName}`.trim() : null,
      flightId: change.flightId,
      flightNumber: itinerary?.flightNumber ?? null,
      departureAirportCode: itinerary?.departureAirportCode ?? null,
      arrivalAirportCode: itinerary?.arrivalAirportCode ?? null,
      departureTime: itinerary?.departureTime ?? null,
      fromSeatId: change.fromSeatId,
      fromSeatNumber: from.seatNumber,
      toSeatId: change.toSeatId,
      toSeatNumber: to.seatNumber,
      oldAmount: from.amount,
      newAmount: to.amount,
      delta,
      status: 'VALID',
      message: null,
    };
  });

  const additionalAmount = items.reduce((sum, item) => sum + Math.max(0, item.delta), 0);
  const refundAmount = items.reduce((sum, item) => sum + Math.max(0, -item.delta), 0);
  const netAmount = additionalAmount - refundAmount;
  const settlementType: SeatChangePreviewResponse['settlementType'] =
    netAmount > 0 ? 'COLLECT_PAYMENT' : netAmount < 0 ? 'REFUND' : 'NONE';

  return {
    bookingId: lookup.booking.bookingId,
    currency: lookup.booking.currency,
    previewToken: `seatchg_prev_${Date.now()}`,
    settlementType,
    items,
    summary: {
      additionalAmount,
      refundAmount,
      netAmount,
    },
  };
}

export function getMockSeatChangeConfirmResponse(
  variant: ManageBookingMockVariant,
  body: SeatChangeConfirmRequest
): SeatChangeConfirmResponse {
  const preview = getMockSeatChangePreviewResponse(variant, { changes: body.changes });
  return {
    bookingId: preview.bookingId,
    currency: preview.currency,
    settlementType: preview.settlementType,
    status:
      preview.settlementType === 'COLLECT_PAYMENT'
        ? 'PAYMENT_REQUIRED'
        : preview.settlementType === 'REFUND'
          ? 'REFUND_PENDING'
          : 'COMPLETED',
    refundStatus: preview.settlementType === 'REFUND' ? 'SUCCEEDED' : null,
    provider: preview.settlementType === 'REFUND' ? 'STRIPE' : null,
    providerRefundId: preview.settlementType === 'REFUND' ? `mock_refund_${Date.now()}` : null,
    errorCode: null,
    errorMessage: null,
    refundMethod:
      preview.settlementType === 'REFUND'
        ? {
            type: 'CARD',
            label: 'Visa',
            maskedAccount: '**** 4242',
            estimatedDays: '3-7 business days',
          }
        : null,
    summary: preview.summary,
  };
}

export function getMockServiceChangePreviewResponse(
  variant: ManageBookingMockVariant,
  body: ServiceChangePreviewRequest
): ServiceChangePreviewResponse {
  const lookup = getMockBookingLookupResponse(variant);
  const manageOptions = getMockManageOptionsResponse(variant);
  const currentByPassenger = new Map<number, BookingLookupServiceSelection[]>();
  for (const passenger of lookup.passengers) {
    currentByPassenger.set(passenger.passengerId, [
      ...(passenger.selections?.services ?? passenger.serviceSelections ?? []),
    ]);
  }

  const itineraryByFlightId = new Map(
    lookup.itineraries.map((itinerary) => [itinerary.flightId, itinerary])
  );
  const optionCatalogByFlightId = new Map<
    number,
    Map<
      number,
      {
        serviceId: number;
        serviceType: string;
        serviceName: string;
        name: string;
        price: number;
      }
    >
  >();
  for (const itinerary of manageOptions.itineraries) {
    const catalog = getMockServiceCatalogResponse(variant, itinerary.flightId, itinerary.fareId);
    optionCatalogByFlightId.set(
      itinerary.flightId,
      new Map(
        (catalog?.services ?? []).flatMap((service) =>
          service.options.map((option) => [
            option.optionId,
            {
              serviceId: option.serviceId,
              serviceType: option.serviceType,
              serviceName: option.serviceName,
              name: option.name,
              price: option.price,
            },
          ])
        )
      )
    );
  }

  const selectionKey = (flightId: number | null, serviceId: number | null) =>
    `${flightId ?? 'booking'}:${serviceId ?? 'unknown'}`;

  const items = body.passengers.flatMap((passenger) => {
    const currentSelections = currentByPassenger.get(passenger.passengerId) ?? [];
    const passengerView = lookup.passengers.find(
      (entry) => entry.passengerId === passenger.passengerId
    );
    const passengerName = passengerView
      ? [passengerView.lastName, passengerView.firstName].filter(Boolean).join(' ')
      : `Passenger ${passenger.passengerId}`;

    const currentByGroup = new Map(
      currentSelections.map((selection) => [
        selectionKey(selection.flightId ?? null, selection.serviceId ?? null),
        selection,
      ])
    );
    const requestedByGroup = new Map<
      string,
      {
        flightId: number | null;
        optionId: number;
        quantity: number;
        serviceId: number | null;
        serviceType: string | null;
        serviceName: string | null;
        optionName: string | null;
        unitPrice: number;
      }
    >();

    for (const selection of passenger.selections) {
      const flightId = selection.flightId ?? null;
      const optionDetails =
        flightId != null ? optionCatalogByFlightId.get(flightId)?.get(selection.optionId) : null;
      const fallbackCurrent =
        flightId != null
          ? (currentSelections.find(
              (entry) => entry.flightId === flightId && entry.optionId === selection.optionId
            ) ?? null)
          : (currentSelections.find((entry) => entry.optionId === selection.optionId) ?? null);
      const serviceId = optionDetails?.serviceId ?? fallbackCurrent?.serviceId ?? null;
      const groupKey = selectionKey(flightId, serviceId);

      requestedByGroup.set(groupKey, {
        flightId,
        optionId: selection.optionId,
        quantity: selection.quantity,
        serviceId,
        serviceType: optionDetails?.serviceType ?? fallbackCurrent?.serviceType ?? null,
        serviceName: optionDetails?.serviceName ?? fallbackCurrent?.serviceName ?? null,
        optionName: optionDetails?.name ?? fallbackCurrent?.optionName ?? null,
        unitPrice:
          optionDetails?.price ??
          (fallbackCurrent
            ? fallbackCurrent.price / Math.max(1, fallbackCurrent.quantity)
            : 250000),
      });
    }

    const groupKeys = new Set([...currentByGroup.keys(), ...requestedByGroup.keys()]);
    return [...groupKeys]
      .map((groupKey) => {
        const current = currentByGroup.get(groupKey) ?? null;
        const requested = requestedByGroup.get(groupKey) ?? null;
        const flightId = requested?.flightId ?? current?.flightId ?? null;
        const quantity = requested?.quantity ?? 0;
        const oldAmount = current ? current.price : 0;
        const newAmount = requested ? requested.unitPrice * requested.quantity : 0;
        const delta = newAmount - oldAmount;

        if (delta === 0 && (current?.quantity ?? 0) === quantity) {
          return null;
        }

        return {
          flightId: flightId ?? undefined,
          passengerId: passenger.passengerId,
          passengerName,
          serviceId: requested?.serviceId ?? current?.serviceId ?? null,
          serviceType: requested?.serviceType ?? current?.serviceType ?? 'SERVICE',
          serviceName: requested?.serviceName ?? current?.serviceName ?? 'Service',
          optionId: requested?.optionId ?? current?.optionId ?? null,
          optionName: requested?.optionName ?? current?.optionName ?? null,
          quantity,
          oldAmount,
          newAmount,
          delta,
          status: 'VALID',
          message:
            flightId != null && !itineraryByFlightId.has(flightId)
              ? 'Selected flight is not available in this booking.'
              : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  });

  const additionalAmount = items.reduce((sum, item) => sum + Math.max(0, item.delta), 0);
  const refundAmount = items.reduce((sum, item) => sum + Math.max(0, -item.delta), 0);
  const netAmount = additionalAmount - refundAmount;
  const settlementType: ServiceChangePreviewResponse['settlementType'] =
    netAmount > 0 ? 'COLLECT_PAYMENT' : netAmount < 0 ? 'REFUND' : 'NONE';

  return {
    bookingId: lookup.booking.bookingId,
    currency: lookup.booking.currency,
    previewToken: `svcchg_prev_${Date.now()}`,
    settlementType,
    items,
    summary: {
      additionalAmount,
      refundAmount,
      netAmount,
    },
  };
}

export function getMockServiceChangeConfirmResponse(
  variant: ManageBookingMockVariant,
  body: ServiceChangeConfirmRequest
): ServiceChangeConfirmResponse {
  const preview = getMockServiceChangePreviewResponse(variant, { passengers: body.passengers });
  return {
    settlementId: preview.settlementType === 'COLLECT_PAYMENT' ? Date.now() : null,
    bookingId: preview.bookingId,
    currency: preview.currency,
    settlementType: preview.settlementType,
    status:
      preview.settlementType === 'COLLECT_PAYMENT'
        ? 'PAYMENT_REQUIRED'
        : preview.settlementType === 'REFUND'
          ? 'REFUND_PENDING'
          : 'COMPLETED',
    refundStatus: preview.settlementType === 'REFUND' ? 'SUCCEEDED' : null,
    provider: preview.settlementType === 'REFUND' ? 'STRIPE' : null,
    providerRefundId: preview.settlementType === 'REFUND' ? `mock_refund_${Date.now()}` : null,
    errorCode: null,
    errorMessage: null,
    refundMethod:
      preview.settlementType === 'REFUND'
        ? {
            type: 'CARD',
            label: 'Visa',
            maskedAccount: '**** 4242',
            estimatedDays: '3-7 business days',
          }
        : null,
    paymentMethods:
      preview.settlementType === 'COLLECT_PAYMENT'
        ? [
            {
              code: 'PAYOS_QR',
              label: 'Mobile Banking (VietQR)',
              provider: 'PAYOS',
              icon: null,
              supported: true,
            },
            {
              code: 'STRIPE_CARD',
              label: 'International credit or debit card',
              provider: 'STRIPE',
              icon: null,
              supported: true,
            },
          ]
        : [],
    summary: preview.summary,
  };
}

export function getMockBookingTicketsResponse(
  variant: ManageBookingMockVariant
): BookingTicketResponse {
  const lookup = getMockBookingLookupResponse(variant);
  const overrides = getVariantOverrides(variant);
  return {
    bookingId: lookup.booking.bookingId,
    pnrCode: lookup.booking.pnrCode,
    tickets: [
      {
        id: TICKET_PRIMARY_ID,
        ticketNumber: `738-${TICKET_PRIMARY_ID}`,
        status: variant === 'CANCELLED' ? 'CANCELLED' : 'ISSUED',
        issuedAt: '2026-05-20T09:00:00+07:00',
        passenger: {
          id: PASSENGER_PRIMARY_ID,
          firstName: 'Văn A',
          lastName: 'Nguyễn',
          passengerType: 'ADULT',
        },
        seat: lookup.passengers[0]?.selections?.seats?.[0]
          ? {
              id: lookup.passengers[0].selections.seats[0].seatId,
              seatNumber: lookup.passengers[0].selections.seats[0].seatNumber,
            }
          : null,
      },
      {
        id: TICKET_SECONDARY_ID,
        ticketNumber: `738-${TICKET_SECONDARY_ID}`,
        status: variant === 'CANCELLED' ? 'CANCELLED' : 'ISSUED',
        issuedAt: '2026-05-20T09:00:00+07:00',
        passenger: {
          id: PASSENGER_SECONDARY_ID,
          firstName: 'Thị B',
          lastName: 'Nguyễn',
          passengerType: 'ADULT',
        },
        seat: lookup.passengers[1]?.selections?.seats?.[0]
          ? {
              id: lookup.passengers[1].selections.seats[0].seatId,
              seatNumber: lookup.passengers[1].selections.seats[0].seatNumber,
            }
          : null,
      },
    ].filter(
      (ticket) =>
        overrides.includeSecondaryPassenger || ticket.passenger.id !== PASSENGER_SECONDARY_ID
    ),
  };
}

export function getMockCancellationPreviewResponse(
  variant: ManageBookingMockVariant,
  ticketIds: number[]
): BookingCancellationPreviewResponse {
  const lookup = getMockBookingLookupResponse(variant);
  const tickets = getMockBookingTicketsResponse(variant).tickets;
  const selectedTickets = tickets.filter((ticket) => ticketIds.includes(ticket.id));
  const itineraryCount = lookup.itineraries.length;
  const fareGrossPerTicket = itineraryCount * 1000000;
  const promoAllocatedPerTicket = 0;
  const fareNetPerTicket = fareGrossPerTicket;
  const refundFeePerTicket = 300000;
  const selectedPassengerIds = new Set(selectedTickets.map((ticket) => ticket.passenger.id));
  const seatRefundByPassenger = new Map(
    lookup.passengers.map((passenger) => [
      passenger.passengerId,
      passenger.selections?.seats?.reduce((sum, seat) => sum + seat.surchargeAmount, 0) ?? 0,
    ])
  );
  const serviceRefundByPassenger = new Map(
    lookup.passengers.map((passenger) => [
      passenger.passengerId,
      passenger.selections?.services?.reduce(
        (sum, service) => sum + service.price * service.quantity,
        0
      ) ?? 0,
    ])
  );
  const items = selectedTickets.map((ticket) => {
    const seatRefund = seatRefundByPassenger.get(ticket.passenger.id) ?? 0;
    const serviceRefund = serviceRefundByPassenger.get(ticket.passenger.id) ?? 0;
    const netRefund = fareNetPerTicket + seatRefund + serviceRefund - refundFeePerTicket;
    return {
      ticketId: ticket.id,
      passengerId: ticket.passenger.id,
      passengerType: ticket.passenger.passengerType,
      passengerName: `${ticket.passenger.lastName} ${ticket.passenger.firstName}`.trim(),
      flightIds: lookup.itineraries.map((itinerary) => itinerary.flightId),
      eligible: variant !== 'CANCELLED',
      reason: variant === 'CANCELLED' ? 'Ticket already cancelled.' : null,
      fareGross: fareGrossPerTicket,
      promoAllocated: promoAllocatedPerTicket,
      fareNet: fareNetPerTicket,
      seatRefund,
      serviceRefund,
      refundFee: refundFeePerTicket,
      netRefund,
    };
  });
  const summary = items.reduce(
    (acc, item) => ({
      fareGross: acc.fareGross + item.fareGross,
      promoAllocated: acc.promoAllocated + item.promoAllocated,
      fareNet: acc.fareNet + item.fareNet,
      seatRefund: acc.seatRefund + item.seatRefund,
      serviceRefund: acc.serviceRefund + item.serviceRefund,
      refundFee: acc.refundFee + item.refundFee,
      netRefund: acc.netRefund + item.netRefund,
    }),
    {
      fareGross: 0,
      promoAllocated: 0,
      fareNet: 0,
      seatRefund: 0,
      serviceRefund: 0,
      refundFee: 0,
      netRefund: 0,
    }
  );

  if (selectedTickets.length === 0 || selectedPassengerIds.size === 0) {
    throw new Error('No valid ticket was found for the cancellation preview.');
  }

  return {
    bookingId: lookup.booking.bookingId,
    bookingStatus: lookup.booking.status,
    paymentStatus: variant === 'PENDING_PAYMENT' ? 'PENDING' : 'SUCCESS',
    currency: lookup.booking.currency,
    items,
    summary,
  };
}

export function getMockCancellationSelectionPreviewResponse(
  variant: ManageBookingMockVariant,
  body: BookingCancellationSelectionPreviewRequest
): BookingCancellationPreviewResponse {
  const lookup = getMockBookingLookupResponse(variant);
  const itineraryCount = lookup.itineraries.length || 1;
  const fareGrossPerFlight = 1000000;
  const refundFeePerFlight = 300000;
  const items = body.passengers
    .map(({ passengerId, flightIds }) => {
      const passenger = lookup.passengers.find((item) => item.passengerId === passengerId);
      const selectedFlightIds = Array.from(new Set(flightIds)).filter((flightId) =>
        lookup.itineraries.some((itinerary) => itinerary.flightId === flightId)
      );
      if (!passenger || selectedFlightIds.length === 0) return null;

      const seatRefund =
        passenger.selections?.seats
          ?.filter((seat) => selectedFlightIds.includes(seat.flightId))
          .reduce((sum, seat) => sum + seat.surchargeAmount, 0) ?? 0;
      const serviceTotal =
        passenger.selections?.services?.reduce(
          (sum, service) => sum + service.price * service.quantity,
          0
        ) ?? 0;
      const serviceRefund = Math.round((serviceTotal * selectedFlightIds.length) / itineraryCount);
      const fareGross = selectedFlightIds.length * fareGrossPerFlight;
      const fareNet = fareGross;
      const refundFee = selectedFlightIds.length * refundFeePerFlight;
      const netRefund = fareNet + seatRefund + serviceRefund - refundFee;

      return {
        ticketId: null,
        passengerId: passenger.passengerId,
        passengerType: passenger.passengerType,
        passengerName: `${passenger.lastName} ${passenger.firstName}`.trim(),
        flightIds: selectedFlightIds,
        eligible: variant !== 'CANCELLED',
        reason: variant === 'CANCELLED' ? 'Ticket already cancelled.' : null,
        fareGross,
        promoAllocated: 0,
        fareNet,
        seatRefund,
        serviceRefund,
        refundFee,
        netRefund,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  if (items.length === 0) {
    throw new Error('No valid selection was found for the cancellation preview.');
  }

  const summary = items.reduce(
    (acc, item) => ({
      fareGross: acc.fareGross + item.fareGross,
      promoAllocated: acc.promoAllocated + item.promoAllocated,
      fareNet: acc.fareNet + item.fareNet,
      seatRefund: acc.seatRefund + item.seatRefund,
      serviceRefund: acc.serviceRefund + item.serviceRefund,
      refundFee: acc.refundFee + item.refundFee,
      netRefund: acc.netRefund + item.netRefund,
    }),
    {
      fareGross: 0,
      promoAllocated: 0,
      fareNet: 0,
      seatRefund: 0,
      serviceRefund: 0,
      refundFee: 0,
      netRefund: 0,
    }
  );

  return {
    bookingId: lookup.booking.bookingId,
    bookingStatus: lookup.booking.status,
    paymentStatus: variant === 'PENDING_PAYMENT' ? 'PENDING' : 'SUCCESS',
    currency: lookup.booking.currency,
    items,
    summary,
  };
}

export function getMockCancellationConfirmResponse(
  variant: ManageBookingMockVariant,
  body: BookingCancellationConfirmRequest
): BookingCancellationConfirmResponse {
  if (variant === 'CANCELLED') {
    throw new Error('This booking has already been cancelled.');
  }
  if (variant === 'CHECKED_IN_LOCKED') {
    throw new Error('This booking has already been checked in and cannot be cancelled.');
  }

  const preview = getMockCancellationSelectionPreviewResponse(variant, body);
  const lookup = getMockBookingLookupResponse(variant);
  const cancellationCode = `CAN${preview.bookingId}${Date.now().toString().slice(-6)}`;
  const hasFailedRouteSelection = body.passengers.some(({ flightIds }) =>
    flightIds.some((flightId) => {
      const itinerary = lookup.itineraries.find((item) => item.flightId === flightId);
      return (
        itinerary?.departureAirportCode === MOCK_FAILED_CANCELLATION_ROUTE.from &&
        itinerary?.arrivalAirportCode === MOCK_FAILED_CANCELLATION_ROUTE.to
      );
    })
  );

  const failOutcome =
    hasFailedRouteSelection ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('mockCancellationOutcome') === 'fail');

  if (failOutcome) {
    return {
      ...preview,
      bookingStatus: 'CONFIRMED',
      cancellationStatus: 'FAILED',
      cancelledAt: new Date().toISOString(),
      message: 'Flight cancellation could not be processed.',
      cancellationCode,
      refundStatus: 'FAILED',
      errorCode: 'CANCELLATION_WINDOW_CLOSED',
      errorMessage: hasFailedRouteSelection
        ? 'Mock data: chặng HAN - SGN được cấu hình hủy không thành công.'
        : 'Chuyến bay không đủ điều kiện để hủy do đã quá thời gian quy định.',
    };
  }

  return {
    ...preview,
    cancellationStatus: 'SUCCESS',
    cancelledAt: '2026-05-20T10:15:00+07:00',
    message: 'Flight cancellation completed successfully.',
    cancellationCode,
    refundStatus: 'SUCCEEDED',
    refundMethod: {
      type: 'CREDIT_CARD',
      label: 'Credit card',
      maskedAccount: 'Visa **** 4242',
      estimatedDays: '3-7 business days',
    },
  };
}
