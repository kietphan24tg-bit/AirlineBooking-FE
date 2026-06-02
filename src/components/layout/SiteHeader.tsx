import { Link } from 'react-router-dom';
import AuthNavAction from './AuthNavAction';

export interface SiteHeaderProps {
  showSignIn?: boolean;
}

export default function SiteHeader({ showSignIn = true }: SiteHeaderProps) {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-luxury-gold/20 bg-midnight-burgundy shadow-xl">
      <div className="mx-auto flex h-18 w-full max-w-480 items-center justify-between px-4 sm:px-6 md:h-20 md:px-8">
        <Link
          to="/"
          className="min-w-0 font-headline text-lg font-black uppercase tracking-tighter text-luxury-gold sm:text-xl md:text-3xl"
        >
          <span className="block truncate">The Sovereign</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <AuthNavAction
            showSignIn={showSignIn}
            signInClassName="rounded-lg bg-luxury-gold px-3 py-2 font-headline text-[0.7rem] font-bold tracking-tight text-midnight-burgundy transition-all hover:brightness-110 active:scale-95 sm:px-4 md:px-6 md:py-2.5 md:text-xs"
          />
        </div>
      </div>
    </nav>
  );
}
