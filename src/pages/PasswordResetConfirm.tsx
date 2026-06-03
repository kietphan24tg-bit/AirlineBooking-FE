import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';
import { authService } from '../services/auth.service';
import { applyBackendFieldErrors } from '../utils/formError';
import {
  passwordResetConfirmSchema,
  type PasswordResetConfirmFormValues,
} from '../validations/auth.schema';

export default function PasswordResetConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token')?.trim() || searchParams.get('code')?.trim() || '';

  const {
    register,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetConfirmFormValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    setValue('token', tokenFromUrl);
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (values: PasswordResetConfirmFormValues) => {
    try {
      await authService.confirmPasswordReset({
        token: values.token.trim(),
        password: values.password,
      });
      toast.success('Password reset successful. Please sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      applyBackendFieldErrors<PasswordResetConfirmFormValues>(error, setError, [
        'token',
        'password',
        'confirmPassword',
      ]);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter the code from your email and your new password."
      showAuthTabs={false}
    >
      {!tokenFromUrl && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The confirmation code is missing from the link. Check the link in your email or paste the
          code into the field below.
        </p>
      )}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <FieldLabel htmlFor="reset-token">Confirmation code</FieldLabel>
          <TextInput
            id="reset-token"
            type="text"
            placeholder="Paste the code from your email"
            hasError={!!errors.token}
            aria-describedby={errors.token ? 'reset-token-error' : undefined}
            autoComplete="one-time-code"
            {...register('token')}
          />
          {errors.token && (
            <p id="reset-token-error" className="mt-1 text-xs text-red-500">
              {errors.token.message}
            </p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <TextInput
            id="reset-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            aria-describedby={errors.password ? 'reset-password-error' : undefined}
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <p id="reset-password-error" className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="reset-confirm-password">Confirm password</FieldLabel>
          <TextInput
            id="reset-confirm-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'reset-confirm-password-error' : undefined}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="reset-confirm-password-error" className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Confirm password reset
        </Button>
        <p className="text-center text-sm text-on-surface-variant">
          <Link to="/login" className="font-bold text-secondary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
