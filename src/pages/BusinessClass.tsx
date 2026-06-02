import { ArrowRight, BriefcaseBusiness, Crown, Plane, Sparkles, Wifi } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import {
  BUSINESS_CLASS_CALLOUTS,
  BUSINESS_CLASS_EDITORIAL_SECTIONS,
  BUSINESS_CLASS_GALLERY,
  BUSINESS_CLASS_HERO_IMAGE,
} from '../data/businessClass';
import { experienceService } from '../services/experience.service';
import type { FareFamilyDto } from '../types/fareFamily.types';

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCheckedBaggage(kg: number) {
  if (kg <= 0) return 'Not included';
  if (kg >= 64 && kg % 32 === 0) return `${kg / 32} x 32kg`;
  return `${kg}kg`;
}

function formatCarryOn(kg: number) {
  return `${kg}kg`;
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
      return 'Gourmet meal service';
  }
}

function flexibilityLabel(fare: FareFamilyDto) {
  const parts: string[] = [];
  parts.push(fare.changeable ? 'Changes allowed' : 'No changes');
  if (fare.changeable && fare.changeFee > 0) parts.push(`from ${formatVnd(fare.changeFee)}`);
  if (fare.refundable) {
    parts.push(fare.refundFee > 0 ? `refund fee ${formatVnd(fare.refundFee)}` : 'refundable');
  } else {
    parts.push('non-refundable');
  }
  return parts.join(', ');
}

function priorityLabel(fare: FareFamilyDto) {
  if (fare.priorityCheckin && fare.priorityBoarding && fare.fastTrackSecurity) {
    return 'Priority check-in, boarding, and fast-track security';
  }
  if (fare.priorityCheckin && fare.priorityBoarding) return 'Priority check-in and boarding';
  if (fare.priorityCheckin) return 'Priority check-in';
  if (fare.priorityBoarding) return 'Priority boarding';
  return 'Standard airport flow';
}

function benefitCards(fare: FareFamilyDto) {
  return [
    {
      icon: Crown,
      title: 'Lounge Access',
      body: fare.loungeAccess ? 'Included for this fare family.' : 'Not included for this fare family.',
      field: 'loungeAccess',
    },
    {
      icon: BriefcaseBusiness,
      title: 'Priority Services',
      body: priorityLabel(fare),
      field: 'priorityCheckin · priorityBoarding · fastTrackSecurity',
    },
    {
      icon: Sparkles,
      title: mealTypeLabel(fare.mealType),
      body: 'Meal service level derived directly from fare policy.',
      field: 'mealType',
    },
    {
      icon: Wifi,
      title: fare.wifiIncluded ? 'Wi-Fi Included' : 'Wi-Fi Not Included',
      body: 'Connectivity entitlement shown directly from backend policy.',
      field: 'wifiIncluded',
    },
    {
      icon: Plane,
      title: 'Mileage Multiplier',
      body: `Earn ${fare.mileageRate}x base miles for eligible travel.`,
      field: 'mileageRate',
    },
    {
      icon: ArrowRight,
      title: 'Flexible Changes',
      body: flexibilityLabel(fare),
      field: 'changeable · refundable · changeFee · refundFee',
    },
  ];
}

export default function BusinessClass() {
  const summaryQuery = useQuery({
    queryKey: ['business-class-summary', 'VN', 'VND'],
    queryFn: () =>
      experienceService.getBusinessClassSummary({ countryCode: 'VN', currency: 'VND' }),
  });

  const businessFare = summaryQuery.data;
  const cards = businessFare ? benefitCards(businessFare) : [];

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest font-body text-on-surface antialiased">
      <MarketingNav active="none" />

      <main className="pt-18 md:pt-20">
        <section className="relative min-h-[calc(100dvh-4.5rem)] overflow-hidden bg-black md:min-h-[calc(100dvh-5rem)]">
          <img
            alt=""
            src={BUSINESS_CLASS_HERO_IMAGE}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,8,10,0.92)_0%,rgba(8,8,10,0.64)_46%,rgba(8,8,10,0.18)_100%)]" />
          <div className="relative mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-480 items-center px-6 py-18 md:min-h-[calc(100dvh-5rem)] md:px-12 lg:px-20">
            <div className="max-w-3xl">
              <span className="mb-5 block font-label text-sm font-extrabold tracking-[0.24em] text-luxury-gold">
                THE BUSINESS CLASS EXPERIENCE
              </span>
              <h1 className="max-w-3xl font-headline text-5xl font-black tracking-tight text-white md:text-6xl">
                Space To Focus,
                <br />
                Rest, And Arrive Ready.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-white/82 md:text-lg">
                A premium long-haul experience shaped around comfort, thoughtful dining, and
                elevated airport privileges. Final onboard details remain editorial content, not
                fare-policy data.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-luxury-gold px-6 py-3 font-headline text-sm font-bold text-midnight-burgundy transition-all hover:brightness-110"
                >
                  Start A Business Search
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/6 px-6 py-3 font-headline text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Watch The Film
                </button>
              </div>
            </div>
          </div>
        </section>

        {businessFare ? (
          <section className="bg-midnight-burgundy text-white">
            <div className="mx-auto grid max-w-480 grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:divide-x md:divide-white/8">
              <div className="px-6 py-8 md:px-8">
                <div className="text-xs uppercase tracking-[0.14em] text-white/60">
                  Business · reference price (VN)
                </div>
                <div className="mt-3 font-headline text-4xl font-black text-luxury-gold">
                  {formatVnd(businessFare.referencePrice?.amount ?? 0)}
                </div>
                <div className="mt-2 text-sm text-white/72">
                  Market reference only · <code>referencePrice.amount</code>
                </div>
              </div>
              <div className="px-6 py-8 md:px-8">
                <div className="text-xs uppercase tracking-[0.14em] text-white/60">
                  Checked baggage
                </div>
                <div className="mt-3 font-headline text-4xl font-black text-luxury-gold">
                  {formatCheckedBaggage(businessFare.baggageCheckinKg)}
                </div>
                <div className="mt-2 text-sm text-white/72">
                  <code>baggageCheckinKg</code>
                </div>
              </div>
              <div className="px-6 py-8 md:px-8">
                <div className="text-xs uppercase tracking-[0.14em] text-white/60">
                  Mileage earn rate
                </div>
                <div className="mt-3 font-headline text-4xl font-black text-luxury-gold">
                  {businessFare.mileageRate}x
                </div>
                <div className="mt-2 text-sm text-white/72">
                  <code>mileageRate</code>
                </div>
              </div>
              <div className="flex items-center justify-start px-6 py-8 md:justify-center md:px-8">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-luxury-gold px-6 py-3 font-headline text-sm font-bold text-midnight-burgundy transition-all hover:brightness-110"
                >
                  Back To Search Form
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-480 px-6 py-18 md:px-12 lg:px-20">
          <span className="mb-4 block font-label text-sm font-extrabold tracking-[0.2em] text-midnight-burgundy">
            THE SUITE
          </span>
          <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
            A more considered premium journey
          </h2>
          <div className="mt-5 h-0.5 w-16 bg-luxury-gold" />
          <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant">
            This section stays editorial. It should use brand-safe language and avoid promising
            hard product details that are not modeled in fare-policy data.
          </p>

          <div className="mt-12 space-y-18">
            {BUSINESS_CLASS_EDITORIAL_SECTIONS.map((section, index) => (
              <div
                key={section.title}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-14 ${
                  index % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''
                }`}
              >
                <div>
                  <h3 className="font-headline text-3xl font-black tracking-tight text-on-surface">
                    {section.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-on-surface-variant">
                    {section.body}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-sm leading-7 text-on-surface">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-luxury-gold" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="overflow-hidden rounded-[1.5rem] shadow-[0_24px_60px_rgba(77,4,31,0.18)]">
                  <img alt="" src={section.image} className="h-[26rem] w-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {businessFare ? (
          <section className="bg-surface-container-low py-18">
            <div className="mx-auto max-w-480 px-6 md:px-12 lg:px-20">
              <span className="mb-4 block font-label text-sm font-extrabold tracking-[0.2em] text-midnight-burgundy">
                EVERYTHING INCLUDED
              </span>
              <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
                The Business Class privilege
              </h2>
              <div className="mt-5 h-0.5 w-16 bg-luxury-gold" />
              <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant">
                Every benefit shown here maps directly to a backend field or a safe frontend
                derivation from those fields.
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-[1.25rem] border border-luxury-gold/12 bg-white p-7 shadow-[0_14px_36px_rgba(26,28,28,0.05)]"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-midnight-burgundy/7 text-midnight-burgundy">
                      <card.icon className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <h3 className="font-headline text-xl font-bold text-on-surface">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">{card.body}</p>
                    <span className="mt-4 inline-flex rounded-md bg-emerald-50 px-2.5 py-1 font-mono text-[0.68rem] font-semibold text-emerald-700">
                      {card.field}
                    </span>
                  </article>
                ))}
              </div>

              <div className="mt-10 grid gap-4 rounded-[1.5rem] border border-luxury-gold/12 bg-white p-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm text-on-surface-variant">Carry-on</div>
                  <div className="mt-1 font-headline text-2xl font-black text-midnight-burgundy">
                    {formatCarryOn(businessFare.baggageHandKg)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-on-surface-variant">Checked baggage</div>
                  <div className="mt-1 font-headline text-2xl font-black text-midnight-burgundy">
                    {formatCheckedBaggage(businessFare.baggageCheckinKg)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-on-surface-variant">Seat selection</div>
                  <div className="mt-1 font-headline text-2xl font-black text-midnight-burgundy">
                    {businessFare.seatSelection ? 'Included' : 'Not included'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-on-surface-variant">Flexibility</div>
                  <div className="mt-1 font-headline text-xl font-black text-midnight-burgundy">
                    {businessFare.changeable ? 'Changeable fare' : 'Restricted fare'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-480 px-6 py-18 md:px-12 lg:px-20">
          <span className="mb-4 block font-label text-sm font-extrabold tracking-[0.2em] text-midnight-burgundy">
            A CLOSER LOOK
          </span>
          <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
            Gallery
          </h2>
          <div className="mt-5 h-0.5 w-16 bg-luxury-gold" />
          <div className="mt-10 grid auto-rows-[12rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[12rem]">
            {BUSINESS_CLASS_GALLERY.map((image) => (
              <div
                key={image.src}
                className={`overflow-hidden rounded-[1rem] ${
                  'className' in image ? image.className : ''
                }`}
              >
                <img alt="" src={image.src} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-480 px-6 py-8 md:px-12 lg:px-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {BUSINESS_CLASS_CALLOUTS.map((item) => (
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
              Return guests to search with business intent.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/76 md:text-base">
              This page should hand users back to the main booking form rather than dropping them
              into results without criteria. Business intent can be prefilled later when the search
              form supports it.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-luxury-gold px-6 py-3 font-headline text-sm font-bold text-midnight-burgundy transition-all hover:brightness-110"
              >
                Back To Search Form
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </Link>
              <Link
                to="/experience"
                className="inline-flex items-center rounded-xl border border-white/15 px-6 py-3 font-headline text-sm font-bold text-white transition-colors hover:bg-white/8"
              >
                Explore More Experiences
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
