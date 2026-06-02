import api from '../api/axios';
import {
  buildAccountOverviewMock,
  type AccountMockScenario,
} from '../mocks/account';
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

const DEFAULT_ACCOUNT_MOCK_SCENARIO: AccountMockScenario = 'happy-path';
let activeAccountMockScenario: AccountMockScenario | null = null;
let accountOverviewMockState: AccountOverviewResult | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isAccountMockScenario(value: string | null | undefined): value is AccountMockScenario {
  return [
    'happy-path',
    'new-user',
    'incomplete-profile',
    'empty-recent-airports',
    'api-error',
    'slow-loading',
    'update-error',
    'password-error',
  ].includes(String(value));
}

function resolveAccountMockScenario(): AccountMockScenario | null {
  const envEnabled = import.meta.env?.VITE_MOCK_ACCOUNT === 'true';
  const envScenario = import.meta.env?.VITE_MOCK_ACCOUNT_SCENARIO;

  let urlEnabled = false;
  let urlScenario: string | null = null;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    urlEnabled = params.get('mockAccount') === '1';
    urlScenario = params.get('mockAccountScenario');
  }

  if (!envEnabled && !urlEnabled) return null;

  if (isAccountMockScenario(urlScenario)) return urlScenario;
  if (isAccountMockScenario(envScenario)) return envScenario;
  return DEFAULT_ACCOUNT_MOCK_SCENARIO;
}

function getAccountMockState(): AccountOverviewResult {
  const scenario = resolveAccountMockScenario() ?? DEFAULT_ACCOUNT_MOCK_SCENARIO;
  if (scenario !== activeAccountMockScenario || !accountOverviewMockState) {
    activeAccountMockScenario = scenario;
    accountOverviewMockState = buildAccountOverviewMock(scenario);
  }
  return clone(accountOverviewMockState);
}

function setAccountMockState(next: AccountOverviewResult): void {
  accountOverviewMockState = clone(next);
}

function mockDelayMs(scenario: AccountMockScenario | null): number {
  return scenario === 'slow-loading' ? 1500 : 250;
}

async function resolveWithMockDelay<T>(value: T, scenario: AccountMockScenario | null): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, mockDelayMs(scenario)));
  return value;
}

function requireMockScenario(): AccountMockScenario | null {
  return resolveAccountMockScenario();
}

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
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      return resolveWithMockDelay({ success: true }, mockScenario);
    }
    const res = await api.post('/api/auth/logout');
    return res.data;
  },
  fetchMe: async () => {
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      return resolveWithMockDelay(getAccountMockState().profile, mockScenario);
    }
    const res = await api.get('/api/users/me');
    return normalizeAuthPayload(res.data);
  },
  refresh: async () => {
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      return resolveWithMockDelay({ accessToken: 'mock-account-token' }, mockScenario);
    }
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
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      return resolveWithMockDelay(getAccountMockState().profile, mockScenario);
    }
    const res = await api.get('/api/users/me');
    return normalizeAuthPayload(res.data);
  },
  fetchAccountOverview: async (): Promise<AccountOverviewResult | null> => {
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      if (mockScenario === 'api-error') {
        await resolveWithMockDelay(null, mockScenario);
        throw new Error('Mock account overview failed');
      }
      return resolveWithMockDelay(getAccountMockState(), mockScenario);
    }
    const res = await api.get('/api/account/overview');
    return normalizeAccountOverview(res.data);
  },
  updateMe: async (data: Record<string, unknown>) => {
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      if (mockScenario === 'update-error') {
        await resolveWithMockDelay(null, mockScenario);
        throw new Error('Mock profile update failed');
      }
      const current = getAccountMockState();
      const next = {
        ...current,
        profile: {
          ...current.profile,
          ...data,
        },
      };
      setAccountMockState(next);
      return resolveWithMockDelay(next.profile, mockScenario);
    }
    const res = await api.patch('/api/users/me', data);
    return normalizeAuthPayload(res.data);
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const mockScenario = requireMockScenario();
    if (mockScenario) {
      if (mockScenario === 'password-error') {
        await resolveWithMockDelay(null, mockScenario);
        throw new Error('Mock password change failed');
      }
      return resolveWithMockDelay({ success: true, ...data }, mockScenario);
    }
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
