import {
  Conversation,
  FlightResultData,
  BookingStatusData,
  ConfirmationData,
} from '../types/assistant';

export const MOCK_FLIGHT_DATA: FlightResultData = {
  flightNumber: 'VN-234',
  airline: 'AirlineBooking Wings',
  originCode: 'SGN',
  originCity: 'Ho Chi Minh City (Tan Son Nhat)',
  destinationCode: 'HAN',
  destinationCity: 'Ha Noi (Noi Bai)',
  departureTime: '08:30 AM',
  arrivalTime: '10:45 AM',
  duration: '2h 15m · Non-stop',
  aircraft: 'Airbus A350-900',
  price: '$120.00',
  priceVnd: '2,850,000 VND',
  availableSeats: 4,
  badge: 'Available · 4 seats remaining',
};

export const MOCK_BOOKING_DATA: BookingStatusData = {
  bookingCode: 'ABC123',
  passengerMasked: 'N*** V** A**',
  status: 'CONFIRMED',
  origin: 'SGN (Ho Chi Minh)',
  destination: 'DAD (Da Nang)',
  departureDate: 'Tomorrow, Oct 24, 2026',
  departureTime: '14:20 PM',
  seat: '12A (Window)',
  fareClass: 'Economy Flex (Y)',
};

export const MOCK_CONFIRMATION_DATA: ConfirmationData = {
  id: 'prop-8921-seat',
  actionType: 'SEAT_CHANGE',
  bookingCode: 'ABC123',
  description: 'You are about to change seat 12A to 14C for booking ABC123.',
  currentValue: '12A (Window)',
  newValue: '14C (Aisle)',
  passengerName: 'Nguyen Van A',
  expiresInSeconds: 299,
  status: 'PENDING',
};

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Seat Change Request ABC123',
    timestamp: '10:42 AM',
    group: 'today',
    messages: [
      {
        id: 'msg-101',
        sender: 'user',
        text: 'I want to change my seat on booking ABC123 from 12A to 14C.',
        timestamp: '10:41 AM',
        messageType: 'text',
      },
      {
        id: 'msg-102',
        sender: 'assistant',
        timestamp: '10:42 AM',
        messageType: 'confirmation',
        confirmationData: { ...MOCK_CONFIRMATION_DATA },
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Flight SGN to HAN Search',
    timestamp: '09:15 AM',
    group: 'today',
    messages: [
      {
        id: 'msg-201',
        sender: 'user',
        text: 'Find flights from Ho Chi Minh City to Ha Noi tomorrow morning.',
        timestamp: '09:14 AM',
        messageType: 'text',
      },
      {
        id: 'msg-202',
        sender: 'assistant',
        timestamp: '09:15 AM',
        messageType: 'tool_flight',
        flightData: { ...MOCK_FLIGHT_DATA },
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Baggage Allowance Policy',
    timestamp: 'Yesterday',
    group: 'yesterday',
    messages: [
      {
        id: 'msg-301',
        sender: 'user',
        text: 'What is the carry-on baggage weight limit for Economy Flex?',
        timestamp: 'Yesterday, 4:30 PM',
        messageType: 'text',
      },
      {
        id: 'msg-302',
        sender: 'assistant',
        timestamp: 'Yesterday, 4:31 PM',
        messageType: 'rag',
        text: 'For Economy Flex passengers, you are allowed **1 piece of carry-on baggage** weighing up to **10kg (22 lbs)** with maximum dimensions of 56 x 36 x 23 cm, plus **1 small personal item** (laptop bag or handbag) under 3kg.',
        confidenceScore: 0.98,
        sources: [
          {
            id: 'src-1',
            title: 'AirlineBooking Baggage Policy §3.2',
            section: 'Carry-on Weight Restrictions',
            url: '#',
          },
          {
            id: 'src-2',
            title: 'Passenger Tariff & Baggage Rules 2026',
            section: 'Economy Class Allowance',
            url: '#',
          },
        ],
      },
    ],
  },
  {
    id: 'conv-4',
    title: 'Check-in Rules for Domestic',
    timestamp: '3 days ago',
    group: 'previous_7_days',
    messages: [
      {
        id: 'msg-401',
        sender: 'user',
        text: 'When does online check-in open for domestic flights?',
        timestamp: 'Oct 21, 2:10 PM',
        messageType: 'text',
      },
      {
        id: 'msg-402',
        sender: 'assistant',
        timestamp: 'Oct 21, 2:11 PM',
        messageType: 'rag',
        text: 'Online check-in opens **24 hours prior** to scheduled departure time and closes **60 minutes before departure** for all domestic Vietnam flights. You can issue your digital boarding pass directly through our web or mobile app.',
        confidenceScore: 0.99,
        sources: [
          {
            id: 'src-3',
            title: 'Online Check-in Guidelines §1.1',
            section: 'Timeline & Airport Kiosks',
            url: '#',
          },
        ],
      },
    ],
  },
];
