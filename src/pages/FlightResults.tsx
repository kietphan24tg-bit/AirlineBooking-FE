import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import FlightResultCard from '../components/booking/FlightResultCard';
import type { FlightLeg } from '../types/flight.types';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import BookingStepper from '../components/booking/BookingStepper';

const MOCK_LEGS: FlightLeg[] = [
  {
    id: '1',
    flightNumber: 'SV-204',
    aircraft: 'Airbus A350-1000',
    airlineLabel: 'Sovereign Direct',
    departureCode: 'LHR',
    departureCity: 'London',
    departureTime: '08:45',
    arrivalCode: 'DXB',
    arrivalCity: 'Dubai',
    arrivalTime: '19:00',
    durationLabel: '7h 15m',
    direct: true,
    badge: 'Most Popular',
    cabinFares: [
      { cabin: 'Economy', priceLabel: '£482' },
      { cabin: 'Premium', priceLabel: '£1,150' },
      { cabin: 'Business', priceLabel: '£2,890', highlight: true },
      { cabin: 'First', priceLabel: '£4,850' },
    ],
  },
  {
    id: '2',
    flightNumber: 'SV-118',
    aircraft: 'Boeing 787-9',
    airlineLabel: 'Sovereign',
    departureCode: 'LHR',
    departureCity: 'London',
    departureTime: '14:20',
    arrivalCode: 'DXB',
    arrivalCity: 'Dubai',
    arrivalTime: '00:35',
    durationLabel: '8h 15m',
    direct: true,
    cabinFares: [
      { cabin: 'Economy', priceLabel: '£398' },
      { cabin: 'Premium', priceLabel: '£980' },
      { cabin: 'Business', priceLabel: '£2,450' },
      { cabin: 'First', priceLabel: '£4,200' },
    ],
  },
];

const summary = {
  routeTitle: 'London (LHR) to Dubai (DXB)',
  metaLine: '12 Oct 2024 • 1 Adult • All Cabin Classes',
};

export default function FlightResults() {
  const [sort, setSort] = useState('Recommended');

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-480 px-4 pb-20 pt-28 md:px-12">
        <BookingStepper current='search' />
        <div className="mb-8 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div>
            <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-on-surface">
              {summary.routeTitle}
            </h1>
            <p className="font-medium text-on-surface-variant">{summary.metaLine}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Sort by:
            </span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="cursor-pointer appearance-none rounded-xl border-none bg-surface-container-lowest py-3 pl-6 pr-10 text-sm font-bold text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-secondary-fixed"
              >
                <option>Recommended</option>
                <option>Cheapest</option>
                <option>Fastest</option>
                <option>Best Experience</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <aside className="space-y-8 lg:col-span-3">
            <div className="sticky top-28 rounded-xl border border-surface-variant/30 bg-surface-container-low/90 p-8 backdrop-blur-sm">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-on-surface">
                Filters
              </h3>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Stops
                </span>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="stops"
                    defaultChecked
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    No Preference
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="stops"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Direct only
                  </span>
                </label>
              </div>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Departure Time
                </span>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="departure-time"
                    defaultChecked
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    No Preference
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="departure-time"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Morning (5am - 12pm)
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="departure-time"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Afternoon (12pm - 6pm)
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="departure-time"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Evening (6pm - 12am)
                  </span>
                </label>
              </div>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Arrival Time
                </span>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="arrival-time"
                    defaultChecked
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    No Preference
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="arrival-time"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Morning (5am - 12pm)
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="arrival-time"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Afternoon (12pm - 6pm)
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="arrival-time"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Evening (6pm - 12am)
                  </span>
                </label>
              </div>
              <div className="mb-8">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Cabin Class
                </span>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="cabin-class"
                    defaultChecked
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    No Preference
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="cabin-class"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Economy
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="cabin-class"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Premium
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="cabin-class"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    Business
                  </span>
                </label>
                <label className="group mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="cabin-class"
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    First
                  </span>
                </label>
              </div>
              <div className="mb-8">
                <div className="mb-4 flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Price Range
                  </span>
                  <span className="text-xs font-bold text-secondary">Up to £4,850</span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={6000}
                  defaultValue={4850}
                  className="h-1.5 w-full cursor-pointer accent-primary"
                />
              </div>
            </div>
          </aside>
          <div className="space-y-8 lg:col-span-9">
            {MOCK_LEGS.map((leg) => (
              <FlightResultCard key={leg.id} leg={leg} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
