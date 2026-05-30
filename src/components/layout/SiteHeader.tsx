import { Link } from 'react-router-dom';

export interface SiteHeaderProps {
  showSignIn?: boolean;
}

export default function SiteHeader({ showSignIn = true }: SiteHeaderProps) {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-luxury-gold/20 bg-midnight-burgundy shadow-xl">
      <div className="mx-auto flex h-12 w-full max-w-480 items-center justify-between px-6 md:px-8">
        <Link
          to="/"
          className="font-headline text-xl font-black uppercase tracking-tighter text-luxury-gold md:text-2xl"
        >
          The Sovereign
        </Link>
        <div className="flex items-center gap-3 md:gap-4">
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
