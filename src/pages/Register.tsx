import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { useAuthStore } from '../stores/useAuthStore';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';
import {
  countryService,
  DEFAULT_NATIONALITY_CODE,
  FALLBACK_COUNTRY_OPTIONS,
} from '../services/country.service';
import { applyBackendFieldErrors } from '../utils/formError';
import { registerSchema, type RegisterFormValues } from '../validations/auth.schema';

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
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => countryService.fetchCountryOptions(),
    staleTime: 30 * 24 * 60 * 60 * 1000,
  });
  const nationalityOptions = countriesQuery.data ?? FALLBACK_COUNTRY_OPTIONS;

  const [phonePrefix, setPhonePrefix] = useState<string>('');

  const {
    control,
    register,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      acceptTerms: true,
      phone: '',
      nationality: DEFAULT_NATIONALITY_CODE,
      password: '',
      confirmPassword: '',
    },
  });
  const registerAccount = useAuthStore((state) => state.register);

  // Set initial dial code for default nationality
  useEffect(() => {
    const defaultCountry = nationalityOptions.find((c) => c.value === DEFAULT_NATIONALITY_CODE);
    if (defaultCountry?.dialCode) {
      setPhonePrefix(defaultCountry.dialCode);
      setValue('phone', defaultCountry.dialCode + ' ');
    }
  }, [nationalityOptions, setValue]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerAccount({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        acceptTerms: true,
        phone: values.phone,
        nationality: values.nationality,
        password: values.password,
      });
    } catch (error) {
      applyBackendFieldErrors<RegisterFormValues>(error, setError, [
        'email',
        'firstName',
        'lastName',
        'acceptTerms',
        'phone',
        'nationality',
        'password',
        'confirmPassword',
      ]);
    }
  };

  return (
    <AuthLayout
      title="Sign Up"
      subtitle="Create an account to begin your luxury journey."
      activeTab="register"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <FieldLabel htmlFor="register-email">Email Address</FieldLabel>
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
            <FieldLabel htmlFor="register-first-name">First Name</FieldLabel>
            <TextInput
              id="register-first-name"
              type="text"
              placeholder="First name"
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
            <FieldLabel htmlFor="register-last-name">Last Name</FieldLabel>
            <TextInput
              id="register-last-name"
              type="text"
              placeholder="Last name"
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
          <FieldLabel htmlFor="register-nationality">Nationality</FieldLabel>
          <Controller
            name="nationality"
            control={control}
            render={({ field }) => (
              <Select
                inputId="register-nationality"
                options={nationalityOptions}
                placeholder={countriesQuery.isLoading ? 'Loading countries...' : 'Select country'}
                isLoading={countriesQuery.isLoading}
                isDisabled={countriesQuery.isLoading}
                styles={selectStyles}
                value={nationalityOptions.find((country) => country.value === field.value) ?? null}
                onChange={(option) => {
                  const selectedValue = option?.value ?? DEFAULT_NATIONALITY_CODE;
                  field.onChange(selectedValue);

                  // Update phone prefix when country changes
                  const selectedCountry = nationalityOptions.find((c) => c.value === selectedValue);
                  if (selectedCountry?.dialCode) {
                    setPhonePrefix(selectedCountry.dialCode);
                    // Replace the entire phone value with new dial code
                    setValue('phone', selectedCountry.dialCode + ' ', { shouldValidate: false });
                    // Clear any existing phone errors since we're resetting the field
                    clearErrors('phone');
                  } else {
                    // Country has no dial code, clear prefix and phone
                    setPhonePrefix('');
                    setValue('phone', '', { shouldValidate: false });
                    clearErrors('phone');
                  }
                }}
              />
            )}
          />
          {errors.nationality && (
            <p className="mt-1 text-xs text-red-500">{errors.nationality.message}</p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="register-phone">Phone Number</FieldLabel>
          <TextInput
            id="register-phone"
            type="tel"
            placeholder={phonePrefix ? `${phonePrefix} 901234567` : 'Enter phone number'}
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
          <FieldLabel htmlFor="register-password">Password</FieldLabel>
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
          <FieldLabel htmlFor="register-confirm-password">Confirm Password</FieldLabel>
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
          {isSubmitting ? 'Creating account…' : 'Sign Up'}
        </Button>
      </form>
    </AuthLayout>
  );
}
