import { CalendarCheck, MapPin, Plane } from 'lucide-react';

type AccountStatCardsProps = {
  completedTrips: number;
  upcomingTrips: number;
  frequentAirports: number;
  loading?: boolean;
};

type StatConfig = {
  label: string;
  value: number;
  icon: typeof Plane;
};

function StatCard({ label, value, icon: Icon, loading }: StatConfig & { loading?: boolean }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[20px] border border-luxury-gold/16 bg-surface-lowest p-5 shadow-[0_14px_32px_rgba(125,6,51,0.06)]">
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-primary/7 text-primary">
        <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
      </div>
      <div>
        <p className="font-headline text-[26px] font-black leading-none text-dark-charcoal">
          {loading ? '—' : value}
        </p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant/80">
          {label}
        </p>
      </div>
    </div>
  );
}

export default function AccountStatCards({
  completedTrips,
  upcomingTrips,
  frequentAirports,
  loading,
}: AccountStatCardsProps) {
  const stats: StatConfig[] = [
    { label: 'Flights flown', value: completedTrips, icon: Plane },
    { label: 'Upcoming flights', value: upcomingTrips, icon: CalendarCheck },
    { label: 'Frequent airports', value: frequentAirports, icon: MapPin },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} loading={loading} />
      ))}
    </div>
  );
}
