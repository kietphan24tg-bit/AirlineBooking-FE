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

/** Passenger details from PassengerInfo, forwarded via `navigate(..., { state })`. */
export interface PassengerBookingDetails {
  title: string;
  name: string;
  email: string;
  phone: string;
  passport: string;
  dob: string;
}

export type PassengerInfoNavigationState = {
  passengers: PassengerBookingDetails[];
};
