import type {
  BookingCancellationConfirmRequest,
  BookingCancellationConfirmResponse,
  BookingCancellationPreviewResponse,
  BookingCancellationSelectionPreviewRequest,
  BookingLookupResponse,
  BookingLookupSeatAssignment,
  BookingLookupServiceSelection,
  BookingManageOptionsResponse,
  BookingTicketResponse,
} from '../types/booking.types';
import type { SeatMapResponse } from '../types/flight.types';

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
  serviceName: 'Premium meal',
  optionId: 5101,
  optionName: 'Mi y bo bam',
  price: 120000,
};

const SERVICE_BAGGAGE = {
  serviceId: 5002,
  serviceType: 'BAGGAGE',
  serviceName: 'Checked baggage',
  optionId: 5201,
  optionName: 'Goi 20kg',
  price: 350000,
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
        serviceFee: SERVICE_MEAL.price + SERVICE_BAGGAGE.price,
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
        serviceFee: SERVICE_MEAL.price + SERVICE_BAGGAGE.price,
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
  return {
    primary: [
      {
        serviceId: SERVICE_MEAL.serviceId,
        serviceType: SERVICE_MEAL.serviceType,
        serviceName: SERVICE_MEAL.serviceName,
        optionId: SERVICE_MEAL.optionId,
        optionName: SERVICE_MEAL.optionName,
        quantity: 1,
        price: SERVICE_MEAL.price,
      },
    ],
    secondary: [
      {
        serviceId: SERVICE_BAGGAGE.serviceId,
        serviceType: SERVICE_BAGGAGE.serviceType,
        serviceName: SERVICE_BAGGAGE.serviceName,
        optionId: SERVICE_BAGGAGE.optionId,
        optionName: SERVICE_BAGGAGE.optionName,
        quantity: 1,
        price: SERVICE_BAGGAGE.price,
      },
    ],
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

export function getMockSeatMapResponse(
  variant: ManageBookingMockVariant,
  flightId: number,
  fareId: number
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
  if (flightId === FLIGHT_OUTBOUND_ID) {
    reservedSeats.set(SEAT_ROW_PRIMARY.seatId, { status: 'BOOKED', price: 100000 });
    reservedSeats.set(SEAT_ROW_SECONDARY.seatId, { status: 'BOOKED', price: 100000 });
  }
  if (flightId === FLIGHT_RETURN_ID) {
    reservedSeats.set(SEAT_ROW_PRIMARY_RETURN.seatId, { status: 'BOOKED', price: 100000 });
    reservedSeats.set(SEAT_ROW_SECONDARY_RETURN.seatId, { status: 'BOOKED', price: 100000 });
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
  return {
    ...preview,
    cancellationStatus: 'SUCCESS',
    cancelledAt: '2026-05-20T10:15:00+07:00',
    message: 'Flight cancellation completed successfully.',
  };
}
