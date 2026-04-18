import { TripRecord, PassengerProfile } from '../../types/booking.types';
import { Link } from 'react-router-dom';
import { ArrowRight, User } from 'lucide-react';

export interface BookingResultCardProps {
  trip: TripRecord;
  passenger: PassengerProfile;
}

export default function BookingResultCard({ trip, passenger }: BookingResultCardProps) {
  return (
    <div className="group/card flex flex-col overflow-hidden rounded-xl border border-surface-container-high bg-surface-container-lowest/90 shadow-sm backdrop-blur-sm transition-all duration-500 hover:shadow-xl">
      <div className="flex flex-row items-center justify-between p-6">
        <div className="text-left flex flex-row items-center gap-2">
          <User
            className="h-15 w-15 rounded-xl bg-cabin-burgundy text-luxury-gold p-3"
            strokeWidth={1}
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Passenger
            </p>
            <h1 className="text-lg font-bold text-on-surface">{passenger.fullName}</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Booking Code
          </p>
          <h1 className="text-lg font-bold text-on-surface">{trip.id}</h1>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between p-6 bg-white">
        <div className="text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Route
          </p>
          <h1 className="text-lg font-bold text-on-surface">{trip.route}</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Date
          </p>
          <h1 className="text-lg font-bold text-on-surface">{trip.dateLabel}</h1>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between p-6 bg-white">
        <div className="text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Cabin
          </p>
          <h1 className="text-lg font-bold text-on-surface">{trip.cabin || 'N/A'}</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Seat
          </p>
          <h1 className="text-lg font-bold text-on-surface">{passenger.seat}</h1>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between p-6 bg-white">
        <div className="text left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Status
          </p>
          <h1
            className={`text-lg font-bold ${
              trip.status === 'completed'
                ? 'text-green-600'
                : trip.status === 'cancelled'
                  ? 'text-red-600'
                  : trip.status === 'confirmed'
                    ? 'text-yellow-600'
                    : 'text-on-surface'
            }`}
          >
            {trip.status === 'completed'
              ? 'Completed'
              : trip.status === 'cancelled'
                ? 'Cancelled'
                : trip.status === 'confirmed'
                  ? 'Confirmed'
                  : 'Pending'}
          </h1>
        </div>
        <Link
          to={`/manage-booking/${trip.id}`}
          className="inline-flex items-center justify-center rounded-md border border-outline-variant/30 px-4 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low"
        >
          View Details
          <ArrowRight className="h-4 w-4 ml-2" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
