import { CalendarDays, ChevronRight, Plane, Users } from 'lucide-react';

export interface TripCardData {
  id: string;
  bookingId?: number;
  flightId?: number;
  pnrCode: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  statusLabel: string;
  date: string;
  dateDay: string;
  dateMonth: string;
  route: string;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  cabin: string;
  passengerCount: number;
  paymentStatus: string;
  amount: string;
  currency: string;
  canManageBooking?: boolean;
  canCheckIn?: boolean;
}

interface TripCardProps {
  trip: TripCardData;
  onViewDetail: (trip: TripCardData) => void;
  onManageBooking?: (trip: TripCardData) => void;
  onCheckIn?: (trip: TripCardData) => void;
}

function getStatusBadgeClass(status: TripCardData['status']): string {
  switch (status) {
    case 'upcoming':
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-700';
    case 'completed':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'cancelled':
      return 'border-rose-200/80 bg-rose-50 text-rose-700';
    default:
      return 'border-luxury-gold/18 bg-surface-lowest text-on-surface';
  }
}

function getSectionLabel(status: TripCardData['status']): string {
  switch (status) {
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Trip';
  }
}

export default function TripCard({
  trip,
  onViewDetail,
  onManageBooking,
  onCheckIn,
}: TripCardProps) {
  const isUpcoming = trip.status === 'upcoming';

  return (
    <article
      className="glass-panel cursor-pointer overflow-hidden rounded-[24px] border border-luxury-gold/16 bg-white/96 shadow-[0_14px_32px_rgba(125,6,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-luxury-gold/28 hover:shadow-[0_18px_38px_rgba(125,6,51,0.09)]"
      onClick={() => onViewDetail(trip)}
    >
      <div className="flex flex-col gap-2 border-b border-luxury-gold/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-error">
          {getSectionLabel(trip.status)}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-bold text-on-surface">PNR: {trip.pnrCode}</span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${getStatusBadgeClass(trip.status)}`}
          >
            {trip.statusLabel}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-4.5">
        <div className="grid gap-3.5 lg:grid-cols-[88px_minmax(0,1fr)_168px] lg:items-center">
          <div className="flex h-[84px] w-[84px] flex-col items-center justify-center rounded-[18px] border border-luxury-gold/14 bg-surface-lowest text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <div className="text-[1.65rem] font-black leading-none text-on-surface">
              {trip.dateDay}
            </div>
            <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">
              {trip.dateMonth}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="font-headline text-[1.45rem] font-black tracking-tight text-on-surface sm:text-[1.55rem]">
              {trip.route}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-on-surface">
              <span className="font-medium">
                {trip.departureTime} - {trip.arrivalTime}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-luxury-gold/40 sm:inline-flex" />
              <span className="text-on-surface-variant">
                {trip.flightNumber} • {trip.cabin}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[13px] text-on-surface-variant">
              <div className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-midnight-burgundy/65" strokeWidth={1.9} />
                <span>
                  {trip.passengerCount}{' '}
                  {trip.passengerCount === 1 ? 'passenger' : 'passengers'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <CalendarDays
                  className="h-3.5 w-3.5 text-midnight-burgundy/65"
                  strokeWidth={1.9}
                />
                <span>{trip.date}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-luxury-gold/12 bg-surface-lowest px-3.5 py-3 text-left lg:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-midnight-burgundy/55">
              Payment
            </p>
            <p className="mt-1 text-[13px] text-on-surface-variant">{trip.paymentStatus}</p>
            <p className="mt-1.5 font-headline text-[1.35rem] font-black tracking-tight text-error sm:text-[1.45rem]">
              {trip.amount} {trip.currency}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-luxury-gold/10 pt-3.5">
          {isUpcoming ? (
            <div className="grid gap-2.5 md:grid-cols-2">
              <button
                type="button"
                disabled={!trip.canManageBooking}
                className="inline-flex min-h-10 items-center justify-center rounded-[16px] border border-luxury-gold/14 bg-white px-4 text-sm font-semibold text-on-surface transition hover:border-midnight-burgundy/30 hover:bg-surface-lowest hover:text-midnight-burgundy disabled:cursor-not-allowed disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!trip.canManageBooking || !onManageBooking) return;
                  onManageBooking(trip);
                }}
              >
                Manage booking
              </button>
              <button
                type="button"
                disabled={!trip.canCheckIn}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!trip.canCheckIn || !onCheckIn) return;
                  onCheckIn(trip);
                }}
              >
                <Plane className="h-3.5 w-3.5" strokeWidth={1.9} />
                <span>Check-in</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[16px] border border-luxury-gold/14 bg-white px-4 text-sm font-semibold text-on-surface transition hover:border-midnight-burgundy/30 hover:bg-surface-lowest hover:text-midnight-burgundy"
              onClick={(event) => {
                event.stopPropagation();
                onViewDetail(trip);
              }}
            >
              <span>View details</span>
              <ChevronRight className="h-4 w-4" strokeWidth={1.9} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
