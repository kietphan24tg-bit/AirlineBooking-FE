import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import FieldLabel from '../ui/FieldLabel';
import TextInput from '../ui/TextInput';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password confirmation does not match.',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  submitting?: boolean;
};

export default function ChangePasswordModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: ChangePasswordModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  if (!open) return null;

  const submitForm = handleSubmit(async (values) => {
    try {
      await onSubmit({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      onClose();
    } catch {
      toast.error('Unable to change password. Check your current password and try again.');
    }
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-dark-charcoal/50 p-4 backdrop-blur-sm"
      role="button"
      tabIndex={0}
      aria-label="Close password dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-md rounded-3xl border border-luxury-gold/20 bg-surface-lowest p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="change-password-title"
              className="font-headline text-xl font-bold text-dark-charcoal"
            >
              Change password
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant/80">
              You will need to sign in again after changing your password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant/80 transition-colors hover:bg-surface"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submitForm}>
          <div>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <TextInput
              id="current-password"
              type="password"
              autoComplete="current-password"
              hasError={!!errors.currentPassword}
              {...register('currentPassword')}
            />
            {errors.currentPassword ? (
              <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <TextInput
              id="new-password"
              type="password"
              autoComplete="new-password"
              hasError={!!errors.newPassword}
              {...register('newPassword')}
            />
            {errors.newPassword ? (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
            <TextInput
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              hasError={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-outline-variant/40 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-linear-to-br from-primary to-primary-container px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(125,6,51,0.16)] transition-all hover:brightness-105 disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
