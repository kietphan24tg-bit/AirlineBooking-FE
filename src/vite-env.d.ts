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
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
