import api from '../api/axios';
import type { Airport } from './airport.service';
import type { RegisterPayload } from '../types/useAuthStore.type';
import type { User } from '../types/user.type';
import { normalizeUser } from '../utils/normalizeUser';

/** Unwrap common API envelopes and token field names. */
function normalizeAuthPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const data = raw as Record<string, unknown>;
  const inner = data.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return data;
}

export type SignInResult = {
  accessToken: string | null;
  user: unknown;
};

export type AccountOverviewResult = {
  profile: User;
  tripStats: {
    completed: number;
    upcoming: number;
    cancelled: number;
  };
  recentAirports: Airport[];
};

function normalizeAccountOverview(raw: unknown): AccountOverviewResult | null {
  const payload = normalizeAuthPayload(raw);
  const profile = normalizeUser(payload.profile);
  if (!profile) return null;

  const tripStatsRaw =
    payload.tripStats && typeof payload.tripStats === 'object'
      ? (payload.tripStats as Record<string, unknown>)
      : {};

  return {
    profile,
    tripStats: {
      completed: typeof tripStatsRaw.completed === 'number' ? tripStatsRaw.completed : 0,
      upcoming: typeof tripStatsRaw.upcoming === 'number' ? tripStatsRaw.upcoming : 0,
      cancelled: typeof tripStatsRaw.cancelled === 'number' ? tripStatsRaw.cancelled : 0,
    },
    recentAirports: Array.isArray(payload.recentAirports)
      ? (payload.recentAirports as Airport[])
      : [],
  };
}

export const authService = {
  signUp: async (data: RegisterPayload) => {
    const res = await api.post('/api/auth/register', data);
    return res.data;
  },
  signIn: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<SignInResult> => {
    const res = await api.post('/api/auth/login', { email, password });
    const p = normalizeAuthPayload(res.data);
    const accessToken =
      (p.accessToken as string | undefined) ??
      (p.access_token as string | undefined) ??
      (p.token as string | undefined) ??
      null;
    const user = p.user ?? p.profile ?? null;
    return { accessToken, user };
  },
  signOut: async () => {
    const res = await api.post('/api/auth/logout');
    return res.data;
  },
  fetchMe: async () => {
    const res = await api.get('/api/users/me');
    return normalizeAuthPayload(res.data);
  },
  refresh: async () => {
    const res = await api.post('/api/auth/refresh');
    const p = normalizeAuthPayload(res.data);
    const accessToken =
      (p.accessToken as string | undefined) ??
      (p.access_token as string | undefined) ??
      (p.token as string | undefined) ??
      null;
    return { accessToken };
  },
  profile: async () => {
    const res = await api.get('/api/users/me');
    return normalizeAuthPayload(res.data);
  },
  fetchAccountOverview: async (): Promise<AccountOverviewResult | null> => {
    const res = await api.get('/api/account/overview');
    return normalizeAccountOverview(res.data);
  },
  updateMe: async (data: Record<string, unknown>) => {
    const res = await api.patch('/api/users/me', data);
    return normalizeAuthPayload(res.data);
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await api.post('/api/users/me/password', data);
    return res.data;
  },
  requestPasswordReset: async (data: { email: string }) => {
    const res = await api.post('/api/auth/password-reset/request', data);
    return res.data;
  },
  confirmPasswordReset: async (data: { token: string; password: string }) => {
    const res = await api.post('/api/auth/password-reset/confirm', data);
    return res.data;
  },
};
