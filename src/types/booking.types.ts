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
