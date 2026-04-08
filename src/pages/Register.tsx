import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { useAuthStore } from '../stores/useAuthStore';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';
import { applyBackendFieldErrors } from '../utils/formError';
import {
  nationalityOptions,
  registerSchema,
  type RegisterFormValues,
} from '../validations/auth.schema';

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    background: 'var(--color-surface-highest)',
    border: 'none',
    borderRadius: '0.375rem',
    boxShadow: 'none',
    minHeight: '56px',
    padding: '0 0.5rem',
    fontSize: '0.9375rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-on-surface)',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    borderRadius: '0.375rem',
    border: '1px solid rgba(230, 189, 184, 0.3)',
    boxShadow: '0 12px 40px rgba(26, 28, 28, 0.08)',
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    background: state.isSelected ? '#fef9f0' : state.isFocused ? '#f3f3f3' : 'transparent',
    color: 'var(--color-on-surface)',
    cursor: 'pointer',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
};

export default function Register() {
  const {
    control,
    register,
    handleSubmit,
    trigger,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      nationality: 'VN',
      password: '',
      confirmPassword: '',
    },
  });
  const registerAccount = useAuthStore((state) => state.register);

  const onSubmit = async (values: RegisterFormValues) => {
    clearErrors('root.serverError');
    try {
      await registerAccount({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        nationality: values.nationality,
        password: values.password,
      });
    } catch (error) {
      applyBackendFieldErrors<RegisterFormValues>(error, setError, [
        'email',
        'firstName',
        'lastName',
        'phone',
        'nationality',
        'password',
        'confirmPassword',
      ]);
    }
  };

  return (
    <AuthLayout
      title="Đăng Ký"
      subtitle="Tạo tài khoản để bắt đầu hành trình sang trọng của bạn."
      activeTab="register"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        {errors.root?.serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {errors.root.serverError.message}
          </p>
        )}
        <div>
          <FieldLabel htmlFor="register-email">Địa chỉ Email</FieldLabel>
          <TextInput
            id="register-email"
            type="email"
            placeholder="name@example.com"
            hasError={!!errors.email}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="register-email-error" className="mt-1 text-xs text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="register-first-name">Tên</FieldLabel>
            <TextInput
              id="register-first-name"
              type="text"
              placeholder="Tên"
              hasError={!!errors.firstName}
              aria-describedby={errors.firstName ? 'register-first-name-error' : undefined}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p id="register-first-name-error" className="mt-1 text-xs text-red-500">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="register-last-name">Họ</FieldLabel>
            <TextInput
              id="register-last-name"
              type="text"
              placeholder="Họ"
              hasError={!!errors.lastName}
              aria-describedby={errors.lastName ? 'register-last-name-error' : undefined}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p id="register-last-name-error" className="mt-1 text-xs text-red-500">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="register-phone">Số điện thoại</FieldLabel>
          <TextInput
            id="register-phone"
            type="tel"
            placeholder="Nhập số điện thoại"
            hasError={!!errors.phone}
            aria-describedby={errors.phone ? 'register-phone-error' : undefined}
            {...register('phone')}
          />
          {errors.phone && (
            <p id="register-phone-error" className="mt-1 text-xs text-red-500">
              {errors.phone.message}
            </p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="register-nationality">Quốc tịch</FieldLabel>
          <Controller
            name="nationality"
            control={control}
            render={({ field }) => (
              <Select
                inputId="register-nationality"
                options={nationalityOptions}
                placeholder="Chọn quốc gia"
                styles={selectStyles}
                value={nationalityOptions.find((country) => country.value === field.value) ?? null}
                onChange={(option) => {
                  field.onChange(option?.value ?? 'VN');
                  void trigger('phone');
                }}
              />
            )}
          />
          {errors.nationality && (
            <p className="mt-1 text-xs text-red-500">{errors.nationality.message}</p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="register-password">Mật khẩu</FieldLabel>
          <TextInput
            id="register-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="register-password-error" className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="register-confirm-password">Xác nhận mật khẩu</FieldLabel>
          <TextInput
            id="register-confirm-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? 'register-confirm-password-error' : undefined
            }
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="register-confirm-password-error" className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" className="mt-3" disabled={isSubmitting}>
          Đăng ký
        </Button>
      </form>
    </AuthLayout>
  );
}
