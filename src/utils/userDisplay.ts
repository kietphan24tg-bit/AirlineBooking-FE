import type { User } from '../types/user.type';

export function getDisplayName(
  user: Pick<User, 'firstName' | 'lastName' | 'email' | 'username'>
): string {
  const fullName = [user.firstName, user.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();

  return fullName || user.username || user.email || 'User';
}

export function getInitials(
  user: Pick<User, 'firstName' | 'lastName' | 'email' | 'username'> | null
): string {
  if (!user) return 'US';

  const displayName = getDisplayName(user);
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return (nameParts[0] || 'US').slice(0, 2).toUpperCase();
}

export function formatMemberSince(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
}

export function formatDobLabel(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return dob;
  return date.toLocaleDateString('vi-VN');
}

export function maskIdentifyNumber(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 6)
    return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(trimmed.length - 2, 0))}`;
  return `${trimmed.slice(0, 6)}${'*'.repeat(8)}`;
}
