/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional IANA zone override, e.g. Asia/Ho_Chi_Minh */
  readonly VITE_CLIENT_TIMEZONE?: string;
  /**
   * When `'true'`, `bookingService.lookupBooking` and `getManageOptions`
   * resolve from `src/mocks/manageBooking.ts` instead of calling the API.
   * Useful for screenshot-driven UI iteration without a working backend.
   */
  readonly VITE_MOCK_MANAGE_BOOKING?: string;
  /** When 'true', account service methods resolve from src/mocks/account.ts. */
  readonly VITE_MOCK_ACCOUNT?: string;
  /** Default account mock scenario, e.g. happy-path or api-error. */
  readonly VITE_MOCK_ACCOUNT_SCENARIO?: string;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
