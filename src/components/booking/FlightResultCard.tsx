import { Plane, PlaneTakeoff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FlightLeg } from '../../types/flight.types';

export interface FlightResultCardProps {
  leg: FlightLeg;
}

export default function FlightResultCard({ leg }: FlightResultCardProps) {
  return (
    <div className="group/card flex flex-col overflow-hidden rounded-xl border border-surface-container-high bg-surface-container-lowest/90 shadow-sm backdrop-blur-sm transition-all duration-500 hover:shadow-xl">
      <div className="p-8 pb-4">
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <div className="w-full flex-1">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary">
                  <PlaneTakeoff className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {leg.airlineLabel}
                  </span>
                  <h4 className="text-lg font-bold uppercase leading-tight tracking-tight">
                    {leg.flightNumber} • {leg.aircraft}
                  </h4>
                </div>
              </div>
              {leg.badge ? (
                <span className="rounded-full bg-secondary-fixed px-4 py-1 text-[10px] font-black uppercase tracking-widest text-on-secondary-fixed">
                  {leg.badge}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <span className="text-3xl font-black text-on-surface">{leg.departureTime}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {leg.departureCode} {leg.departureCity}
                </span>
              </div>
              <div className="relative flex flex-1 flex-col items-center px-4">
                <span className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                  {leg.durationLabel}
                  {leg.direct ? ' Direct' : ''}
                </span>
                <div className="relative h-px w-full bg-outline-variant">
                  <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest px-2 text-secondary">
                    <Plane className="h-4 w-4 rotate-90" strokeWidth={1.75} />
                  </span>
                </div>
              </div>
              <div className="text-center md:text-right">
                <span className="text-3xl font-black text-on-surface">{leg.arrivalTime}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {leg.arrivalCode} {leg.arrivalCity}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-0 divide-y border-t border-surface-container-high md:grid-cols-4 md:divide-x md:divide-y-0">
        {leg.cabinFares.map((c) => (
          <div
            key={c.cabin}
            className={`flex flex-col justify-between p-4 transition-colors hover:bg-surface-container-low/30 ${
              c.highlight ? 'ring-1 ring-secondary/20' : ''
            }`}
          >
            <div className="mb-4">
              <span
                className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                  c.cabin === 'Economy'
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
              <div className="mt-1 text-xl font-black text-on-surface">{c.priceLabel}</div>
            </div>
            <Link
              to="/booking/passengers"
              className="w-full rounded bg-surface-container-highest py-2 text-center text-[9px] font-black uppercase tracking-widest transition-colors hover:bg-surface-variant"
            >
              Select
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
