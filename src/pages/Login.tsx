import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/useAuthStore';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';
import { authService } from '../services/auth.service';
import { applyBackendFieldErrors } from '../utils/formError';
import {
  loginSchema,
  passwordResetRequestSchema,
  type LoginFormValues,
  type PasswordResetRequestFormValues,
} from '../validations/auth.schema';

export default function Login() {
  const navigate = useNavigate();
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (!forgotOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setForgotOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [forgotOpen]);

  const {
    register,
    getValues,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const signIn = useAuthStore((state) => state.signIn);

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    reset: resetForgot,
    formState: { errors: forgotErrors, isSubmitting: forgotSubmitting },
  } = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await signIn(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      applyBackendFieldErrors<LoginFormValues>(error, setError, ['email', 'password']);
    }
  };

  const onForgotSubmit = async (values: PasswordResetRequestFormValues) => {
    try {
      await authService.requestPasswordReset({ email: values.email.trim() });
      toast.success('If the email exists, you will receive password reset instructions.');
      resetForgot();
      setForgotOpen(false);
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Email service may be unavailable. Please try again later.');
      } else if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as
          | { error?: { code?: string; message?: string } }
          | undefined;
        const code = apiError?.error?.code;
        const apiMessage = apiError?.error?.message;
        if (code === 'TOO_MANY_PASSWORD_RESET_REQUESTS') {
          toast.error('Too many reset attempts. Please wait about 15 minutes and try again.');
        } else if (code === 'PASSWORD_RESET_EMAIL_FAILED') {
          toast.error('Unable to send reset email. Please try again later.');
        } else {
          toast.error(
            apiMessage || 'Unable to send password reset instructions. Please try again.'
          );
        }
      } else {
        toast.error('Unable to send password reset instructions. Please try again.');
      }
    }
  };

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back to your private sky." activeTab="login">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
          <TextInput
            id="login-email"
            type="email"
            placeholder="name@example.com"
            hasError={!!errors.email}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="login-email-error" className="mt-1 text-xs text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-end justify-between">
            <FieldLabel htmlFor="login-password" className="mb-0">
              Password
            </FieldLabel>
            <button
              type="button"
              className="text-[0.6875rem] font-bold text-secondary hover:underline"
              onClick={() => {
                resetForgot({ email: getValues('email') });
                setForgotOpen(true);
              }}
            >
              Forgot password?
            </button>
          </div>
          <TextInput
            id="login-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="login-password-error" className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Continue your journey'}
        </Button>
      </form>

      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex h-[100dvh] min-h-[100dvh] items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 cursor-default border-0 bg-black/45 p-0"
            onClick={() => setForgotOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[rgba(230,189,184,0.25)] bg-surface-lowest p-6 shadow-(--shadow-ambient)">
            <h2
              id="forgot-password-title"
              className="font-headline text-xl font-bold tracking-[-0.02em] text-on-surface"
            >
              Forgot password
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Enter your registered email. We will send password reset instructions.
            </p>
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={handleSubmitForgot(onForgotSubmit)}
            >
              <div>
                <FieldLabel htmlFor="forgot-email">Email Address</FieldLabel>
                <TextInput
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  hasError={!!forgotErrors.email}
                  aria-describedby={forgotErrors.email ? 'forgot-email-error' : undefined}
                  {...registerForgot('email')}
                />
                {forgotErrors.email && (
                  <p id="forgot-email-error" className="mt-1 text-xs text-red-500">
                    {forgotErrors.email.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={forgotSubmitting}>
                  {forgotSubmitting ? 'Sending…' : 'Send request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
