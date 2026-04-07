import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

const nationalityEnum = z.enum(['VN', 'US', 'JP', 'KR']);

export const loginSchema = z.object({
  email: z.email('Email không đúng định dạng.'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu tối đa 128 ký tự.'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: z.email('Email không đúng định dạng.'),
    firstName: z.string().min(1, 'Vui lòng nhập tên.'),
    lastName: z.string().min(1, 'Vui lòng nhập họ.'),
    phone: z.string().min(1, 'Vui lòng nhập số điện thoại.'),
    nationality: nationalityEnum,
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
      .max(128, 'Mật khẩu tối đa 128 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
      });
    }

    const phoneValue = data.phone.trim();
    const withCountryCode = phoneValue.startsWith('+');
    const parsedPhone = withCountryCode
      ? parsePhoneNumberFromString(phoneValue)
      : parsePhoneNumberFromString(phoneValue, data.nationality);
    const valid =
      Boolean(parsedPhone?.isValid()) &&
      (!withCountryCode ||
        (isValidPhoneNumber(phoneValue) && parsedPhone?.country === data.nationality));

    if (!valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: `Số điện thoại không hợp lệ hoặc không khớp quốc tịch ${data.nationality}.`,
      });
    }
  });

export const passwordResetRequestSchema = z.object({
  email: z.email('Email không đúng định dạng.'),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Mã xác nhận không hợp lệ.'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
      .max(128, 'Mật khẩu tối đa 128 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormValues = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmFormValues = z.infer<typeof passwordResetConfirmSchema>;
export const nationalityOptions = [
  { label: 'Việt Nam', value: 'VN' },
  { label: 'Hoa Kỳ', value: 'US' },
  { label: 'Nhật Bản', value: 'JP' },
  { label: 'Hàn Quốc', value: 'KR' },
] as const;
