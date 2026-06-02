import { isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { z } from 'zod';

/** Backend expects ISO 3166-1 alpha-2 (e.g. VN), not alpha-3 (VNM). */
export const isoAlpha2CountryCodeSchema = z
  .string()
  .length(2, 'Invalid nationality.')
  .regex(/^[A-Z]{2}$/, 'Nationality must be an ISO alpha-2 code (e.g. VN).');

export const loginSchema = z.object({
  email: z.email('Invalid email format.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be at most 128 characters.'),
});

export const registerSchema = z
  .object({
    email: z.email('Invalid email format.'),
    firstName: z.string().min(1, 'Please enter your first name.'),
    lastName: z.string().min(1, 'Please enter your last name.'),
    acceptTerms: z.literal(true, 'Please accept the terms and conditions.'),
    phone: z.string().min(1, 'Please enter your phone number.'),
    nationality: isoAlpha2CountryCodeSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password must be at most 128 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }

    const phoneValue = data.phone.trim();
    const withCountryCode = phoneValue.startsWith('+');
    const parsedPhone = withCountryCode
      ? parsePhoneNumberFromString(phoneValue)
      : parsePhoneNumberFromString(phoneValue, data.nationality as CountryCode);
    const valid =
      Boolean(parsedPhone?.isValid()) &&
      (!withCountryCode ||
        (isValidPhoneNumber(phoneValue) && parsedPhone?.country === data.nationality));

    if (!valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: `Phone number is invalid or does not match nationality ${data.nationality}.`,
      });
    }
  });

export const passwordResetRequestSchema = z.object({
  email: z.email('Invalid email format.'),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Invalid confirmation code.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password must be at most 128 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormValues = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmFormValues = z.infer<typeof passwordResetConfirmSchema>;
