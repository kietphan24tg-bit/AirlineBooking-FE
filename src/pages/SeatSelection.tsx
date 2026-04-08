import { Link } from 'react-router-dom';
import { Armchair } from 'lucide-react';
import AmbientSweep from '../components/layout/AmbientSweep';
import MarketingNav from '../components/layout/MarketingNav';
import Button from '../components/ui/Button';
import type { PassengerProfile } from '../types/booking.types';

const MOCK_PASSENGERS: PassengerProfile[] = [
  { id: '1', fullName: 'Arthur Wellesley', seat: '2A' },
  { id: '2', fullName: 'Jane Austen', seat: undefined },
];

const SEAT_ROWS = ['A', 'B', 'C', '', 'D', 'E', 'F'] as const;
const SEAT_NUMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function SeatCell({ id, taken }: { id: string; taken?: boolean }) {
  if (id === '') {
    return <div className="w-10" />;
  }
  return (
    <button
      type="button"
      disabled={taken}
      className={`flex h-10 w-10 items-center justify-center rounded-md text-[10px] font-bold transition-all ${
        taken
          ? 'cursor-not-allowed bg-surface-container-high text-on-surface-variant/50'
          : 'border border-luxury-gold/30 bg-surface-container-lowest text-midnight-burgundy hover:border-midnight-burgundy hover:bg-midnight-burgundy/5'
      }`}
    >
      {id}
    </button>
  );
}

export default function SeatSelection() {
  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <MarketingNav active="manage" />
      <main className="relative z-10 mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-6 pb-16 pt-24 lg:grid-cols-12 lg:px-12">
        <div className="mb-8 flex flex-col space-y-6 lg:col-span-8 lg:mb-0">
          <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-6 shadow-sm backdrop-blur-md">
            <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-secondary">
              Select Passenger
            </p>
            <div className="flex flex-wrap gap-4">
              {MOCK_PASSENGERS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`flex items-center space-x-3 rounded-lg border-2 px-6 py-3 ${
                    idx === 0
                      ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                      : 'border-transparent bg-surface-container-low hover:border-luxury-gold/30'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight-burgundy text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-none text-midnight-burgundy">
                      {p.fullName}
                    </p>
                    {p.seat ? (
                      <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-tighter text-luxury-gold">
                        Seat: {p.seat}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-xl font-black text-midnight-burgundy">
                Cabin layout
              </h2>
              <Armchair className="h-6 w-6 text-luxury-gold" strokeWidth={1.5} />
            </div>
            <div className="seat-map-container max-h-[420px] overflow-auto rounded-lg bg-surface-container-low p-4">
              <div className="mx-auto flex max-w-md flex-col gap-2">
                <div className="mb-4 rounded-lg bg-midnight-burgundy/10 py-2 text-center text-xs font-bold uppercase tracking-widest text-midnight-burgundy">
                  First — Forward
                </div>
                {SEAT_NUMS.map((row) => (
                  <div key={row} className="flex items-center justify-center gap-2">
                    <span className="w-6 text-center text-xs text-on-surface-variant">{row}</span>
                    {SEAT_ROWS.map((col, i) => {
                      const label = col ? `${row}${col}` : '';
                      const taken = label === '1A' || label === '1B';
                      return <SeatCell key={`${row}-${i}`} id={label} taken={taken || false} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-28 rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-6 shadow-lg">
            <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Tóm tắt</h3>
            <p className="text-sm text-on-surface-variant">London → Dubai • SV-204</p>
            <p className="mt-6 text-2xl font-black text-secondary">£2,890</p>
            <p className="text-xs text-on-surface-variant">Business • 1 khách</p>
            <div className="mt-8 space-y-3">
              <Button type="button" className="w-full">
                Xác nhận ghế
              </Button>
              <Link
                to="/home"
                className="block w-full rounded-md border border-outline-variant/30 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Hủy
              </Link>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
