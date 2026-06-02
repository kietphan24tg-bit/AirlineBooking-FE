import type { Airport } from '../services/airport.service';
import type { AccountOverviewResult } from '../services/auth.service';
import type { User } from '../types/user.type';

export type AccountMockScenario =
  | 'happy-path'
  | 'new-user'
  | 'incomplete-profile'
  | 'empty-recent-airports'
  | 'api-error'
  | 'slow-loading'
  | 'update-error'
  | 'password-error';

const RECENT_AIRPORTS: Airport[] = [
  {
    id: 1,
    code: 'SGN',
    name: 'Tan Son Nhat International Airport',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
  },
  {
    id: 2,
    code: 'HAN',
    name: 'Noi Bai International Airport',
    city: 'Ha Noi',
    country: 'Vietnam',
  },
  {
    id: 3,
    code: 'DAD',
    name: 'Da Nang International Airport',
    city: 'Da Nang',
    country: 'Vietnam',
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function baseProfile(): User {
  return {
    id: 1001,
    email: 'kiet.phan@example.com',
    firstName: 'Kiet',
    lastName: 'Phan',
    phone: '+84962745720',
    nationality: 'VN',
    dob: '2004-01-01',
    identifyNumber: '079204009999',
    role: 'USER',
    createdAt: '2026-05-01T08:30:00Z',
  };
}

export function buildAccountOverviewMock(
  scenario: AccountMockScenario
): AccountOverviewResult {
  const profile = baseProfile();

  switch (scenario) {
    case 'new-user':
      return {
        profile: {
          ...profile,
          firstName: 'New',
          lastName: 'Traveler',
          dob: null,
          identifyNumber: null,
        },
        tripStats: {
          completed: 0,
          upcoming: 0,
          cancelled: 0,
        },
        recentAirports: [],
      };
    case 'incomplete-profile':
      return {
        profile: {
          ...profile,
          phone: null,
          dob: null,
          identifyNumber: null,
        },
        tripStats: {
          completed: 4,
          upcoming: 1,
          cancelled: 0,
        },
        recentAirports: clone(RECENT_AIRPORTS.slice(0, 2)),
      };
    case 'empty-recent-airports':
      return {
        profile,
        tripStats: {
          completed: 9,
          upcoming: 2,
          cancelled: 1,
        },
        recentAirports: [],
      };
    default:
      return {
        profile,
        tripStats: {
          completed: 12,
          upcoming: 2,
          cancelled: 1,
        },
        recentAirports: clone(RECENT_AIRPORTS),
      };
  }
}
