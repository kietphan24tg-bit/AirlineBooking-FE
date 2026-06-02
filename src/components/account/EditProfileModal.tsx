import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  countryService,
  DEFAULT_NATIONALITY_CODE,
  FALLBACK_COUNTRY_OPTIONS,
} from '../../services/country.service';
import type { UpdateProfilePayload, User } from '../../types/user.type';
import FieldLabel from '../ui/FieldLabel';
import TextInput from '../ui/TextInput';

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    background: 'var(--color-surface-highest)',
    border: 'none',
    borderRadius: '0.375rem',
    boxShadow: 'none',
    minHeight: '48px',
    padding: '0 0.5rem',
    fontSize: '0.9375rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-on-surface)',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 90,
  }),
};

const editProfileSchema = z.object({
  lastName: z.string().trim().min(1, 'Last name is required.'),
  firstName: z.string().trim().min(1, 'First name is required.'),
  dob: z.string().optional(),
  nationality: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Nationality must be a 2-letter ISO code.'),
  identifyNumber: z.string().trim().optional(),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

type EditProfileModalProps = {
  open: boolean;
  user: User;
  onClose: () => void;
  onSave: (payload: UpdateProfilePayload) => Promise<void>;
};

function toDateInputValue(dob: string | null | undefined): string {
  if (!dob) return '';
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(dob);
  return isoMatch ? isoMatch[1] : '';
}

export default function EditProfileModal({ open, user, onClose, onSave }: EditProfileModalProps) {
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => countryService.fetchCountryOptions(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const nationalityOptions = countriesQuery.data ?? FALLBACK_COUNTRY_OPTIONS;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      lastName: user.lastName ?? '',
      firstName: user.firstName ?? '',
      dob: toDateInputValue(user.dob),
      nationality: user.nationality ?? DEFAULT_NATIONALITY_CODE,
      identifyNumber: user.identifyNumber ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      lastName: user.lastName ?? '',
      firstName: user.firstName ?? '',
      dob: toDateInputValue(user.dob),
      nationality: user.nationality ?? DEFAULT_NATIONALITY_CODE,
      identifyNumber: user.identifyNumber ?? '',
    });
  }, [open, reset, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await onSave({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        dob: values.dob?.trim() ? values.dob.trim() : null,
        nationality: values.nationality.trim().toUpperCase(),
        identifyNumber: values.identifyNumber?.trim() ? values.identifyNumber.trim() : null,
      });
      toast.success('Profile updated successfully.');
      onClose();
    } catch {
      toast.error('Unable to update profile. Please try again.');
    }
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-dark-charcoal/50 p-4 backdrop-blur-sm"
      role="button"
      tabIndex={0}
      aria-label="Close profile dialog"
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
        aria-labelledby="edit-profile-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-luxury-gold/20 bg-surface-lowest p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="edit-profile-title"
              className="font-headline text-xl font-bold text-dark-charcoal"
            >
              Edit profile
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant/80">
              Email and phone number cannot be changed here.
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

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="edit-last-name">Last name</FieldLabel>
              <TextInput
                id="edit-last-name"
                hasError={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName ? (
                <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="edit-first-name">Middle & first name</FieldLabel>
              <TextInput
                id="edit-first-name"
                hasError={!!errors.firstName}
                {...register('firstName')}
              />
              {errors.firstName ? (
                <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
              ) : null}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="edit-dob">Date of birth</FieldLabel>
            <TextInput id="edit-dob" type="date" hasError={!!errors.dob} {...register('dob')} />
          </div>

          <div>
            <FieldLabel htmlFor="edit-nationality">Nationality</FieldLabel>
            <Controller
              name="nationality"
              control={control}
              render={({ field }) => (
                <Select
                  inputId="edit-nationality"
                  options={nationalityOptions}
                  styles={selectStyles}
                  placeholder="Select nationality"
                  value={
                    nationalityOptions.find((country) => country.value === field.value) ?? null
                  }
                  onChange={(option) => field.onChange(option?.value ?? DEFAULT_NATIONALITY_CODE)}
                />
              )}
            />
            {errors.nationality ? (
              <p className="mt-1 text-xs text-red-500">{errors.nationality.message}</p>
            ) : null}
          </div>

          <div>
            <FieldLabel htmlFor="edit-identify-number">ID number</FieldLabel>
            <TextInput
              id="edit-identify-number"
              hasError={!!errors.identifyNumber}
              {...register('identifyNumber')}
            />
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
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-linear-to-br from-primary to-primary-container px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(125,6,51,0.16)] transition-all hover:brightness-105 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
