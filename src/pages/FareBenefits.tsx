import { ArrowRight, BriefcaseBusiness, Crown, GlassWater, Sofa } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import { flightService } from '../services/flight.service';
import type { FareFamilyDto } from '../types/fareFamily.types';
import {
  FARE_BENEFITS_EDITORIAL_IMAGE,
  FARE_BENEFITS_HERO_IMAGE,
  FARE_BENEFIT_CALLOUTS,
} from '../data/fareBenefits';

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function toneClasses(fareCode: string) {
  const normalized = fareCode.toUpperCase();
  if (normalized.includes('LITE') || normalized.includes('ECONOMY')) {
    return {
      chip: 'border-cabin-bronze/30 bg-cabin-bronze/10 text-cabin-bronze',
      ring: 'border-cabin-bronze/20',
      dot: 'bg-cabin-bronze',
    };
  }
  if (normalized.includes('FLEX') || normalized.includes('PREMIUM')) {
    return {
      chip: 'border-cabin-silver/40 bg-cabin-silver/10 text-midnight-burgundy',
      ring: 'border-cabin-silver/25',
      dot: 'bg-cabin-silver',
    };
  }
  if (normalized.includes('BUSINESS')) {
    return {
      chip: 'border-luxury-gold/35 bg-luxury-gold/12 text-secondary',
      ring: 'border-luxury-gold/25',
      dot: 'bg-luxury-gold',
    };
  }
  return {
    chip: 'border-midnight-burgundy/30 bg-midnight-burgundy text-luxury-gold',
    ring: 'border-midnight-burgundy/20',
    dot: 'bg-midnight-burgundy',
  };
}

function cabinClassLabel(cabinClass: string) {
  switch (cabinClass.toUpperCase()) {
    case 'ECONOMY':
      return 'Economy';
    case 'PREMIUM_ECONOMY':
      return 'Premium Economy';
    case 'BUSINESS':
      return 'Business';
    case 'FIRST':
      return 'First';
    default:
      return cabinClass.replaceAll('_', ' ');
  }
}

function formatCheckedBaggage(kg: number) {
  if (kg <= 0) return 'Not included';
  if (kg >= 64 && kg % 32 === 0) return `${kg / 32} x 32kg`;
  return `${kg}kg`;
}

function seatSelectionLabel(fare: FareFamilyDto) {
  if (!fare.seatSelection) return 'Not included';
  switch (fare.seatSelectionPolicy) {
    case 'INCLUDED':
      return 'Included';
    case 'CHECKIN_ONLY':
      return 'Check-in only';
    case 'PAID':
      return 'Available to purchase';
    case 'NOT_ALLOWED':
      return 'Not allowed';
    default:
      return fare.seatSelection ? 'Included' : 'Not included';
  }
}

function mealTypeLabel(mealType: FareFamilyDto['mealType']) {
  switch (mealType) {
    case 'NONE':
      return 'No meal included';
    case 'STANDARD':
      return 'Standard meal service';
    case 'PREMIUM':
      return 'Premium meal service';
    case 'GOURMET':
      return 'Gourmet dining service';
  }
}

function priorityLabel(fare: FareFamilyDto) {
  if (fare.priorityCheckin && fare.priorityBoarding) return 'Priority check-in and boarding';
  if (fare.priorityCheckin) return 'Priority check-in';
  if (fare.priorityBoarding) return 'Priority boarding';
  return 'Standard airport flow';
}

function changeRefundLabel(fare: FareFamilyDto) {
  const changePart = fare.changeable
    ? fare.changeFee > 0
      ? `Changes from ${formatVnd(fare.changeFee)}`
      : 'Changes allowed'
    : 'No changes';
  const refundPart = fare.refundable
    ? fare.refundFee > 0
      ? `refund fee ${formatVnd(fare.refundFee)}`
      : 'refundable'
    : 'non-refundable';
  return `${changePart}, ${refundPart}`;
}

function buildPolicyBullets(fare: FareFamilyDto) {
  return [
    `${fare.baggageHandKg}kg carry-on baggage`,
    `${formatCheckedBaggage(fare.baggageCheckinKg)} checked baggage`,
    seatSelectionLabel(fare),
    mealTypeLabel(fare.mealType),
    fare.loungeAccess ? 'Lounge access available' : 'No lounge access',
  ];
}

function buildFactRows(fare: FareFamilyDto) {
  return [
    { label: 'Carry-on', value: `${fare.baggageHandKg}kg` },
    { label: 'Checked baggage', value: formatCheckedBaggage(fare.baggageCheckinKg) },
    { label: 'Seat selection', value: seatSelectionLabel(fare) },
    { label: 'Meal service', value: mealTypeLabel(fare.mealType) },
    { label: 'Priority', value: priorityLabel(fare) },
    { label: 'Changes / refunds', value: changeRefundLabel(fare) },
  ];
}

const comparisonRows = [
  {
    label: 'Carry-on baggage',
    value: (fare: FareFamilyDto) => `${fare.baggageHandKg}kg`,
  },
  {
    label: 'Checked baggage',
    value: (fare: FareFamilyDto) => formatCheckedBaggage(fare.baggageCheckinKg),
  },
  {
    label: 'Seat selection',
    value: (fare: FareFamilyDto) => seatSelectionLabel(fare),
  },
  {
    label: 'Meal service',
    value: (fare: FareFamilyDto) => mealTypeLabel(fare.mealType),
  },
  {
    label: 'Lounge access',
    value: (fare: FareFamilyDto) => (fare.loungeAccess ? 'Available' : 'Not included'),
  },
  {
    label: 'Priority services',
    value: (fare: FareFamilyDto) => priorityLabel(fare),
  },
  {
    label: 'Wi-Fi',
    value: (fare: FareFamilyDto) => (fare.wifiIncluded ? 'Included' : 'Not included'),
  },
  {
    label: 'Fast-track security',
    value: (fare: FareFamilyDto) => (fare.fastTrackSecurity ? 'Included' : 'Not included'),
  },
  {
    label: 'Mileage rate',
    value: (fare: FareFamilyDto) => `${fare.mileageRate}x`,
  },
  {
    label: 'Changes and refunds',
    value: (fare: FareFamilyDto) => changeRefundLabel(fare),
  },
];

const editorialHighlights = [
  {
    icon: BriefcaseBusiness,
    title: 'Policy data already maps well',
    body: 'The backend already carries baggage, meal, seat, lounge, priority, Wi-Fi, and flexibility fields at fare-class level.',
  },
  {
    icon: Sofa,
    title: 'No fake "from" pricing',
    body: 'This page should not invent catalog pricing. Route-specific prices still belong to search results where dates and inventory exist.',
  },
  {
    icon: GlassWater,
    title: 'Ready for a catalog endpoint later',
    body: 'A dedicated fare-family API can later reuse the same policy fields without requiring a flight search request first.',
  },
];

function previewSummary(fare: FareFamilyDto | undefined) {
  if (!fare) return [];
  return [
    `${formatCheckedBaggage(fare.baggageCheckinKg)} checked baggage`,
    seatSelectionLabel(fare),
    changeRefundLabel(fare),
  ];
}

export default function FareBenefits() {
  const fareFamiliesQuery = useQuery({
    queryKey: ['fare-families', 'VN', 'VND'],
    queryFn: () => flightService.getFareFamilies({ countryCode: 'VN', currency: 'VND' }),
  });
  const fareFamilies = fareFamiliesQuery.data ?? [];
  const featuredFare =
    fareFamilies.find((fare) => fare.fareClassCode === 'PREMIUM') ?? fareFamilies[0];
  const previewItems = previewSummary(featuredFare);

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest font-body text-on-surface antialiased">
      <MarketingNav active="book" />

      <main className="relative pt-18 md:pt-20">
        <section className="relative flex min-h-[calc(100dvh-4.5rem)] items-center overflow-hidden bg-midnight-burgundy md:min-h-[calc(100dvh-5rem)]">
          <div className="absolute inset-0">
            <img
              alt=""
              src={FARE_BENEFITS_HERO_IMAGE}
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,28,28,0.76)_0%,rgba(26,28,28,0.54)_42%,rgba(26,28,28,0.26)_72%,rgba(26,28,28,0.18)_100%)]" />
          </div>
          <div className="gold-line-pattern absolute inset-0 opacity-[0.06]" />
          <div className="relative mx-auto grid w-full max-w-480 gap-12 px-6 py-18 md:px-12 lg:grid-cols-[minmax(0,1.25fr)_22rem] lg:px-20 lg:py-24">
            <div className="max-w-4xl">
              <span className="mb-5 block font-label text-sm font-extrabold tracking-[0.24em] text-luxury-gold">
                FARE BENEFITS
              </span>
              <h1 className="max-w-3xl font-headline text-5xl font-black tracking-tight text-white md:text-6xl">
                Fare-class policies, rendered without guesswork.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-white/80 md:text-lg">
                This version of the page only uses fields the backend already models today:
                baggage, seats, lounge access, meal type, priority services, change rules, refund
                rules, Wi-Fi, and fast-track security.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-luxury-gold px-6 py-3 font-headline text-sm font-bold text-midnight-burgundy transition-all hover:brightness-110"
                >
                  Search Flights
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                </Link>
                <a
                  href="#fare-comparison"
                  className="inline-flex items-center rounded-xl border border-white/15 bg-white/8 px-6 py-3 font-headline text-sm font-bold text-white transition-colors hover:bg-white/12"
                >
                  Compare All Fares
                </a>
              </div>
            </div>

            {featuredFare ? (
              <div className="glass-card rounded-[1.75rem] border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                <div className="rounded-2xl border border-luxury-gold/15 bg-white/80 p-5">
                  <div className="mb-4 font-label text-[0.68rem] font-black tracking-[0.2em] text-midnight-burgundy">
                    BACKEND POLICY PREVIEW
                  </div>
                  <h2 className="font-headline text-2xl font-black text-midnight-burgundy">
                    {featuredFare.fareClassName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Fare code `{featuredFare.fareClassCode}` with{' '}
                    {cabinClassLabel(featuredFare.cabinClass).toLowerCase()} policy values.
                  </p>
                  <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
                    <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                      Derived backend facts
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-on-surface">
                      {previewItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-480 px-6 py-16 md:px-12 lg:px-20">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="mb-4 block font-label text-sm font-extrabold tracking-[0.2em] text-midnight-burgundy">
                FARE POLICIES
              </span>
              <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
                One card per backend fare class.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-on-surface-variant md:text-base">
              These cards are now driven by backend-compatible fields only. No synthetic starting
              prices, no editorial descriptions, and no benefit wording that the API cannot
              support.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            {fareFamilies.map((fare) => {
              const tone = toneClasses(fare.fareClassCode);
              return (
                <article
                  key={fare.fareClassCode}
                  className={`flex h-full flex-col rounded-[1.75rem] border bg-white p-6 shadow-[0_16px_40px_rgba(26,28,28,0.06)] ${tone.ring}`}
                >
                  <div
                    className={`mb-4 inline-flex w-fit rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] ${tone.chip}`}
                  >
                    {fare.fareClassCode}
                  </div>
                  <h3 className="font-headline text-3xl font-black tracking-tight text-on-surface">
                    {fare.fareClassName}
                  </h3>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    {cabinClassLabel(fare.cabinClass)}
                  </p>
                  <p className="mt-5 text-sm leading-7 text-on-surface-variant">
                    Fare-class policy record #{fare.fareClassId}. This card summarizes what the
                    backend currently knows about the product.
                  </p>
                  <ul className="mt-6 space-y-3 border-t border-luxury-gold/10 pt-6">
                    {buildPolicyBullets(fare).map((benefit) => (
                      <li key={benefit} className="flex gap-3 text-sm text-on-surface-variant">
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-surface-container-low/70 p-4">
                    {buildFactRows(fare).map((feature) => (
                      <div
                        key={feature.label}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <dt className="text-on-surface-variant">{feature.label}</dt>
                        <dd className="text-right font-semibold text-on-surface">{feature.value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid max-w-480 gap-10 px-6 py-8 md:px-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:px-20">
          <div className="overflow-hidden rounded-[2rem] border border-luxury-gold/12 shadow-[0_18px_60px_rgba(26,28,28,0.08)]">
            <img
              alt=""
              src={FARE_BENEFITS_EDITORIAL_IMAGE}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="mb-4 block font-label text-sm font-extrabold tracking-[0.2em] text-midnight-burgundy">
              DATA READINESS
            </span>
            <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface">
              What the current backend can honestly support.
            </h2>
            <div className="mt-8 space-y-6">
              {editorialHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-luxury-gold/10 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-midnight-burgundy" strokeWidth={1.9} />
                    <h3 className="font-headline text-lg font-bold text-midnight-burgundy">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-on-surface-variant">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="fare-comparison"
          className="relative mt-12 overflow-hidden bg-surface-container-low py-18"
        >
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <svg
              className="h-full w-full stroke-luxury-gold"
              preserveAspectRatio="none"
              viewBox="0 0 1000 1000"
            >
              <path
                d="M1050,100 C840,180 670,130 470,360 C220,650 120,870 -120,930"
                fill="none"
                strokeWidth="0.9"
                opacity={0.16}
              />
            </svg>
          </div>
          <div className="relative mx-auto max-w-480 px-6 md:px-12 lg:px-20">
            <div className="mb-8 max-w-3xl">
              <span className="mb-4 block font-label text-sm font-extrabold tracking-[0.2em] text-midnight-burgundy">
                COMPARISON TABLE
              </span>
              <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
                Direct mapping from backend policy fields.
              </h2>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant md:text-base">
                This is the safest part of the page to wire first. Every row below corresponds to a
                field or a simple derivation from fields the backend already exposes.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-luxury-gold/10 bg-white shadow-[0_18px_60px_rgba(26,28,28,0.07)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-midnight-burgundy text-left">
                      <th className="px-6 py-5 font-label text-[0.72rem] font-black uppercase tracking-[0.18em] text-luxury-gold">
                        Benefit
                      </th>
                      {fareFamilies.map((fare) => (
                        <th
                          key={fare.fareClassCode}
                          className="px-6 py-5 font-label text-[0.72rem] font-black uppercase tracking-[0.18em] text-luxury-gold"
                        >
                          {fare.fareClassCode}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, index) => (
                      <tr
                        key={row.label}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/45'}
                      >
                        <th className="border-t border-luxury-gold/10 px-6 py-5 text-left text-sm font-semibold text-on-surface">
                          {row.label}
                        </th>
                        {fareFamilies.map((fare) => (
                          <td
                            key={`${row.label}-${fare.fareClassCode}`}
                            className="border-t border-luxury-gold/10 px-6 py-5 text-sm leading-7 text-on-surface-variant"
                          >
                            {row.value(fare)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-480 px-6 py-16 md:px-12 lg:px-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {FARE_BENEFIT_CALLOUTS.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-luxury-gold/10 bg-white p-6 shadow-[0_12px_36px_rgba(26,28,28,0.05)]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <Crown className="h-5 w-5 text-luxury-gold" strokeWidth={1.75} />
                  <h3 className="font-headline text-xl font-bold text-midnight-burgundy">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm leading-7 text-on-surface-variant">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] bg-midnight-burgundy px-6 py-8 text-center shadow-[0_20px_55px_rgba(125,6,51,0.18)] md:px-10">
            <span className="mb-3 block font-label text-[0.72rem] font-black uppercase tracking-[0.22em] text-luxury-gold">
              NEXT STEP
            </span>
            <h2 className="font-headline text-3xl font-black tracking-tight text-white md:text-4xl">
              Connect this preview to a dedicated fare-family endpoint later.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/76 md:text-base">
              For now, the page is intentionally constrained to backend-compatible policy fields.
              The next backend task is a catalog endpoint that returns these fare classes without
              requiring a flight search context.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-luxury-gold px-6 py-3 font-headline text-sm font-bold text-midnight-burgundy transition-all hover:brightness-110"
              >
                Continue To Flight Search
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-xl border border-white/15 px-6 py-3 font-headline text-sm font-bold text-white transition-colors hover:bg-white/8"
              >
                Back To Landing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
