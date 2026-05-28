export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'CANCELED';

export interface PaymentEntity {
  id: number;
  paymentId?: number;
  bookingId: number;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus | string;
  expireAt: string; // ISO datetime
  transactionId: string | null;
  qrData: string | null;
  qrImageUrl?: string | null;
  paymentUrl?: string | null;
}

export interface PaymentAction {
  type: string;
  qrData: string | null;
  qrImageUrl: string | null;
  paymentUrl: string | null;
}

export interface CreatePaymentRequest {
  bookingId: string | number;
  method: string;
}

export interface CreateSeatChangePaymentRequest {
  bookingId: string | number;
  seatChangeSettlementId: string | number;
  method: string;
}

export interface CreateServiceChangePaymentRequest {
  bookingId: string | number;
  serviceChangeSettlementId: string | number;
  method: string;
}

export interface CreateFlightChangePaymentRequest {
  bookingId: string | number;
  flightChangeSettlementId: string | number;
  method: string;
}

export interface CreatePaymentResponse {
  payment: PaymentEntity;
  action: PaymentAction;
}

export interface GetPaymentResponse {
  payment: PaymentEntity;
  action?: PaymentAction;
}

export interface CancelPaymentResponse {
  id?: number;
  paymentId?: number;
  bookingId: number;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus | string;
  paidAt: string | null;
  expireAt: string;
  transactionId: string | null;
  qrData: string | null;
  qrImageUrl: string | null;
  paymentUrl: string | null;
}

export interface PaymentResultPolling {
  pending: boolean;
  nextPollAfterSeconds: number | null;
}

export interface PaymentResultFailure {
  code: string;
  message: string;
}

export interface PaymentResultStatusResponse {
  paymentId: number;
  bookingId: number | null;
  paymentStatus: PaymentStatus | string;
  bookingStatus: string;
  resultPage: 'PENDING' | 'SUCCESS' | 'ERROR' | string;
  expireAt: string | null;
  amount: number | null;
  currency: string | null;
  method: string | null;
  transactionId: string | null;
  qrData: string | null;
  qrImageUrl: string | null;
  paymentUrl: string | null;
  pnrCode: string | null;
  polling: PaymentResultPolling;
  failure: PaymentResultFailure | null;
}

export interface PaymentResultSummaryBooking {
  pnrCode: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  currency: string;
  totalAmount: number;
}

export interface PaymentResultSummaryContact {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}

export interface PaymentResultSummaryPayment {
  method: string | null;
  transactionId: string | null;
  amount: number;
  currency: string;
}

export interface PaymentResultSummaryTotals {
  passengerCount: number | null;
  segmentCount: number | null;
  totalAmount: number;
  currency: string;
}

export interface PaymentResultSummaryLocation {
  airportCode: string | null;
  airportName: string | null;
  city: string | null;
  terminal: string | null;
  time: string | null;
}

export interface PaymentResultSummaryFare {
  fareClassCode: string | null;
  fareClassName: string | null;
  cabinClass: string | null;
  checkedBaggageKg: number | null;
  carryOnBaggageKg: number | null;
}

export interface PaymentResultSummarySegment {
  segmentKey: string;
  flightId: number;
  journeyType: string | null;
  flightNumber: string | null;
  airlineName: string | null;
  departure: PaymentResultSummaryLocation;
  arrival: PaymentResultSummaryLocation;
  durationMinutes: number | null;
  stops: number | null;
  fare: PaymentResultSummaryFare | null;
}

export interface PaymentResultSummarySeat {
  assigned: boolean | null;
  seatId: number | null;
  seatNumber: string | null;
  source: string | null;
}

export interface PaymentResultSummaryEmbeddedTicket {
  ticketId: number;
  ticketNumber: string | null;
  status: string | null;
  issuedAt: string | null;
}

export interface PaymentResultSummaryPassengerSegment {
  segmentKey: string;
  seat: PaymentResultSummarySeat | null;
  ticket: PaymentResultSummaryEmbeddedTicket | null;
}

export interface PaymentResultSummaryPassengerService {
  serviceId: number;
  serviceType: string | null;
  serviceName: string | null;
  optionId: number | null;
  optionName: string | null;
  quantity: number | null;
  amount: number;
  currency: string | null;
  segmentKey: string | null;
}

export interface PaymentResultSummaryPassenger {
  passengerId: number;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  passengerType: string | null;
  segments: PaymentResultSummaryPassengerSegment[];
  services: PaymentResultSummaryPassengerService[];
}

export interface PaymentResultSummaryTicket {
  ticketId: number;
  ticketNumber: string | null;
  status: string | null;
  issuedAt: string | null;
  passengerId: number;
  segmentKey: string;
  flightId: number;
  seat: PaymentResultSummarySeat | null;
}

export interface PaymentResultSummaryLabeledAmount {
  label: string;
  amount: number;
}

export interface PaymentResultSummarySegmentFareAmounts {
  fareClassCode: string | null;
  baseFare: number;
  vatOnFare: number;
  fareTotal: number;
}

export interface PaymentResultSummaryPassengerSegmentFareBreakdown {
  segmentKey: string;
  routeLabel: string;
  fare: PaymentResultSummarySegmentFareAmounts;
  taxesAndFees: PaymentResultSummaryLabeledAmount[];
  services: PaymentResultSummaryLabeledAmount[];
  segmentTotal: number;
}

export interface PaymentResultSummaryPassengerFareBreakdown {
  passengerId: number;
  passengerLabel: string;
  bySegment: PaymentResultSummaryPassengerSegmentFareBreakdown[];
  passengerTotal: number;
}

export interface PaymentResultSummaryFareTotals {
  baseFare: number;
  discount: number;
  tax: number;
  serviceFee: number;
  seatFee: number;
  total: number;
}

export interface PaymentResultSummaryFareBreakdown {
  currency: string;
  totals: PaymentResultSummaryFareTotals;
  byPassenger: PaymentResultSummaryPassengerFareBreakdown[];
}

export interface PaymentResultSummaryResponse {
  paymentId: number;
  bookingId: number;
  paymentStatus: PaymentStatus | string;
  bookingStatus: string;
  booking: PaymentResultSummaryBooking;
  contact: PaymentResultSummaryContact;
  payment: PaymentResultSummaryPayment;
  summary: PaymentResultSummaryTotals;
  segments: PaymentResultSummarySegment[];
  passengers: PaymentResultSummaryPassenger[];
  tickets: PaymentResultSummaryTicket[];
  fareBreakdown: PaymentResultSummaryFareBreakdown;
}
