/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional IANA zone override, e.g. Asia/Ho_Chi_Minh */
  readonly VITE_CLIENT_TIMEZONE?: string;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
