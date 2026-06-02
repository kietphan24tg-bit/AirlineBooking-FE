import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import {
  ALL_DESTINATIONS,
  DESTINATIONS_PAGE_SIZE,
  DESTINATIONS_TOTAL,
} from '../data/destinations';

const TOTAL_PAGES = Math.ceil(DESTINATIONS_TOTAL / DESTINATIONS_PAGE_SIZE);

function buildPageItems(page: number) {
  const start = (page - 1) * DESTINATIONS_PAGE_SIZE;
  return ALL_DESTINATIONS.slice(start, start + DESTINATIONS_PAGE_SIZE).map((d, i) => ({
    ...d,
    key: `${d.city}-${start + i}`,
  }));
}

function pageNumbers(current: number): (number | 'dots')[] {
  if (TOTAL_PAGES <= 7) {
    return Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
  }
  if (current <= 3) return [1, 2, 3, 4, 'dots', TOTAL_PAGES];
  if (current >= TOTAL_PAGES - 2) {
    return [1, 'dots', TOTAL_PAGES - 3, TOTAL_PAGES - 2, TOTAL_PAGES - 1, TOTAL_PAGES];
  }
  return [1, 'dots', current - 1, current, current + 1, 'dots', TOTAL_PAGES];
}

export default function Destinations() {
  const [page, setPage] = useState(1);
  const cards = useMemo(() => buildPageItems(page), [page]);
  const rangeStart = (page - 1) * DESTINATIONS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * DESTINATIONS_PAGE_SIZE, DESTINATIONS_TOTAL);
  const pages = pageNumbers(page);

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest font-body text-on-surface antialiased">
      <MarketingNav active="book" />

      <main className="relative pt-18 md:pt-20">
        <section className="mx-auto max-w-480 px-6 pb-9 pt-16 md:px-12 md:pt-20 lg:px-20">
          <span className="font-label mb-4 block text-base font-extrabold tracking-[0.2em] text-midnight-burgundy">
            CURATED COLLECTIONS
          </span>
          <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface md:text-[3rem]">
            All Destinations
          </h1>
        </section>

        <section className="mx-auto max-w-480 px-6 pb-16 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((d) => (
              <article
                key={d.key}
                className="group relative aspect-3/4 overflow-hidden rounded-2xl border border-luxury-gold/15 shadow-[0_12px_40px_rgba(26,28,28,0.06)]"
              >
                <img
                  alt=""
                  src={d.img}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="destination-overlay absolute inset-0" />
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-7">
                  <span
                    className={`mb-3 inline-block px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.14em] ${d.tagClass}`}
                  >
                    {d.tag}
                  </span>
                  <h3 className="font-headline text-[1.75rem] font-black text-white">{d.city}</h3>
                  <p className="mt-1.5 text-sm font-medium text-white/72">{d.line}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-11 flex flex-wrap items-center justify-between gap-4 border-t border-luxury-gold/10 pt-11">
            <p className="text-sm text-on-surface-variant">
              Showing {rangeStart}–{rangeEnd} of {DESTINATIONS_TOTAL} destinations
            </p>
            <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
              <button
                type="button"
                className="flex h-10 min-w-10 items-center justify-center rounded-[10px] border border-luxury-gold/15 bg-white px-3 font-headline text-sm font-bold text-midnight-burgundy transition-colors hover:border-luxury-gold disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
              {pages.map((p, i) =>
                p === 'dots' ? (
                  <span key={`dots-${i}`} className="px-1 text-on-surface-variant">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`flex h-10 min-w-10 items-center justify-center rounded-[10px] border px-3 font-headline text-sm font-bold transition-colors ${
                      p === page
                        ? 'border-midnight-burgundy bg-midnight-burgundy text-luxury-gold'
                        : 'border-luxury-gold/15 bg-white text-on-surface hover:border-luxury-gold hover:text-midnight-burgundy'
                    }`}
                    aria-current={p === page ? 'page' : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                className="flex h-10 min-w-10 items-center justify-center rounded-[10px] border border-luxury-gold/15 bg-white px-3 font-headline text-sm font-bold text-midnight-burgundy transition-colors hover:border-luxury-gold disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next page"
                disabled={page >= TOTAL_PAGES}
                onClick={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
              >
                <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
            </nav>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
