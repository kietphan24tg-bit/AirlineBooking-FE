import {
  getMockBookingLookupResponse,
  getMockBookingTicketsResponse,
} from './manageBooking';
import type {
  TripDetailResult,
  TripHistoryItem,
  TripHistoryQuery,
  TripHistoryResult,
  TripHistoryStatus,
} from '../types/booking.types';

type MockTripRecord = {
  item: TripHistoryItem;
  detail: TripDetailResult;
};

const AIRPORT_META: Record<
  string,
  { name: string; city: string; terminal: string | null }
> = {
  SGN: {
    name: 'Tan Son Nhat International Airport',
    city: 'Ho Chi Minh City',
    terminal: 'T1',
  },
  HAN: {
    name: 'Noi Bai International Airport',
    city: 'Hanoi',
    terminal: 'T1',
  },
  DAD: {
    name: 'Da Nang International Airport',
    city: 'Da Nang',
    terminal: 'T1',
  },
  NRT: {
    name: 'Narita International Airport',
    city: 'Tokyo',
    terminal: 'T1',
  },
};

const CONFIRMED_LOOKUP = getMockBookingLookupResponse('CONFIRMED');
const CONFIRMED_TICKETS = getMockBookingTicketsResponse('CONFIRMED').tickets;

function cloneMock<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toTripHistoryStatus(status: string): TripHistoryStatus {
  switch (status) {
    case 'CANCELLED':
      return 'CANCELLED';
    case 'CHECKED_IN':
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return 'UPCOMING';
  }
}

function toTripStatusLabel(status: TripHistoryStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return 'Upcoming';
  }
}

function toPaymentStatus(status: string): { code: string; label: string } {
  if (status === 'PENDING_PAYMENT') {
    return {
      code: 'PENDING',
      label: 'Pending payment',
    };
  }

  return {
    code: 'SUCCESS',
    label: 'Paid',
  };
}

function deriveManageBookingTripRecords(): MockTripRecord[] {
  const tripStatus = toTripHistoryStatus(CONFIRMED_LOOKUP.booking.status);
  const payment = toPaymentStatus(CONFIRMED_LOOKUP.booking.status);
  const totalAmount = CONFIRMED_LOOKUP.booking.totalAmount;
  const passengerCount = CONFIRMED_LOOKUP.passengers.length;

  return CONFIRMED_LOOKUP.itineraries.map((itinerary) => {
    const departureAirport = AIRPORT_META[itinerary.departureAirportCode];
    const arrivalAirport = AIRPORT_META[itinerary.arrivalAirportCode];
    const ticketByPassengerId = new Map(
      CONFIRMED_TICKETS.map((ticket) => [ticket.passenger.id, ticket])
    );

    return {
      item: {
        bookingId: CONFIRMED_LOOKUP.booking.bookingId,
        flightId: itinerary.flightId,
        pnrCode: CONFIRMED_LOOKUP.booking.pnrCode,
        tripStatus,
        tripStatusLabel: toTripStatusLabel(tripStatus),
        paymentStatus: payment.code,
        paymentStatusLabel: payment.label,
        flightNumber: itinerary.flightNumber,
        cabinClass: itinerary.fareName,
        departureAirportCode: itinerary.departureAirportCode,
        departureCity: departureAirport?.city ?? itinerary.departureCity,
        arrivalAirportCode: itinerary.arrivalAirportCode,
        arrivalCity: arrivalAirport?.city ?? itinerary.arrivalCity,
        departureTime: itinerary.departureTime,
        arrivalTime: itinerary.arrivalTime,
        flightDate: itinerary.departureTime.slice(0, 10),
        passengerCount,
        totalAmount,
        currency: CONFIRMED_LOOKUP.booking.currency,
        actions: {
          canManageBooking: true,
          canCheckIn: CONFIRMED_LOOKUP.actions.canCheckIn,
          canViewDetail: true,
        },
      },
      detail: {
        booking: {
          bookingId: CONFIRMED_LOOKUP.booking.bookingId,
          pnrCode: CONFIRMED_LOOKUP.booking.pnrCode,
          bookingStatus: CONFIRMED_LOOKUP.booking.status,
          bookingStatusLabel: CONFIRMED_LOOKUP.booking.statusLabel,
          tripStatus,
          tripStatusLabel: toTripStatusLabel(tripStatus),
          totalAmount,
          currency: CONFIRMED_LOOKUP.booking.currency,
          createdAt: CONFIRMED_LOOKUP.booking.createdAt,
        },
        segment: {
          flightId: itinerary.flightId,
          flightNumber: itinerary.flightNumber,
          flightDate: itinerary.departureTime.slice(0, 10),
          departureTime: itinerary.departureTime,
          arrivalTime: itinerary.arrivalTime,
          durationMinutes: Math.round(
            (new Date(itinerary.arrivalTime).getTime() -
              new Date(itinerary.departureTime).getTime()) /
              60000
          ),
          departureAirportCode: itinerary.departureAirportCode,
          departureAirportName: departureAirport?.name ?? itinerary.departureAirportCode,
          departureCity: departureAirport?.city ?? itinerary.departureCity,
          departureTerminal:
            departureAirport?.terminal ?? itinerary.departureTerminal ?? null,
          arrivalAirportCode: itinerary.arrivalAirportCode,
          arrivalAirportName: arrivalAirport?.name ?? itinerary.arrivalAirportCode,
          arrivalCity: arrivalAirport?.city ?? itinerary.arrivalCity,
          arrivalTerminal: arrivalAirport?.terminal ?? itinerary.arrivalTerminal ?? null,
          fareClassCode: itinerary.fareBenefits.fareClassCode,
          fareClassName: itinerary.fareBenefits.fareClassName,
          cabinClass: itinerary.fareName,
          checkedBaggageKg: itinerary.fareBenefits.baggageCheckinKg,
          carryOnBaggageKg: itinerary.fareBenefits.baggageHandKg,
        },
        passengers: CONFIRMED_LOOKUP.passengers.map((passenger) => {
          const matchingSeat = passenger.selections?.seats?.find(
            (seat) => seat.flightId === itinerary.flightId
          );
          const matchingTicket = ticketByPassengerId.get(passenger.passengerId);

          return {
            passengerId: passenger.passengerId,
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            fullName: `${passenger.firstName} ${passenger.lastName}`.trim(),
            passengerType: passenger.passengerType,
            ticket: matchingTicket
              ? {
                  ticketId: matchingTicket.id,
                  ticketNumber: matchingTicket.ticketNumber,
                  status: matchingTicket.status,
                  issuedAt: matchingTicket.issuedAt,
                }
              : null,
            seat: matchingSeat
              ? {
                  seatId: matchingSeat.seatId,
                  seatNumber: matchingSeat.seatNumber,
                  status: matchingSeat.status,
                  surchargeAmount: matchingSeat.surchargeAmount,
                  currency: matchingSeat.currency,
                }
              : null,
          };
        }),
        payment: {
          paymentStatus: payment.code,
          paymentStatusLabel: payment.label,
          paymentMethod: 'STRIPE_CARD',
          transactionId: 'txn_manage_booking_mock',
          amount: totalAmount,
          currency: CONFIRMED_LOOKUP.booking.currency,
        },
        actions: {
          canManageBooking: true,
          canViewETicket: true,
          canDownloadInvoice: true,
        },
      },
    };
  });
}

const MOCK_TRIP_RECORDS: MockTripRecord[] = [
  ...deriveManageBookingTripRecords(),
  {
    item: {
      bookingId: 1003,
      flightId: 503,
      pnrCode: 'GHI789',
      tripStatus: 'COMPLETED',
      tripStatusLabel: 'Completed',
      paymentStatus: 'SUCCESS',
      paymentStatusLabel: 'Paid',
      flightNumber: 'VJ822',
      cabinClass: 'Eco',
      departureAirportCode: 'SGN',
      departureCity: 'Ho Chi Minh City',
      arrivalAirportCode: 'NRT',
      arrivalCity: 'Tokyo',
      departureTime: '2026-03-20T23:45:00+07:00',
      arrivalTime: '2026-03-21T07:30:00+09:00',
      flightDate: '2026-03-20',
      passengerCount: 1,
      totalAmount: 3890000,
      currency: 'VND',
      actions: {
        canManageBooking: false,
        canCheckIn: false,
        canViewDetail: true,
      },
    },
    detail: {
      booking: {
        bookingId: 1003,
        pnrCode: 'GHI789',
        bookingStatus: 'CONFIRMED',
        bookingStatusLabel: 'Confirmed',
        tripStatus: 'COMPLETED',
        tripStatusLabel: 'Completed',
        totalAmount: 3890000,
        currency: 'VND',
        createdAt: '2026-02-10T18:25:00+07:00',
      },
      segment: {
        flightId: 503,
        flightNumber: 'VJ822',
        flightDate: '2026-03-20',
        departureTime: '2026-03-20T23:45:00+07:00',
        arrivalTime: '2026-03-21T07:30:00+09:00',
        durationMinutes: 345,
        departureAirportCode: 'SGN',
        departureAirportName: AIRPORT_META.SGN.name,
        departureCity: AIRPORT_META.SGN.city,
        departureTerminal: 'T2',
        arrivalAirportCode: 'NRT',
        arrivalAirportName: AIRPORT_META.NRT.name,
        arrivalCity: AIRPORT_META.NRT.city,
        arrivalTerminal: AIRPORT_META.NRT.terminal,
        fareClassCode: 'ECO',
        fareClassName: 'Economy Saver',
        cabinClass: 'Eco',
        checkedBaggageKg: 20,
        carryOnBaggageKg: 7,
      },
      passengers: [
        {
          passengerId: 6,
          firstName: 'Trang',
          lastName: 'Le',
          fullName: 'Trang Le',
          passengerType: 'ADULT',
          ticket: {
            ticketId: 9020,
            ticketNumber: '7383234567890',
            status: 'USED',
            issuedAt: '2026-02-10T18:40:00+07:00',
          },
          seat: {
            seatId: 501,
            seatNumber: '14D',
            status: 'USED',
            surchargeAmount: 0,
            currency: 'VND',
          },
        },
      ],
      payment: {
        paymentStatus: 'SUCCESS',
        paymentStatusLabel: 'Paid',
        paymentMethod: 'STRIPE_CARD',
        transactionId: 'txn_ghi789',
        amount: 3890000,
        currency: 'VND',
      },
      actions: {
        canManageBooking: false,
        canViewETicket: true,
        canDownloadInvoice: true,
      },
    },
  },
];

function normalizeTripStatus(status?: TripHistoryStatus): TripHistoryStatus | null {
  if (!status) return null;
  return status.toUpperCase() as TripHistoryStatus;
}

function matchesQuery(item: TripHistoryItem, query: TripHistoryQuery): boolean {
  const normalizedStatus = normalizeTripStatus(query.status);
  if (normalizedStatus && item.tripStatus !== normalizedStatus) {
    return false;
  }

  const normalizedQuery = query.query?.trim().toLowerCase();
  if (normalizedQuery) {
    const haystack = [
      item.pnrCode,
      item.flightNumber,
      item.departureAirportCode,
      item.arrivalAirportCode,
      item.departureCity,
      item.arrivalCity,
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(normalizedQuery)) {
      return false;
    }
  }

  if (query.fromDate && item.flightDate < query.fromDate) {
    return false;
  }

  if (query.toDate && item.flightDate > query.toDate) {
    return false;
  }

  return true;
}

export function getMockTripHistoryResult(query: TripHistoryQuery = {}): TripHistoryResult {
  const filtered = MOCK_TRIP_RECORDS.map((record) => record.item).filter((item) =>
    matchesQuery(item, query)
  );
  const limit = typeof query.limit === 'number' && query.limit > 0 ? query.limit : filtered.length;
  const items = filtered.slice(0, limit);

  return cloneMock({
    items,
    pageInfo: {
      nextCursor: null,
      hasMore: filtered.length > items.length,
      limit,
    },
  });
}

export function getMockTripDetailResult(
  bookingId: string | number,
  flightId: string | number
): TripDetailResult {
  const normalizedBookingId = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
  const normalizedFlightId = typeof flightId === 'string' ? Number(flightId) : flightId;

  const match = MOCK_TRIP_RECORDS.find(
    (record) =>
      record.item.bookingId === normalizedBookingId && record.item.flightId === normalizedFlightId
  );

  if (!match) {
    throw new Error('Mock trip detail not found');
  }

  return cloneMock(match.detail);
}
