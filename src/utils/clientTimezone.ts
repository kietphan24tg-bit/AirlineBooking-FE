/**
 * IANA timezone for `X-Timezone` and locale-aware APIs.
 *
 * Uses `Intl.DateTimeFormat().resolvedOptions().timeZone` (no hardcoded city).
 * On Windows, UTC+7 “Hanoi” is often reported as `Asia/Bangkok` — same offset;
 * if the browser locale is Vietnamese (`vi`), we normalize to `Asia/Ho_Chi_Minh`
 * so backends that key off the exact zone behave as expected in VN.
 *
 * Override (optional): set `VITE_CLIENT_TIMEZONE=Asia/Ho_Chi_Minh` in `.env`.
 */
export function getClientTimezone(): string {
  const forced = String(import.meta.env.VITE_CLIENT_TIMEZONE ?? '').trim();
  if (forced) return forced;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz !== 'string' || tz.length === 0) return 'UTC';

    const lang = (typeof navigator !== 'undefined' && navigator.language) || '';
    if (tz === 'Asia/Bangkok' && /^vi\b/i.test(lang)) {
      return 'Asia/Ho_Chi_Minh';
    }

    return tz;
  } catch {
    return 'UTC';
  }
}
