import {
  ArrowRight,
  Calendar,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Sparkles,
  MoveRight,
  User,
  UtensilsCrossed,
  Headset,
  RotateCcw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Select from 'react-select';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';

//const HERO_WING = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhbnWHSXyZEIc2WLBnhOd8qPY45Y8JYORsa-L0oq7JPRn9I4oA9_W7OkkNhMz9zF8JD3bicGF4GrcM506MBeGkuKj4o9A6fHVkHaAMgcqxRr2xqWTzrWEdOFtljcl0_8qdOxagUmxX_oTMFP_3N2YaRyH0RGeVAXtvJvdRu6KhMFIrrcWTVzmVFSeaeNi7vqxkms17m4cZWkdLwWtdz1zZ17qMDCUZ_3_1otxOuya4kNUb_BN5Wc7E4sM56D5JgO3fZytmZtSOOyJU';

const AIRPORTS = [
  { value: 'LHR', label: 'London (LHR)' },
  { value: 'DXB', label: 'Dubai (DXB)' },
  { value: 'CDG', label: 'Paris (CDG)' },
  { value: 'NRT', label: 'Tokyo (NRT)' },
  { value: 'JFK', label: 'New York (JFK)' },
  { value: 'LAX', label: 'Los Angeles (LAX)' },
  { value: 'SFO', label: 'San Francisco (SFO)' },
  { value: 'HKG', label: 'Hong Kong (HKG)' },
  { value: 'SIN', label: 'Singapore (SIN)' },
  { value: 'BKK', label: 'Bangkok (BKK)' },
];

const TRAVELERS = [
  { value: '1', label: '1 Adult' },
  { value: '2', label: '2 Adults' },
  { value: '3', label: '3 Adults' },
  { value: '1-1', label: '1 Adult, 1 Child' },
  { value: '2-1', label: '2 Adults, 1 Child' },
  { value: '2-2', label: '2 Adults, 2 Children' },
  { value: '1-1-1', label: '1 Adult, 1 Child, 1 Infant' },
];

const destinations = [
  {
    tag: 'TRENDING',
    tagClass: 'bg-midnight-burgundy text-luxury-gold',
    city: 'Dubai',
    line: 'From $1,240 | First Class Experience',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzQoRszQ9DoYWqrmkICRM_5R6URZXKVjMsaosolUgHNilP8s5srYmEPnNXXBAPikFHweburezdnp1Z94bpBFM7TBcfeHKjeMNUfdqUgpD250iLKxHouuXEHRH5vSdk9MmR-99-COmPExlTcMfWiym3-b9z9mEYntXklDSt265R2qmcYwluquIBakeFin-WyilQvHpz9tTZUNCw83Br2bsGIq3_63Rj_g1H9xulMmpBe6chtogNz7g4N77Q2YM6Q_4lgDb6Ppp36bop',
    offset: '',
  },
  {
    tag: 'FEATURED',
    tagClass: 'bg-luxury-gold text-midnight-burgundy',
    city: 'Paris',
    line: 'From $980 | Cultural Elegance',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGJCt58g5Q3lJDwA8yHseLk4ECQqDj8JwZtvA3ub7MIh3sFCnqMKvFmEU93nt0fnkqRlGTMXucg2alHD-bssfl3pnBJGsLUvSJf2ziz1xk5QXAnFzjFd_I2sTyQAIDsUKSL0J8D3Rr9pm4M717Ts3krl_V_cdhkB2xarlNhsjRpwtXWs5fhZoVv8PD7mpgGhUNohZ1oX67E5we99w4MdsvY73zBGUl2bXjj9N9bPse7uDjM_scP87xFnl7YyQnYexRjC8U5WUz37FD',
    offset: 'md:-translate-y-8',
  },
  {
    tag: 'LIMITED',
    tagClass: 'bg-midnight-burgundy text-luxury-gold',
    city: 'Tokyo',
    line: 'From $1,560 | Urban Sophistication',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmSdCW-K2plV9pnsU7pJS-1INqVfmROXBQGkU-LLL4aOhQ62VnWMUqAVXilhgQSAI6DWZuvDZ3PjI32_XeWOLCy9HihdXoNGpiFrKPWlMm6cWeA_k_HICKIc18PkmRNABDcoHhwo3n8SQVqSU1NfcHNZxUiXtuj07yPsrh2tpJW1UashVTXXjXe-JoOVjehMnKISgiVO87usxTH_G4XxEFalM59OaESVoGglNSj4FroDwEfMBsq0TTOZf3UmbB-S3anh2EFDBbAw6U',
    offset: '',
  },
];

const BANNER_SUITE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PIrZqKqBOtsY76vWhimpUUlYthHM4y8zXe5e86W9R3JOSoVuyVdG5jLy-9XzNeh0csUNmMGRt1W3uyTrrHXnUScKQQrmKEmgj82-slcm4Y9RGYse7U7bbQ_aA4EVIr_x6_tDglJHOhU1KWXQpJcEKBRX5QN7c5ch24nFs2RNda4O47SK-NcJyuLklQzGsa-oubeIJxP8ElytxX1ZV1EHUCS_FJgUg8Q0I5oe88Zt91sZNupuXXqReEwWT5-Zxjs10dEIYXsmWOAG';
const LOUNGE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCsUmrFTguffDPAip5caMzo-6w8SGik8CYxr5xZYpSrT0PGYy3FAlhkZYgdVbEZgWk1ylqMlVK3-kJcsIfyfzmLA7GAs3d_n-bsMcPm9z2vK3uoPuIHuuQ3A8Is7GtSbD4Bmlwq3VF-lpp_b9fICXSL53eOcsfcIdUTtlQePXn6yQxK5nZm2wM_wymmKZShM72nVOyNqVUEfmszVbsI2XpJ4uHIZUUBa_ny2_oEKQlYCj29ck3vKmz9-TrlgFSLUHygfklssHwC-nW6';
const TAIL_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDGid7JcZ9bpqlgE2oSAlcjguLckow2RBVAa_jYKWWVC7LecTproe0o3KrEwqVs4N_npAHgJH6IVIKYN6ZJuwdxjamXoIc4fkfrKvqSVLI3Vj3GKlrvPn2nWadx-BYGvODXykTTcwyYMZEVzp7EadmLX3WDFGGq91L0pBpjrH5P4dNjYup3fqJ3FR6kJ2d7bb-VL8_6kmEmVVh5CIZxhsUoOUxk5L-XjxXN8nMirmO4um3DE8TdCWge8R-zMOVVlsccuEk5-SSYakdh';

export default function Landing() {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [from, setFrom] = useState<{ value: string; label: string } | null>({
    value: 'LHR',
    label: 'London (LHR)',
  });
  const [to, setTo] = useState<{ value: string; label: string } | null>({
    value: 'DXB',
    label: 'Dubai (DXB)',
  });
  const [departDate, setDepartDate] = useState('2024-10-24');
  const [returnDate, setReturnDate] = useState('2024-11-01');
  const [travelers, setTravelers] = useState<{ value: string; label: string } | null>({
    value: '2',
    label: '2 Adults',
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !from ||
      !to ||
      !departDate ||
      (tripType === 'round-trip' && !returnDate) ||
      !travelers ||
      returnDate < departDate
    ) {
      alert('Please fill in all required fields');
      return;
    }

    //finding flight results
    navigate('/flights');
  };

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      border: 'none',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      padding: 0,
    }),
    singleValue: (base: any) => ({
      ...base,
      color: '#1a1a2e',
      fontSize: '1.125rem',
      fontWeight: 700,
    }),
    input: (base: any) => ({
      ...base,
      color: '#1a1a2e',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'rgba(26, 26, 46, 0.4)',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#1a1a2e' : state.isFocused ? '#f5f5f5' : 'white',
      color: state.isSelected ? '#f4e4d6' : '#1a1a2e',
      cursor: 'pointer',
    }),
    menu: (base: any) => ({
      ...base,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    }),
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased">
      <MarketingNav active="book" />
      <main>
        <section className="relative flex min-h-175 w-full items-center overflow-hidden md:h-280">
          <div className="absolute inset-0 z-0">
            <img alt="" src="/src/assets/sky.jpg" className="h-full w-full object-cover" />
            <img
              alt="clouds"
              src="/src/assets/cloud.png"
              className="absolute inset-0 opacity-0 w-full object-cover animate-clouds"
            />
            <img
              alt="clouds"
              src="/src/assets/cloud.png"
              className="absolute inset-0 opacity-0 w-full object-cover animate-clouds delay-5"
            />
            <img
              alt="clouds"
              src="/src/assets/cloud.png"
              className="absolute inset-0 opacity-0 w-full object-cover animate-clouds delay-15"
            />
            <img
              alt="plane"
              src="/src/assets/plane.png"
              className="absolute inset-0 h-full w-full object-cover animate-fly-in"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/25 to-white/20" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-480 px-6 md:px-20">
            <div className="mb-20 max-w-4xl">
              <h1 className="mb-6 font-headline text-5xl font-black leading-[0.9] tracking-tighter text-white md:text-8xl drop-shadow-xl">
                REDEFINING <br />
                THE <span className="text-luxury-gold">EXCEPTIONAL</span>
              </h1>
              <p className="max-w-xl text-xl font-medium tracking-wide text-white drop-shadow-xl">
                Journey beyond expectation. Experience the pinnacle of international travel with
                bespoke service and uncompromised luxury.
              </p>
            </div>
            <form
              onSubmit={onSearch}
              className="glass-panel max-w-400 rounded-xl border border-luxury-gold/20 p-1 shadow-2xl"
            >
              {/* Trip Type Toggle */}
              <div className="flex items-center gap-4 border-b border-luxury-gold/10 p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    value="one-way"
                    checked={tripType === 'one-way'}
                    onChange={(e) => setTripType(e.target.value as 'one-way' | 'round-trip')}
                    className="cursor-pointer"
                  />
                  <span className="font-headline font-bold text-midnight-burgundy">One-Way</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    value="round-trip"
                    checked={tripType === 'round-trip'}
                    onChange={(e) => setTripType(e.target.value as 'one-way' | 'round-trip')}
                    className="cursor-pointer"
                  />
                  <span className="font-headline font-bold text-midnight-burgundy">Round-Trip</span>
                </label>
              </div>

              {/* Search Form Grid */}
              <div
                className={`grid gap-1 p-4 ${
                  tripType === 'round-trip'
                    ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6'
                    : 'grid-cols-1 divide-y divide-luxury-gold/10 md:grid-cols-4 md:divide-x md:divide-y-0 lg:grid-cols-5'
                }`}
              >
                {/* From */}
                <div className="space-y-1 p-4">
                  <label
                    htmlFor="from"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    From
                  </label>
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff
                      className="h-5 w-5 shrink-0 text-midnight-burgundy"
                      strokeWidth={1.75}
                    />
                    <Select
                      value={from}
                      onChange={setFrom}
                      options={AIRPORTS}
                      styles={customSelectStyles}
                      isSearchable
                      isClearable={false}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* To */}
                <div className="space-y-1 p-4">
                  <label
                    htmlFor="to"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    To
                  </label>
                  <div className="flex items-center gap-2">
                    <PlaneLanding
                      className="h-5 w-5 shrink-0 text-midnight-burgundy"
                      strokeWidth={1.75}
                    />
                    <Select
                      value={to}
                      onChange={setTo}
                      options={AIRPORTS}
                      styles={customSelectStyles}
                      isSearchable
                      isClearable={false}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Depart Date */}
                <div className="space-y-1 p-4">
                  <label
                    htmlFor="depart-date"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    {tripType === 'round-trip' ? 'Depart' : 'Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="h-5 w-5 shrink-0 text-midnight-burgundy"
                      strokeWidth={1.75}
                    />
                    <input
                      id="depart-date"
                      type="date"
                      value={departDate}
                      onChange={(e) => setDepartDate(e.target.value)}
                      className="w-full border-none bg-transparent p-0 font-headline text-lg font-bold text-midnight-burgundy focus:ring-0"
                    />
                  </div>
                </div>

                {/* Return Date (only for round-trip) */}
                {tripType === 'round-trip' && (
                  <div className="space-y-1 p-4">
                    <label
                      htmlFor="return-date"
                      className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                    >
                      Return
                    </label>
                    <div className="flex items-center gap-2">
                      <RotateCcw
                        className="h-5 w-5 shrink-0 text-midnight-burgundy"
                        strokeWidth={1.75}
                      />
                      <input
                        id="return-date"
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full border-none bg-transparent p-0 font-headline text-lg font-bold text-midnight-burgundy focus:ring-0"
                      />
                    </div>
                  </div>
                )}

                {/* Travelers */}
                <div className="space-y-1 p-4">
                  <label
                    htmlFor="travelers"
                    className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                  >
                    Travelers
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 shrink-0 text-midnight-burgundy" strokeWidth={1.75} />
                    <Select
                      value={travelers}
                      onChange={setTravelers}
                      options={TRAVELERS}
                      styles={customSelectStyles}
                      isSearchable={false}
                      isClearable={false}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center p-2 md:p-1">
                  <button
                    type="submit"
                    className="flex h-full w-full items-center justify-center gap-2 rounded-lg bg-midnight-burgundy py-4 font-headline font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-95"
                  >
                    SEARCH FLIGHTS
                    <ArrowRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="relative px-6 py-24 md:px-20">
          <div className="relative z-10 mx-auto max-w-480">
            <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="font-label mb-4 block font-extrabold tracking-[0.2em] text-midnight-burgundy">
                  CURATED COLLECTIONS
                </span>
                <h2 className="font-headline text-5xl font-black tracking-tighter text-on-surface">
                  Bespoke Destinations
                </h2>
              </div>
              <Link
                to="/flights"
                className="group flex items-center gap-2 font-headline font-bold text-midnight-burgundy"
              >
                VIEW ALL DESTINATIONS
                <MoveRight
                  className="transition-transform group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {destinations.map((d) => (
                <div
                  key={d.city}
                  className={`group relative aspect-3/4 overflow-hidden rounded-xl border border-luxury-gold/10 bg-surface-container-low shadow-sm ${d.offset}`}
                >
                  <img
                    alt=""
                    src={d.img}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="destination-overlay absolute inset-0" />
                  <div className="absolute bottom-0 left-0 w-full p-8">
                    <span
                      className={`mb-3 inline-block px-3 py-1 text-[0.65rem] font-bold tracking-widest ${d.tagClass}`}
                    >
                      {d.tag}
                    </span>
                    <h3 className="mb-2 font-headline text-3xl font-black text-white">{d.city}</h3>
                    <p className="mb-6 font-medium text-white/70">{d.line}</p>
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-luxury-gold text-midnight-burgundy shadow-lg transition-colors hover:brightness-110"
                      aria-label={`Explore ${d.city}`}
                    >
                      <Plus className="h-6 w-6" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-480 px-6 py-12 md:px-20">
          <div className="grid h-auto grid-cols-1 gap-6 lg:h-125 lg:grid-cols-12">
            <div className="relative overflow-hidden rounded-xl border border-luxury-gold/10 shadow-lg lg:col-span-8">
              <img
                alt=""
                src={BANNER_SUITE}
                className="h-full min-h-70 w-full object-cover lg:min-h-0"
              />
              <div className="absolute inset-0 flex flex-col justify-center bg-linear-to-r from-black/80 via-black/40 to-transparent p-8 md:p-12">
                <span className="font-label mb-4 font-black tracking-widest text-luxury-gold">
                  THE BUSINESS CLASS REDEFINED
                </span>
                <h3 className="mb-6 max-w-lg font-headline text-4xl font-black leading-tight text-white md:text-5xl">
                  Work, Relax, <br />
                  And Arrive Inspired.
                </h3>
                <p className="mb-8 max-w-md font-medium text-white/80">
                  Experience our new suites with fully flat beds, artisanal dining, and exclusive
                  onboard connectivity.
                </p>
                <button
                  type="button"
                  className="w-fit rounded-lg bg-luxury-gold px-8 py-4 font-headline font-bold text-midnight-burgundy transition-all hover:brightness-110"
                >
                  DISCOVER THE SUITE
                </button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-luxury-gold/20 bg-midnight-burgundy shadow-lg lg:col-span-4">
              <div className="absolute inset-0 opacity-20">
                <img alt="" src={LOUNGE_IMG} className="h-full w-full object-cover" />
              </div>
              <div className="relative z-10 flex h-full min-h-80 flex-col p-10 lg:min-h-0">
                <Sparkles className="mb-6 h-12 w-12 text-luxury-gold" strokeWidth={1.25} />
                <h3 className="mb-4 font-headline text-3xl font-black uppercase tracking-tight text-white">
                  The Sovereign Platinum Lounge
                </h3>
                <p className="mb-auto font-medium text-white/80">
                  Your journey starts long before takeoff. Enjoy sanctuary in our award-winning
                  global lounges.
                </p>
                <Link
                  to="/flights"
                  className="group mt-8 inline-flex w-fit items-center gap-2 border-b-2 border-luxury-gold pb-1 font-bold tracking-wide text-luxury-gold"
                >
                  EXPLORE BENEFITS
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-12 overflow-hidden bg-surface-container-low py-24">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <svg
              className="h-full w-full stroke-luxury-gold"
              preserveAspectRatio="none"
              viewBox="0 0 1000 1000"
            >
              <path
                d="M1050,50 C800,150 600,100 400,400 C200,700 100,900 -100,950"
                fill="none"
                strokeWidth="0.75"
                opacity={0.1}
              />
            </svg>
          </div>
          <div className="relative z-10 mx-auto grid max-w-480 grid-cols-1 items-center gap-20 px-6 md:grid-cols-2 md:px-20">
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-2xl border border-luxury-gold/10 shadow-2xl">
                <img alt="" src={TAIL_IMG} className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-10 -right-10 hidden max-w-xs rounded-xl border-l-4 border-luxury-gold bg-white p-8 shadow-xl lg:block">
                <p className="mb-2 font-headline text-2xl font-bold italic text-midnight-burgundy">
                  &quot;Unmatched service that feels entirely personal.&quot;
                </p>
                <p className="font-medium text-on-surface-variant">— Condé Nast Traveler</p>
              </div>
            </div>
            <div>
              <span className="font-label mb-4 block font-extrabold tracking-[0.2em] text-midnight-burgundy">
                THE SOVEREIGN DIFFERENCE
              </span>
              <h2 className="mb-8 font-headline text-5xl font-black tracking-tighter text-on-surface">
                Elevating Every <br />
                Altitude
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-on-surface-variant">
                From the moment you arrive at the airport to your final destination, The Sovereign
                provides a seamless flow of luxury. We don&apos;t just transport you; we curate an
                environment of tranquility and excellence.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-headline text-lg font-bold text-midnight-burgundy">
                    <UtensilsCrossed className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    Gourmet Dining
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    Menus crafted by Michelin-starred chefs using seasonal ingredients.
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-headline text-lg font-bold text-midnight-burgundy">
                    <Headset className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    Concierge Service
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    Dedicated assistance for your every need throughout the journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
