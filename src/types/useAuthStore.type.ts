/* eslint-disable no-unused-vars */
import type { User } from './user.type';

export type RegisterPayload = Pick<
  User,
  'email' | 'password' | 'firstName' | 'lastName' | 'phone' | 'nationality'
> & {
  username?: string;
};

export interface AuthStore {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  setAccessToken(token: string | null): void;
  clearStore(): void;
  register(payload: RegisterPayload): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  fetchMe(): Promise<void>;
  refresh(): Promise<void>;
}
