import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AccountProfileCard from '../components/account/AccountProfileCard';
import AccountRecentAirportsCard from '../components/account/AccountRecentAirportsCard';
import AccountSecurityCard from '../components/account/AccountSecurityCard';
import AccountSidebar from '../components/account/AccountSidebar';
import AccountStatCards from '../components/account/AccountStatCards';
import ChangePasswordModal from '../components/account/ChangePasswordModal';
import EditProfileModal from '../components/account/EditProfileModal';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import { authService, type AccountOverviewResult } from '../services/auth.service';
import { countryService, FALLBACK_COUNTRY_OPTIONS } from '../services/country.service';
import { useAuthStore } from '../stores/useAuthStore';
import type { UpdateProfilePayload } from '../types/user.type';
import { normalizeUser } from '../utils/normalizeUser';

export default function AccountManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const loading = useAuthStore((state) => state.loading);
  const signOut = useAuthStore((state) => state.signOut);

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => countryService.fetchCountryOptions(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const overviewQuery = useQuery({
    queryKey: ['account', 'overview'],
    enabled: Boolean(accessToken),
    queryFn: async () => {
      const overview = await authService.fetchAccountOverview();
      if (!overview) {
        throw new Error('Unable to load account overview');
      }
      return overview;
    },
    staleTime: 30_000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const updated = await authService.updateMe(payload);
      const profile = normalizeUser(updated);
      if (!profile) {
        throw new Error('Invalid profile response');
      }
      return profile;
    },
    onSuccess: (profile) => {
      useAuthStore.setState({ user: profile });
      queryClient.setQueryData<AccountOverviewResult | undefined>(
        ['account', 'overview'],
        (current) => (current ? { ...current, profile } : current)
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      toast.success('Doi mat khau thanh cong. Vui long dang nhap lai.');
      queryClient.clear();
      useAuthStore.getState().clearStore();
      navigate('/login', { replace: true });
    },
  });

  const user = overviewQuery.data?.profile ?? null;

  const nationalityLabel = useMemo(() => {
    if (!user?.nationality) return null;
    const options = countriesQuery.data ?? FALLBACK_COUNTRY_OPTIONS;
    return options.find((country) => country.value === user.nationality)?.label ?? user.nationality;
  }, [countriesQuery.data, user?.nationality]);

  const scrollToSecurity = () => {
    document
      .getElementById('account-security')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!accessToken && !loading) {
    return <Navigate to="/login" replace />;
  }

  if (overviewQuery.isLoading || (loading && !user)) {
    return (
      <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface">
        <MarketingNav />
        <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-center justify-center px-6 py-32">
          <p className="text-sm text-on-surface-variant/80">Dang tai tai khoan...</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (overviewQuery.isError || !user || !overviewQuery.data) {
    return (
      <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface">
        <MarketingNav />
        <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-center justify-center px-6 py-32">
          <div className="text-center">
            <p className="text-sm text-on-surface-variant/80">Khong the tai thong tin tai khoan.</p>
            <button
              type="button"
              onClick={() => void overviewQuery.refetch()}
              className="mt-4 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-white"
            >
              Thu lai
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const overview = overviewQuery.data;
  const recentAirports = overview.recentAirports;
  const tripStats = overview.tripStats;

  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
      <MarketingNav />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-20 pt-28 md:pt-32">
        <h1 className="font-headline text-[30px] font-black tracking-tight text-dark-charcoal">
          Tai khoan cua toi
        </h1>
        <p className="mb-9 mt-1.5 text-[15px] text-on-surface-variant/80">
          Quan ly thong tin ca nhan va bao mat tai khoan.
        </p>

        <div className="grid items-start gap-7 lg:grid-cols-[272px_1fr]">
          <AccountSidebar
            user={user}
            onSignOut={() => void handleSignOut()}
            onSecurityClick={scrollToSecurity}
          />

          <div className="flex flex-col gap-6">
            <AccountStatCards
              completedTrips={tripStats.completed}
              upcomingTrips={tripStats.upcoming}
              frequentAirports={recentAirports.length}
              loading={overviewQuery.isFetching}
            />

            <AccountProfileCard
              user={user}
              nationalityLabel={nationalityLabel}
              onEdit={() => setEditOpen(true)}
            />

            <AccountRecentAirportsCard
              airports={recentAirports}
              loading={overviewQuery.isFetching}
            />

            <AccountSecurityCard onChangePassword={() => setPasswordOpen(true)} />
          </div>
        </div>
      </main>

      <SiteFooter />

      <EditProfileModal
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSave={async (payload) => {
          await updateProfileMutation.mutateAsync(payload);
        }}
      />
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSubmit={(payload) => changePasswordMutation.mutateAsync(payload)}
        submitting={changePasswordMutation.isPending}
      />
    </div>
  );
}
