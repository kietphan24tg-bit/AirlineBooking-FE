import { LogOut, Plane, Settings, Shield, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { User as AppUser } from '../../types/user.type';
import { getDisplayName, getInitials } from '../../utils/userDisplay';

type AccountSidebarProps = {
  user: AppUser;
  onSignOut: () => void;
  onSecurityClick?: () => void;
};

type NavItem = {
  key: string;
  label: string;
  icon: typeof User;
  to?: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
};

const navItemClass = (active: boolean, danger?: boolean) =>
  [
    'flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-sm font-medium transition-all duration-200',
    danger
      ? 'text-[#b3261e] hover:bg-red-50'
      : active
        ? 'bg-linear-to-br from-primary to-primary-container font-semibold text-white shadow-[0_8px_18px_rgba(125,6,51,0.18)]'
        : 'text-dark-charcoal hover:bg-surface',
  ].join(' ');

const iconClass = (active: boolean) =>
  `h-[19px] w-[19px] shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`;

export default function AccountSidebar({ user, onSignOut, onSecurityClick }: AccountSidebarProps) {
  const location = useLocation();
  const displayName = getDisplayName(user);

  const items: NavItem[] = [
    {
      key: 'profile',
      label: 'Personal profile',
      icon: User,
      to: '/account',
      active: location.pathname === '/account',
    },
    {
      key: 'trips',
      label: 'My trips',
      icon: Plane,
      to: '/trips',
    },
    {
      key: 'security',
      label: 'Security',
      icon: Shield,
      onClick: onSecurityClick,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: Settings,
      to: '/account',
    },
  ];

  return (
    <aside className="sticky top-28 overflow-hidden rounded-3xl border border-luxury-gold/16 bg-surface-lowest shadow-[0_14px_32px_rgba(125,6,51,0.06)] lg:top-32">
      <div className="border-b border-luxury-gold/16 bg-linear-to-br from-[#fbf6ef] to-white px-6 py-7 text-center">
        <div className="mx-auto mb-3.5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-luxury-gold bg-linear-to-br from-primary to-primary-container font-headline text-[1.875rem] font-black text-white shadow-[0_10px_24px_rgba(125,6,51,0.22)]">
          {getInitials(user)}
        </div>
        <p className="font-headline text-lg font-bold text-dark-charcoal">{displayName}</p>
        <p className="mt-1 break-all text-[13px] text-on-surface-variant/80">{user.email}</p>
      </div>

      <nav className="p-3">
        {items.map(({ key, label, icon: Icon, to, onClick, active, danger }) => {
          const content = (
            <>
              <Icon className={iconClass(Boolean(active))} strokeWidth={2} />
              {label}
            </>
          );

          if (to) {
            return (
              <Link key={key} to={to} className={navItemClass(Boolean(active), danger)}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className={`${navItemClass(Boolean(active), danger)} w-full text-left`}
            >
              {content}
            </button>
          );
        })}

        <div className="mx-3 my-2.5 h-px bg-luxury-gold/16" />

        <button type="button" onClick={onSignOut} className={navItemClass(false, true)}>
          <LogOut className={iconClass(false)} strokeWidth={2} />
          Log out
        </button>
      </nav>
    </aside>
  );
}
