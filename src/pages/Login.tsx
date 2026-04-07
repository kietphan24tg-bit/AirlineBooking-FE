import { zodResolver } from '@hookform/resolvers/zod';
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
    clearErrors,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });
  const signIn = useAuthStore((state) => state.signIn);

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    reset: resetForgot,
    setError: setForgotError,
    clearErrors: clearForgotErrors,
    formState: { errors: forgotErrors, isSubmitting: forgotSubmitting },
  } = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    clearErrors('root.serverError');
    try {
      await signIn(values.email, values.password);
      navigate('/home', { replace: true });
    } catch (error) {
      applyBackendFieldErrors<LoginFormValues>(error, setError, ['email', 'password']);
    }
  };

  const onForgotSubmit = async (values: PasswordResetRequestFormValues) => {
    clearForgotErrors('root.serverError');
    try {
      await authService.requestPasswordReset({ email: values.email.trim() });
      toast.success('Nếu email tồn tại, bạn sẽ nhận hướng dẫn đặt lại mật khẩu.');
      resetForgot();
      setForgotOpen(false);
    } catch (error) {
      applyBackendFieldErrors<PasswordResetRequestFormValues>(error, setForgotError, ['email']);
    }
  };

  return (
    <AuthLayout
      title="Đăng Nhập"
      subtitle="Chào mừng bạn trở lại với bầu trời của riêng mình."
      activeTab="login"
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
        {errors.root?.serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {errors.root.serverError.message}
          </p>
        )}
        <div>
          <FieldLabel htmlFor="login-email">Địa chỉ Email</FieldLabel>
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
              Mật khẩu
            </FieldLabel>
            <button
              type="button"
              className="text-[0.6875rem] font-bold text-secondary hover:underline"
              onClick={() => {
                resetForgot({ email: getValues('email') });
                setForgotOpen(true);
              }}
            >
              Quên mật khẩu?
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
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-primary"
            {...register('remember')}
          />
          Duy trì đăng nhập trên thiết bị này
        </label>
        <Button type="submit" disabled={isSubmitting}>
          Tiếp tục hành trình
        </Button>

        <div className="relative my-3 text-center">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgba(230,189,184,0.18)]" />
          <span className="relative bg-surface-lowest px-4 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60">
            Hoặc tiếp tục với
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Button
            type="button"
            variant="ghost"
            icon={
              <img
                alt="Google"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUn0nbvARamZwA1rj5iE0shrex_jevt3q5Bb11xT-HZ06xQOxI0Jsk-B3c6wPDU7uVbd1I2haU3lF3D6095w1GIwLnWo0dlMqQOMui51AlxflouXX3wEwEwzDU_ywvdUwnRPz0lWbiyHXSxluExVrPMbiehgi5XPWd-GHp3dx2ItCeOJRjRByXKIhNM1-lBhIgpBbYSfbmSvK0DFjeJdhL8BauGjqFljDS_j9pOOt70YGPPQy3jMt4aRdvKFauRjlKparmf67JFt9E"
                className="h-5 w-5"
              />
            }
          >
            Google
          </Button>
          <Button
            type="button"
            variant="ghost"
            icon={<span className="material-symbols-outlined text-xl">ios</span>}
          >
            Apple
          </Button>
        </div>
      </form>

      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <button
            type="button"
            aria-label="Đóng hộp thoại"
            className="absolute inset-0 cursor-default border-0 bg-black/45 p-0"
            onClick={() => setForgotOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[rgba(230,189,184,0.25)] bg-surface-lowest p-6 shadow-[var(--shadow-ambient)]">
            <h2
              id="forgot-password-title"
              className="font-headline text-xl font-bold tracking-[-0.02em] text-on-surface"
            >
              Quên mật khẩu
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
            </p>
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={handleSubmitForgot(onForgotSubmit)}
            >
              {forgotErrors.root?.serverError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {forgotErrors.root.serverError.message}
                </p>
              )}
              <div>
                <FieldLabel htmlFor="forgot-email">Địa chỉ Email</FieldLabel>
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
                  Hủy
                </Button>
                <Button type="submit" disabled={forgotSubmitting}>
                  Gửi yêu cầu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
