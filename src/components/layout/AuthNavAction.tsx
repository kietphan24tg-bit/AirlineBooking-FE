import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import type { User } from '../../types/user.type';

interface AuthNavActionProps {
  showSignIn?: boolean;
  onNavigate?: () => void;
  signInClassName: string;
  avatarClassName?: string;
}

function getDisplayName(user: User): string {
  const fullName = [user.firstName, user.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();

  return fullName || user.username || user.email || 'User';
}

function getInitials(user: User | null): string {
  if (!user) return 'US';

  const displayName = getDisplayName(user);
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return (nameParts[0] || 'US').slice(0, 2).toUpperCase();
}

export default function AuthNavAction({
  showSignIn = true,
  onNavigate,
  signInClassName,
  avatarClassName = '',
}: AuthNavActionProps) {
  const user = useAuthStore((state) => state.user);

  if (user) {
    const displayName = getDisplayName(user);

    return (
      <Link
        to="/account"
        onClick={onNavigate}
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-luxury-gold bg-luxury-gold font-headline text-[0.75rem] font-black uppercase tracking-tight text-midnight-burgundy shadow-[0_0_0_3px_rgba(212,175,55,0.16)] transition-all hover:brightness-110 active:scale-95 md:size-10 md:text-[0.8125rem] ${avatarClassName}`}
        aria-label={`Open account page for ${displayName}`}
        title={displayName}
      >
          {getInitials(user)}
      </Link>
    );
  }

  if (!showSignIn) return null;

  return (
    <Link to="/login" onClick={onNavigate} className={signInClassName}>
      Sign In
    </Link>
  );
}
