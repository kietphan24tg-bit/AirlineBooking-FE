import { z } from 'zod';

const passengerTypeEnum = z.enum(['ADULT', 'CHILD', 'INFANT']);
const identifyTypeEnum = z.enum(['ID_CARD', 'PASSPORT']);
const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);

const MAX_PHONE_LENGTH = 15;

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function ageInYearsAt(dateOfBirth: Date, today: Date): number {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

function isUnderAgeLimit(dateOfBirth: Date, today: Date, years: number): boolean {
  const threshold = new Date(
    dateOfBirth.getFullYear() + years,
    dateOfBirth.getMonth(),
    dateOfBirth.getDate()
  );
  return threshold.getTime() > today.getTime();
}

const passengerSchema = z.object({
  firstName: z.string().trim().min(1, 'Please enter the first and middle name.'),
  lastName: z.string().trim().min(1, 'Please enter the last name.'),
  dateOfBirth: z.string().min(1, 'Please select a date of birth.'),
  gender: genderEnum,
  nationality: z.string().trim().min(1, 'Nationality is required.'),
  passengerType: passengerTypeEnum,
  identifyType: identifyTypeEnum,
  identifyNumber: z.string().trim(),
  expiryDate: z.string(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export const passengerInfoSchema = z
  .object({
    passengers: z.array(passengerSchema).min(1, 'At least one passenger is required.'),
  })
  .superRefine((data, ctx) => {
    const today = startOfToday();

    data.passengers.forEach((passenger, index) => {
      const dateOfBirth = parseDateOnly(passenger.dateOfBirth);
      if (!dateOfBirth) {
        ctx.addIssue({
          code: 'custom',
          path: ['passengers', index, 'dateOfBirth'],
          message: 'Date of birth is invalid.',
        });
      } else {
        if (dateOfBirth.getTime() > today.getTime()) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'dateOfBirth'],
            message: 'Date of birth cannot be in the future.',
          });
        }

        const age = ageInYearsAt(dateOfBirth, today);
        if (passenger.passengerType === 'ADULT' && age < 12) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'dateOfBirth'],
            message: 'Adult passengers must be at least 12 years old.',
          });
        }
        if (passenger.passengerType === 'CHILD' && (age < 2 || age >= 12)) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'dateOfBirth'],
            message: 'Child passengers must be between 2 and under 12 years old.',
          });
        }
        if (passenger.passengerType === 'INFANT' && !isUnderAgeLimit(dateOfBirth, today, 2)) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'dateOfBirth'],
            message: 'Infant passengers must be under 2 years old.',
          });
        }
      }

      if (passenger.passengerType === 'ADULT') {
        if (!passenger.identifyNumber) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'identifyNumber'],
            message: 'Please enter the document number.',
          });
        }

        const isPrimaryContact = index === 0;
        if (isPrimaryContact) {
          if (!passenger.email) {
            ctx.addIssue({
              code: 'custom',
              path: ['passengers', index, 'email'],
              message: 'Please enter a contact email.',
            });
          } else if (!z.email().safeParse(passenger.email).success) {
            ctx.addIssue({
              code: 'custom',
              path: ['passengers', index, 'email'],
              message: 'Email format is invalid.',
            });
          }

          if (!passenger.phone) {
            ctx.addIssue({
              code: 'custom',
              path: ['passengers', index, 'phone'],
              message: 'Please enter a contact phone number.',
            });
          } else if (!/^\+?[0-9\s()-]{8,15}$/.test(passenger.phone)) {
            ctx.addIssue({
              code: 'custom',
              path: ['passengers', index, 'phone'],
              message: 'Phone number is invalid.',
            });
          }
        } else if (passenger.phone && passenger.phone.length > MAX_PHONE_LENGTH) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'phone'],
            message: 'Phone number is invalid.',
          });
        }
      }
    });
  });

export type PassengerInfoFormValues = z.infer<typeof passengerInfoSchema>;
