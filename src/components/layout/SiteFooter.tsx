import { Globe, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';

const footerLinks = [
  { label: 'Privacy Policy', to: '#' },
  { label: 'Terms of Carriage', to: '#' },
  { label: 'Help Center', to: '#' },
  { label: 'Contact Us', to: '#' },
  { label: 'Cookie Settings', to: '#' },
] as const;

export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-luxury-gold/30 bg-dark-charcoal">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center justify-between gap-8 px-8 py-12 md:flex-row md:items-center">
        <div className="text-center md:mb-0 md:text-left">
          <span className="font-headline text-xl font-black uppercase italic tracking-tighter text-luxury-gold">
            The Sovereign
          </span>
          <p className="mt-3 font-body text-[0.6875rem] font-bold uppercase tracking-widest text-luxury-gold/60">
            © {new Date().getFullYear()} The Sovereign Airways. All rights reserved.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {footerLinks.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="font-body text-xs font-bold uppercase tracking-[0.15em] text-white/80 transition-colors hover:text-luxury-gold"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-luxury-gold/30 text-luxury-gold/80 transition-all hover:border-luxury-gold hover:text-luxury-gold"
            aria-label="Global"
          >
            <Globe className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-luxury-gold/30 text-luxury-gold/80 transition-all hover:border-luxury-gold hover:text-luxury-gold"
            aria-label="Flights"
          >
            <Plane className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-luxury-gold/40 to-transparent" />
    </footer>
  );
}
