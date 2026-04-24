import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export type MarketingNavLinkId =
  | 'book'
  | 'explore'
  | 'experience'
  | 'loyalty'
  | 'manage'
  | 'mytrips';

export interface MarketingNavProps {
  /** Which main nav item is visually active (underline). */
  active?: MarketingNavLinkId;
  /** If true, show Sign In as Link to /login. */
  showSignIn?: boolean;
}

const linkBase = 'font-body text-sm font-medium transition-all duration-300 md:text-base';

export default function MarketingNav({ active = 'book', showSignIn = true }: MarketingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const item = (id: MarketingNavLinkId, label: string, to: string) => {
    const isActive = active === id;
    return (
      <Link
        to={to}
        onClick={() => setMobileMenuOpen(false)}
        className={`${linkBase} ${
          isActive
            ? 'border-b-2 border-luxury-gold pb-1 font-semibold text-white'
            : 'text-white/80 hover:text-white'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 z-[70] w-full border-b border-luxury-gold/20 bg-midnight-burgundy shadow-xl">
      <div className="mx-auto flex h-18 w-full max-w-480 items-center justify-between px-4 sm:px-6 md:h-20 md:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5 md:gap-12">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-luxury-gold/25 text-luxury-gold transition-colors hover:bg-white/8 md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-nav-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link
            to="/"
            className="min-w-0 font-headline text-lg font-black uppercase italic tracking-tighter text-luxury-gold sm:text-xl md:text-3xl"
          >
            <span className="block truncate not-italic">The Sovereign</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex md:gap-8">
            {item('book', 'Book', '/')}
            {item('manage', 'Manage', '/manage-booking')}
            {item('experience', 'Experience', '/')}
            {item('loyalty', 'Loyalty', '/')}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          <Link
            to="/trips"
            onClick={() => setMobileMenuOpen(false)}
            className="font-body text-xs font-semibold text-white/80 transition-colors hover:text-white sm:text-sm md:text-base"
          >
            <span className="hidden sm:inline md:hidden">Trips</span>
            <span className="sm:hidden md:inline">My Trips</span>
          </Link>
          {showSignIn ? (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg bg-luxury-gold px-3 py-2 font-headline text-[0.7rem] font-bold tracking-tight text-midnight-burgundy transition-all hover:brightness-110 active:scale-95 sm:px-4 md:px-6 md:py-2.5 md:text-xs"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
      <div
        id="marketing-nav-mobile-menu"
        className={`border-t border-luxury-gold/15 bg-midnight-burgundy/98 backdrop-blur md:hidden ${
          mobileMenuOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="mx-auto flex w-full max-w-480 flex-col gap-2 px-4 py-4 sm:px-6">
          {item('book', 'Book', '/')}
          {item('manage', 'Manage', '/manage-booking')}
          {item('experience', 'Experience', '/')}
          {item('loyalty', 'Loyalty', '/')}
        </div>
      </div>
    </nav>
  );
}
