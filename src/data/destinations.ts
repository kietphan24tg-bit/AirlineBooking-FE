export type Destination = {
  tag: string;
  tagClass: string;
  city: string;
  line: string;
  img: string;
};

const TAG_CYCLE = [
  { tag: 'TRENDING', tagClass: 'bg-midnight-burgundy text-luxury-gold' },
  { tag: 'FEATURED', tagClass: 'bg-luxury-gold text-midnight-burgundy' },
  { tag: 'LIMITED', tagClass: 'bg-midnight-burgundy text-luxury-gold' },
] as const;

type DestinationSeed = {
  city: string;
  line: string;
  img?: string;
  seed?: string;
};

const DESTINATION_SEEDS: DestinationSeed[] = [
  {
    city: 'Dubai',
    line: 'From $1,240 · First Class Experience',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzQoRszQ9DoYWqrmkICRM_5R6URZXKVjMsaosolUgHNilP8s5srYmEPnNXXBAPikFHweburezdnp1Z94bpBFM7TBcfeHKjeMNUfdqUgpD250iLKxHouuXEHRH5vSdk9MmR-99-COmPExlTcMfWiym3-b9z9mEYntXklDSt265R2qmcYwluquIBakeFin-WyilQvHpz9tTZUNCw83Br2bsGIq3_63Rj_g1H9xulMmpBe6chtogNz7g4N77Q2YM6Q_4lgDb6Ppp36bop',
  },
  {
    city: 'Paris',
    line: 'From $980 · Cultural Elegance',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGJCt58g5Q3lJDwA8yHseLk4ECQqDj8JwZtvA3ub7MIh3sFCnqMKvFmEU93nt0fnkqRlGTMXucg2alHD-bssfl3pnBJGsLUvSJf2ziz1xk5QXAnFzjFd_I2sTyQAIDsUKSL0J8D3Rr9pm4M717Ts3krl_V_cdhkB2xarlNhsjRpwtXWs5fhZoVv8PD7mpgGhUNohZ1oX67E5we99w4MdsvY73zBGUl2bXjj9N9bPse7uDjM_scP87xFnl7YyQnYexRjC8U5WUz37FD',
  },
  {
    city: 'Tokyo',
    line: 'From $1,560 · Urban Sophistication',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmSdCW-K2plV9pnsU7pJS-1INqVfmROXBQGkU-LLL4aOhQ62VnWMUqAVXilhgQSAI6DWZuvDZ3PjI32_XeWOLCy9HihdXoNGpiFrKPWlMm6cWeA_k_HICKIc18PkmRNABDcoHhwo3n8SQVqSU1NfcHNZxUiXtuj07yPsrh2tpJW1UashVTXXjXe-JoOVjehMnKISgiVO87usxTH_G4XxEFalM59OaESVoGglNSj4FroDwEfMBsq0TTOZf3UmbB-S3anh2EFDBbAw6U',
  },
  { city: 'Singapore', line: 'From $1,180 · Garden Metropolis', seed: 'singapore' },
  { city: 'New York', line: 'From $1,420 · The City That Never Sleeps', seed: 'newyork' },
  { city: 'Maldives', line: 'From $2,100 · Private Island Retreat', seed: 'maldives' },
  { city: 'Istanbul', line: 'From $760 · Where Continents Meet', seed: 'istanbul' },
  { city: 'Sydney', line: 'From $1,690 · Harbour Living', seed: 'sydney' },
  { city: 'Rome', line: 'From $890 · Eternal Grandeur', seed: 'rome' },
  { city: 'London', line: 'From $1,050 · Royal Heritage', seed: 'london' },
  { city: 'Barcelona', line: 'From $920 · Mediterranean Soul', seed: 'barcelona' },
  { city: 'Bangkok', line: 'From $640 · Temples & Street Life', seed: 'bangkok' },
  { city: 'Hong Kong', line: 'From $1,320 · Skyline & Harbor', seed: 'hongkong' },
  { city: 'Seoul', line: 'From $1,110 · K-Culture Capital', seed: 'seoul' },
  { city: 'Los Angeles', line: 'From $1,380 · Pacific Glamour', seed: 'losangeles' },
  { city: 'San Francisco', line: 'From $1,290 · Golden Gate Views', seed: 'sanfrancisco' },
  { city: 'Vancouver', line: 'From $1,150 · Mountains Meet Ocean', seed: 'vancouver' },
  { city: 'Toronto', line: 'From $1,020 · Lakeside Metropolis', seed: 'toronto' },
  { city: 'Miami', line: 'From $1,190 · Art Deco & Beaches', seed: 'miami' },
  { city: 'Mexico City', line: 'From $780 · Aztec Roots & Modern Art', seed: 'mexicocity' },
  { city: 'Rio de Janeiro', line: 'From $1,340 · Carnival & Coastline', seed: 'rio' },
  { city: 'Buenos Aires', line: 'From $1,010 · Tango & European Charm', seed: 'buenosaires' },
  { city: 'Cape Town', line: 'From $1,470 · Table Mountain Majesty', seed: 'capetown' },
  { city: 'Marrakech', line: 'From $820 · Souks & Riads', seed: 'marrakech' },
  { city: 'Cairo', line: 'From $710 · Nile & Ancient Wonders', seed: 'cairo' },
  { city: 'Athens', line: 'From $840 · Acropolis & Aegean Light', seed: 'athens' },
  { city: 'Vienna', line: 'From $930 · Imperial Elegance', seed: 'vienna' },
  { city: 'Prague', line: 'From $760 · Gothic Fairytale', seed: 'prague' },
  { city: 'Amsterdam', line: 'From $990 · Canals & Culture', seed: 'amsterdam' },
  { city: 'Berlin', line: 'From $880 · History & Nightlife', seed: 'berlin' },
  { city: 'Zurich', line: 'From $1,520 · Alpine Precision', seed: 'zurich' },
  { city: 'Geneva', line: 'From $1,480 · Lake & Luxury', seed: 'geneva' },
  { city: 'Stockholm', line: 'From $1,260 · Nordic Design', seed: 'stockholm' },
  { city: 'Copenhagen', line: 'From $1,210 · Hygge by the Sea', seed: 'copenhagen' },
  { city: 'Oslo', line: 'From $1,350 · Fjords & Fjell', seed: 'oslo' },
  { city: 'Helsinki', line: 'From $1,180 · Baltic Serenity', seed: 'helsinki' },
  { city: 'Reykjavik', line: 'From $1,620 · Aurora & Geothermal', seed: 'reykjavik' },
  { city: 'Kyoto', line: 'From $1,440 · Temples & Tea Houses', seed: 'kyoto' },
  { city: 'Osaka', line: 'From $1,280 · Street Food Paradise', seed: 'osaka' },
  { city: 'Bali', line: 'From $940 · Island Tranquility', seed: 'bali' },
  { city: 'Hanoi', line: 'From $520 · Old Quarter Charm', seed: 'hanoi' },
  { city: 'Ho Chi Minh City', line: 'From $480 · Energy & Heritage', seed: 'hochiminh' },
  { city: 'Kuala Lumpur', line: 'From $620 · Towers & Night Markets', seed: 'kualalumpur' },
  { city: 'Jakarta', line: 'From $590 · Archipelago Gateway', seed: 'jakarta' },
  { city: 'Manila', line: 'From $560 · Pearl of the Orient', seed: 'manila' },
  { city: 'Taipei', line: 'From $780 · Night Markets & Peaks', seed: 'taipei' },
  { city: 'Macau', line: 'From $690 · East Meets Opulence', seed: 'macau' },
  { city: 'Doha', line: 'From $1,090 · Desert Modernism', seed: 'doha' },
];

function destinationImg(seed: DestinationSeed): string {
  if (seed.img) return seed.img;
  const slug = seed.seed ?? seed.city.toLowerCase().replace(/\s+/g, '-');
  return `https://picsum.photos/seed/${slug}/600/800`;
}

export const ALL_DESTINATIONS: Destination[] = DESTINATION_SEEDS.map((entry, i) => {
  const { tag, tagClass } = TAG_CYCLE[i % TAG_CYCLE.length];
  return {
    tag,
    tagClass,
    city: entry.city,
    line: entry.line,
    img: destinationImg(entry),
  };
});

/** Featured trio on the landing page (first three destinations). */
export const FEATURED_DESTINATIONS = ALL_DESTINATIONS.slice(0, 3);

export const DESTINATIONS_PAGE_SIZE = 9;
export const DESTINATIONS_TOTAL = ALL_DESTINATIONS.length;
