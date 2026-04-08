import { Link } from 'react-router-dom';
import type { TripRecord } from '../types/booking.types';

const MOCK_TRIPS: TripRecord[] = [
  {
    id: 't1',
    route: 'SGN → NRT',
    dateLabel: '12 Mar 2025',
    status: 'confirmed',
    cabin: 'Business',
  },
  {
    id: 't2',
    route: 'HAN → CDG',
    dateLabel: '03 Jan 2025',
    status: 'completed',
    cabin: 'First',
  },
  {
    id: 't3',
    route: 'DAD → SIN',
    dateLabel: '18 Dec 2024',
    status: 'cancelled',
    cabin: 'Economy',
  },
];

function statusStyle(s: TripRecord['status']) {
  if (s === 'confirmed') return 'bg-secondary/15 text-secondary';
  if (s === 'cancelled') return 'bg-error/10 text-error';
  if (s === 'completed') return 'bg-surface-container-high text-on-surface-variant';
  return 'bg-surface-container-high text-on-surface-variant';
}

export default function TripHistory() {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant/10 bg-primary px-8 py-0">
        <Link to="/home" className="font-headline text-2xl font-black tracking-tight text-white">
          The Sovereign
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link
            to="/flights"
            className="border-b-2 border-secondary-fixed pb-1 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-white"
          >
            Book
          </Link>
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-white/80">
            Explore
          </span>
        </div>
        <Link
          to="/login"
          className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-secondary-fixed hover:text-white"
        >
          Sign In
        </Link>
      </nav>
      <main className="relative mx-auto max-w-4xl px-6 pt-28 pb-16">
        <div className="pointer-events-none absolute inset-0 opacity-15">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #ffdf9e 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="relative z-10">
          <h1 className="mb-2 font-headline text-3xl font-black text-on-surface">Lịch sử đặt vé</h1>
          <p className="mb-10 text-on-surface-variant">Theo dõi các chuyến đã đặt và trạng thái.</p>
          <ul className="space-y-4">
            {MOCK_TRIPS.map((trip) => (
              <li
                key={trip.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center"
              >
                <div>
                  <p className="font-headline text-lg font-bold text-on-surface">{trip.route}</p>
                  <p className="text-sm text-on-surface-variant">
                    {trip.dateLabel}
                    {trip.cabin ? ` • ${trip.cabin}` : ''}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest ${statusStyle(trip.status)}`}
                >
                  {trip.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
