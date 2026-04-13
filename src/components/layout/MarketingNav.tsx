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
  const item = (id: MarketingNavLinkId, label: string, to: string) => {
    const isActive = active === id;
    return (
      <Link
        to={to}
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
    <nav className="fixed top-0 z-50 w-full border-b border-luxury-gold/20 bg-midnight-burgundy shadow-xl">
      <div className="mx-auto flex h-20 w-full max-w-480 items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-8 md:gap-12">
          <Link
            to="/"
            className="font-headline text-xl font-black uppercase italic tracking-tighter text-luxury-gold md:text-2xl"
          >
            <span className="not-italic">The Sovereign</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex md:gap-8">
            {item('book', 'Book', '/')}
            {item('explore', 'Explore', '/flights')}
            {item('manage', 'Manage', '/manage-booking')}
            {item('experience', 'Experience', '/')}
            {item('loyalty', 'Loyalty', '/')}
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {item('mytrips', 'My Trips', '/trips')}
          {showSignIn ? (
            <Link
              to="/login"
              className="rounded-lg bg-luxury-gold px-4 py-2 font-headline text-xs font-bold tracking-tight text-midnight-burgundy transition-all hover:brightness-110 active:scale-95 md:px-6 md:py-2.5"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
