import type { User } from '../types/user.type';

export function normalizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const email = typeof data.email === 'string' ? data.email : '';
  const firstName = typeof data.firstName === 'string' ? data.firstName : '';
  const lastName = typeof data.lastName === 'string' ? data.lastName : '';

  if (!email && !firstName && !lastName) return null;

  return {
    id: typeof data.id === 'number' ? data.id : undefined,
    email,
    firstName,
    lastName,
    username: typeof data.username === 'string' ? data.username : undefined,
    phone: typeof data.phone === 'string' ? data.phone : data.phone === null ? null : undefined,
    nationality:
      typeof data.nationality === 'string'
        ? data.nationality
        : data.nationality === null
          ? null
          : undefined,
    dob: typeof data.dob === 'string' ? data.dob : data.dob === null ? null : undefined,
    identifyNumber:
      typeof data.identifyNumber === 'string'
        ? data.identifyNumber
        : data.identifyNumber === null
          ? null
          : undefined,
    role: typeof data.role === 'string' ? data.role : undefined,
    createdAt:
      typeof data.createdAt === 'string'
        ? data.createdAt
        : data.createdAt === null
          ? null
          : undefined,
  };
}
