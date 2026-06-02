import { MapPin } from 'lucide-react';
import type { Airport } from '../../services/airport.service';

type AccountRecentAirportsCardProps = {
  airports: Airport[];
  loading?: boolean;
};

export default function AccountRecentAirportsCard({
  airports,
  loading,
}: AccountRecentAirportsCardProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-luxury-gold/16 bg-surface-lowest shadow-[0_14px_32px_rgba(125,6,51,0.06)]">
      <div className="flex items-center gap-3 border-b border-luxury-gold/16 px-6 py-5 sm:px-7">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-primary/7 text-primary">
          <MapPin className="h-[19px] w-[19px]" strokeWidth={2} />
        </div>
        <div>
          <h2 className="font-headline text-[17px] font-bold text-dark-charcoal">
            Frequent airports
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant/80">
            Suggestions based on your search and booking history.
          </p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-7 sm:py-7">
        {loading ? (
          <p className="text-sm text-on-surface-variant/80">Loading...</p>
        ) : airports.length === 0 ? (
          <p className="text-sm italic text-on-surface-variant/80">
            No airports in your search history yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {airports.map((airport) => (
              <div
                key={airport.id}
                className="inline-flex items-center gap-2 rounded-[14px] border border-luxury-gold/16 bg-surface px-3.5 py-2 text-[13px] font-medium text-dark-charcoal"
              >
                <MapPin className="h-[15px] w-[15px] text-luxury-gold" strokeWidth={2} />
                <span className="font-headline font-bold text-primary">{airport.code}</span>
                <span>{airport.city || airport.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
