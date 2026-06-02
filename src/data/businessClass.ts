export const BUSINESS_CLASS_HERO_IMAGE =
  'https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=1600&q=80';

export const BUSINESS_CLASS_EDITORIAL_SECTIONS = [
  {
    title: 'A calmer way to travel',
    body: 'Generous personal space, elevated seating, and a quieter cabin rhythm create a journey that feels materially different from the main cabin. Exact seat hardware should be treated as aircraft content, not fare-policy data.',
    bullets: [
      'Editorial section only, not derived from backend fare fields',
      'Use brand-approved product language',
      'Avoid universal claims unless fleet data confirms them',
    ],
    image:
      'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Dining with more intention',
    body: 'The live page can safely express meal inclusion and service level from backend data. Richer culinary storytelling should remain static unless a dedicated content source is introduced.',
    bullets: [
      'Backend-safe label: mealType = GOURMET',
      'Editorial extras can live in CMS or static content',
      'Do not infer chef, timing, or service ritual from fare policy alone',
    ],
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Stay connected',
    body: 'Connectivity is a good example of what can be partly data-backed and partly editorial. The backend can say whether Wi-Fi is included. Device experience and entertainment language should stay static.',
    bullets: [
      'API-backed: wifiIncluded',
      'Static: screen, audio, charging, and device details',
      'Keep wording mixed only when the UI clearly separates the two',
    ],
    image:
      'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=1200&q=80',
  },
] as const;

export const BUSINESS_CLASS_GALLERY = [
  {
    src: 'https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=800&q=80',
    className: 'lg:row-span-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=1200&q=80',
    className: 'lg:col-span-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
  },
  {
    src: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=800&q=80',
  },
  {
    src: 'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=1200&q=80',
    className: 'lg:col-span-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=800&q=80',
  },
] as const;

export const BUSINESS_CLASS_CALLOUTS = [
  {
    title: 'Static and API-backed content stay separate',
    body: 'Storytelling remains editorial while entitlements, baggage, mileage, and flexibility come from fare-policy data.',
  },
  {
    title: 'Reference pricing should stay honest',
    body: 'If this page shows a number, it should be a market reference price from backend data rather than a synthetic fare promise.',
  },
  {
    title: 'Search should begin from landing',
    body: 'The action should return guests to the main search form with business intent, instead of dropping them onto results without criteria.',
  },
] as const;
