export interface User {
  id?: number;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  username?: string;
  acceptTerms?: boolean;
  phone?: string | null;
  nationality?: string | null;
  dob?: string | null;
  identifyNumber?: string | null;
  role?: string | null;
  createdAt?: string | null;
}

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  dob?: string | null;
  nationality?: string | null;
  identifyNumber?: string | null;
};
