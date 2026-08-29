export type Sender = 'user' | 'assistant';

export interface SourceItem {
  id: string;
  title: string;
  section: string;
  url: string;
}

export interface FlightResultData {
  flightNumber: string;
  airline: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  aircraft: string;
  price: string;
  priceVnd: string;
  availableSeats: number;
  badge: string;
}

export interface BookingStatusData {
  bookingCode: string;
  passengerMasked: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'PENDING';
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  seat: string;
  fareClass: string;
}

export interface ConfirmationData {
  id: string;
  actionType: 'SEAT_CHANGE' | 'FLIGHT_CHANGE' | 'CANCELLATION';
  bookingCode: string;
  description: string;
  currentValue: string;
  newValue: string;
  passengerName: string;
  expiresInSeconds: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export type MessageType =
  | 'text'
  | 'welcome'
  | 'rag'
  | 'tool_flight'
  | 'tool_booking'
  | 'confirmation'
  | 'auth'
  | 'loading'
  | 'error';

export interface ChatMessage {
  id: string;
  sender: Sender;
  text?: string;
  timestamp: string;
  messageType: MessageType;
  sources?: SourceItem[];
  confidenceScore?: number;
  flightData?: FlightResultData;
  bookingData?: BookingStatusData;
  confirmationData?: ConfirmationData;
  helpfulRating?: 'helpful' | 'unhelpful' | null;
  error?: {
    userMessageEn: string;
    userMessageVi: string;
    canRetry: boolean;
  };
}

export type HistoryGroup = 'today' | 'yesterday' | 'previous_7_days';

export interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  group: HistoryGroup;
  messages: ChatMessage[];
  archived?: boolean;
}

export type AssistantLanguage = 'en' | 'vi';

export type DemoStateKey =
  | 'welcome'
  | 'rag'
  | 'tool_flight'
  | 'tool_booking'
  | 'confirmation'
  | 'auth'
  | 'loading'
  | 'error'
  | 'empty';
