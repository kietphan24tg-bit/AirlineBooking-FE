import { Check, Plane, PlaneTakeoff } from 'lucide-react';
import type { FlightLeg } from '../../types/flight.types';

export interface FlightResultCardProps {
  leg: FlightLeg;
  pendingFareKey?: string | null;
  onSelectFare?: (payload: { leg: FlightLeg; fareId: number; fareKey: string }) => void;
}

export default function FlightResultCard({
  leg,
  pendingFareKey = null,
  onSelectFare,
}: FlightResultCardProps) {
  const subtitle = leg.aircraft.trim()
    ? `${leg.flightNumber} \u2022 ${leg.aircraft}`
    : leg.flightNumber;

  return (
    <div className="group/card flex flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest/90 shadow-sm backdrop-blur-sm transition-all duration-500 hover:shadow-xl">
      <div className="p-4 pb-5 sm:p-6 lg:p-8 lg:pb-5">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary sm:h-12 sm:w-12">
                <PlaneTakeoff className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {leg.airlineLabel}
                </span>
                <h4 className="text-base font-bold uppercase leading-tight tracking-tight text-on-surface sm:text-lg">
                  {subtitle}
                </h4>
              </div>
            </div>

            {leg.badge ? (
              <span className="w-fit rounded-full bg-secondary-fixed px-4 py-1 text-[10px] font-black uppercase tracking-widest text-on-secondary-fixed">
                {leg.badge}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(180px,1.3fr)_minmax(0,1fr)] md:items-center md:gap-4">
            <div className="text-left md:text-left">
              <span className="text-3xl font-black text-on-surface sm:text-4xl">
                {leg.departureTime}
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-[11px]">
                {leg.departureCode} {leg.departureCity}
              </span>
            </div>

            <div className="relative flex min-w-0 flex-col items-start md:items-center">
              <span className="mb-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant md:text-center">
                {leg.durationLabel}
                {leg.direct ? ' Direct' : ''}
              </span>
              <div className="relative h-px w-full bg-outline-variant">
                <span className="absolute left-8 top-1/2 flex -translate-y-1/2 bg-surface-container-lowest px-2 text-secondary md:left-1/2 md:-translate-x-1/2">
                  <Plane className="h-4 w-4 rotate-90" strokeWidth={1.75} />
                </span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="text-3xl font-black text-on-surface sm:text-4xl">
                {leg.arrivalTime}
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-[11px]">
                {leg.arrivalCode} {leg.arrivalCity}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-surface-container-high border-t border-surface-container-high sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {leg.cabinFares.map((c) => (
          <div key={c.cabin} className="flex h-full flex-col">
            <div
              className={`flex h-full flex-col justify-between p-4 transition-colors lg:p-5 ${
                c.selectable
                  ? 'cursor-pointer hover:bg-surface-container-low/30'
                  : 'border-b border-dashed border-outline-variant/70 bg-surface-container-high/80'
              } ${c.highlight && c.selectable ? 'ring-1 ring-secondary/20' : ''} ${
                !c.selectable
                  ? 'text-on-surface-variant'
                  : c.cabin === 'Economy'
                    ? 'bg-white/10'
                    : c.cabin === 'Premium'
                      ? 'bg-cabin-silver/10'
                      : c.cabin === 'Business'
                        ? 'bg-luxury-gold/10'
                        : 'bg-cabin-burgundy/5'
              }`}
            >
              <div className="mb-4">
                <span
                  className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                    !c.selectable
                      ? 'text-on-surface-variant/80'
                      : c.cabin === 'Economy'
                        ? 'text-cabin-bronze'
                        : c.cabin === 'Premium'
                          ? 'text-on-surface-variant/70'
                          : c.cabin === 'Business'
                            ? 'text-secondary'
                            : 'text-cabin-burgundy'
                  }`}
                >
                  {c.cabin}
                </span>
                <div
                  className={`mt-1 text-2xl font-black leading-none ${
                    c.selectable ? 'text-on-surface' : 'text-on-surface-variant/90'
                  }`}
                >
                  {c.finalPriceLabel}
                </div>
                {c.hasDiscount ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface-variant line-through">
                      {c.originalPriceLabel}
                    </span>
                    <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
                      {c.discountPercent != null && c.discountPercent > 0
                        ? `-${c.discountPercent}%`
                        : `Save ${c.discountAmountLabel}`}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={`flex flex-1 flex-col border-t border-surface-container-high p-4 lg:p-5 ${
                c.selectable
                  ? 'bg-surface-container-low/50'
                  : 'bg-surface-container-high/40 text-on-surface-variant'
              }`}
            >
              <h5
                className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${
                  c.selectable ? 'text-on-surface' : 'text-on-surface-variant/90'
                }`}
              >
                Included Benefits
              </h5>
              <ul className="mb-4 space-y-2">
                {c.benefits.length === 0 ? (
                  <li className="text-[12px] text-on-surface-variant">
                    See fare rules for details.
                  </li>
                ) : (
                  c.benefits.map((benefit, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-2 text-[12px] ${
                        c.selectable ? 'text-on-surface-variant' : 'text-on-surface-variant/80'
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-3 w-3 shrink-0 ${
                          c.selectable ? 'text-luxury-gold' : 'text-outline'
                        }`}
                        strokeWidth={3}
                      />
                      <span>{benefit}</span>
                    </li>
                  ))
                )}
              </ul>

              {c.selectable && c.fareId != null ? (
                <button
                  type="button"
                  disabled={pendingFareKey != null}
                  onClick={() =>
                    onSelectFare?.({
                      leg,
                      fareId: c.fareId as number,
                      fareKey: `${leg.id}:${c.fareId}`,
                    })
                  }
                  className="mt-auto w-full rounded-xl bg-surface-container-highest py-3 text-center text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-surface-variant disabled:cursor-wait disabled:opacity-70"
                >
                  {pendingFareKey === `${leg.id}:${c.fareId}` ? 'Checking fare...' : 'Select'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-auto w-full cursor-not-allowed rounded-xl bg-surface-container-high py-3 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70"
                >
                  Unavailable
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
