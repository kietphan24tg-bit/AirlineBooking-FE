import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowRight, Baby, ChevronDown, Loader2, User, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import BookingStepper from '../components/booking/BookingStepper';
import AmbientSweep from '../components/layout/AmbientSweep';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';
import { bookingService } from '../services/booking.service';
import { flightService } from '../services/flight.service';
import { useBookingStore } from '../stores/useBookingStore';
import type {
  BookingContactPayload,
  BookingPassengerPayload,
  IdentifyType,
  PassengerType,
} from '../types/booking.types';
import type {
  FlightRevalidateFareRequest,
  FlightRevalidateItineraryRequest,
  FlightRevalidatePassengerSummary,
} from '../types/flight.types';
import { passengerInfoSchema, type PassengerInfoFormValues } from '../validations/passenger.schema';
import { getAxiosErrorCode, getAxiosErrorMessage } from '../utils/apiError';

type PassengerFormEntry = PassengerInfoFormValues['passengers'][number];

type PassengerSection = {
  passengerType: PassengerType;
  indexWithinType: number;
};

type PendingPassengerRevalidationState =
  | {
      kind: 'ONE_WAY';
      request: FlightRevalidateFareRequest;
      originPath: string;
    }
  | {
      kind: 'ROUND_TRIP';
      request: FlightRevalidateItineraryRequest;
      originPath: string;
      restoreOutboundSelection?: unknown;
    };

type PassengerInfoLocationState = {
  pendingRevalidation?: PendingPassengerRevalidationState;
};

const PASSENGER_TYPE_LABELS: Record<PassengerType, string> = {
  ADULT: 'Adult',
  CHILD: 'Child',
  INFANT: 'Infant',
};

const PASSENGER_TYPE_DESCRIPTIONS: Partial<Record<PassengerType, string>> = {
  CHILD: 'From 2 to under 12 years old',
  INFANT: 'Under 2 years old',
};

const PASSENGER_TYPE_ICONS = {
  ADULT: User,
  CHILD: Users,
  INFANT: Baby,
} as const;

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
] as const;

const IDENTIFY_TYPE_OPTIONS: { value: IdentifyType; label: string }[] = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
];

const DEFAULT_NATIONALITY = 'Vietnam';

function normalizeIdentifyType(value: string | undefined): IdentifyType {
  return value === 'PASSPORT' ? 'PASSPORT' : 'ID_CARD';
}

function buildPassengerSections(
  passengerSummary: FlightRevalidatePassengerSummary | null
): PassengerSection[] {
  if (!passengerSummary) return [];

  return [
    ...Array.from({ length: passengerSummary.adult }, (_, index) => ({
      passengerType: 'ADULT' as const,
      indexWithinType: index,
    })),
    ...Array.from({ length: passengerSummary.child }, (_, index) => ({
      passengerType: 'CHILD' as const,
      indexWithinType: index,
    })),
    ...Array.from({ length: passengerSummary.infant }, (_, index) => ({
      passengerType: 'INFANT' as const,
      indexWithinType: index,
    })),
  ];
}

function createPassengerDefaults(section: PassengerSection): PassengerFormEntry {
  return {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    nationality: DEFAULT_NATIONALITY,
    passengerType: section.passengerType,
    identifyType: 'ID_CARD',
    identifyNumber: '',
    expiryDate: '',
    email: '',
    phone: '',
  };
}

function buildPassengerHeading(section: PassengerSection): string {
  const base = PASSENGER_TYPE_LABELS[section.passengerType];
  return `${base} ${section.indexWithinType + 1}`;
}

function getPassengerFieldError(
  errors: FieldErrors<PassengerInfoFormValues>,
  index: number,
  field: keyof PassengerFormEntry
): string | undefined {
  const message = errors.passengers?.[index]?.[field]?.message;
  return typeof message === 'string' ? message : undefined;
}

function hasPassengerErrors(errors: FieldErrors<PassengerInfoFormValues>, index: number): boolean {
  return Boolean(errors.passengers?.[index]);
}

function getSelectClassName(hasError: boolean): string {
  return `auth-input w-full rounded-md border-0 bg-surface-highest px-[1.125rem] py-4 text-[0.9375rem] text-on-surface outline-none ${
    hasError ? 'ring-2 ring-red-400' : ''
  }`;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `booking-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createPassengerFormEntry(
  passenger: BookingPassengerPayload,
  contact?: BookingContactPayload
): PassengerFormEntry {
  return {
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    dateOfBirth: passenger.dateOfBirth,
    gender: passenger.gender as PassengerFormEntry['gender'],
    nationality: passenger.nationality || DEFAULT_NATIONALITY,
    passengerType: passenger.passengerType,
    identifyType: normalizeIdentifyType(passenger.identifyType),
    identifyNumber: passenger.identifyNumber,
    expiryDate: passenger.expiryDate ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  };
}

export default function PassengerInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const bookingDraft = useBookingStore((state) => state.bookingDraft);
  const isRevalidateExpired = useBookingStore((state) => state.isRevalidateExpired);
  const setBookingRequestDraft = useBookingStore((state) => state.setBookingRequestDraft);
  const setBookingResponse = useBookingStore((state) => state.setBookingResponse);
  const setRevalidationDraft = useBookingStore((state) => state.setRevalidationDraft);
  const isPreviewMode = import.meta.env.DEV && searchParams.get('preview') === '1';
  const idempotencyKeyRef = useRef('');
  const isSubmittingRef = useRef(false);
  const locationState = location.state as PassengerInfoLocationState | null;
  const pendingRevalidation = locationState?.pendingRevalidation ?? null;
  const [isPreparingSelection, setIsPreparingSelection] = useState(Boolean(pendingRevalidation));
  const previewPassengerSummary = useMemo<FlightRevalidatePassengerSummary>(
    () => ({
      adult: 1,
      child: 1,
      infant: 1,
    }),
    []
  );
  const effectivePassengerSummary = isPreviewMode
    ? previewPassengerSummary
    : bookingDraft.passengerSummary;
  const hasValidRevalidation =
    isPreviewMode ||
    Boolean(pendingRevalidation) ||
    (Boolean(bookingDraft.revalidateId) && !isRevalidateExpired());
  const passengerSections = useMemo(
    () => buildPassengerSections(effectivePassengerSummary),
    [effectivePassengerSummary]
  );
  const primaryContact = bookingDraft.contacts.find((contact) => contact.primary);
  const persistedPassengerDefaults = useMemo(() => {
    if (bookingDraft.passengers.length !== passengerSections.length) return null;
    return bookingDraft.passengers.map((passenger, index) =>
      createPassengerFormEntry(passenger, index === 0 ? primaryContact : undefined)
    );
  }, [bookingDraft.passengers, passengerSections.length, primaryContact]);
  const [expandedSections, setExpandedSections] = useState<boolean[]>(() =>
    passengerSections.map(() => true)
  );
  const bookingMutation = useMutation({
    mutationFn: bookingService.createBooking,
    onError: (error) => {
      const errorCode = getAxiosErrorCode(error);
      if (errorCode !== 'REQUEST_IN_PROGRESS') {
        idempotencyKeyRef.current = createIdempotencyKey();
      }
      const fallback = 'Unable to create the booking. Please try again.';
      const message = getAxiosErrorMessage(error, fallback);
      if (errorCode === 'REQUEST_IN_PROGRESS') {
        toast.error(
          'Your booking is still being created. Please wait a few seconds before trying again.'
        );
        return;
      }
      toast.error(message);
    },
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<PassengerInfoFormValues, unknown, PassengerInfoFormValues>({
    resolver: zodResolver(passengerInfoSchema),
    defaultValues: {
      passengers: persistedPassengerDefaults ?? passengerSections.map(createPassengerDefaults),
    },
  });
  const { fields } = useFieldArray({
    control,
    name: 'passengers',
  });

  useEffect(() => {
    if (!hasValidRevalidation) {
      if (!isPreviewMode) {
        toast.error('Your fare hold has expired. Please select your flight again.');
      }
      navigate('/flights', { replace: true });
    }
  }, [hasValidRevalidation, isPreviewMode, navigate]);

  useEffect(() => {
    if (isPreviewMode || !pendingRevalidation) return;

    const controller = new AbortController();
    setIsPreparingSelection(true);

    void (async () => {
      try {
        const response =
          pendingRevalidation.kind === 'ROUND_TRIP'
            ? await flightService.revalidateItinerary(pendingRevalidation.request, {
                signal: controller.signal,
              })
            : await flightService.revalidateFare(pendingRevalidation.request, {
                signal: controller.signal,
              });

        setRevalidationDraft(response);
        setIsPreparingSelection(false);
        navigate('/booking/passengers', { replace: true, state: null });
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return;
        const message =
          axios.isAxiosError(error) && error.code === 'ECONNABORTED'
            ? 'Fare verification took too long. Please try again.'
            : getAxiosErrorMessage(error, 'Could not verify latest fare. Please try again.');
        navigate(pendingRevalidation.originPath, {
          replace: true,
          state: {
            revalidationError: message,
            restoreOutboundSelection:
              pendingRevalidation.kind === 'ROUND_TRIP'
                ? (pendingRevalidation.restoreOutboundSelection ?? null)
                : null,
          },
        });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [isPreviewMode, navigate, pendingRevalidation, setRevalidationDraft]);

  useEffect(() => {
    const nextPassengers =
      persistedPassengerDefaults ?? passengerSections.map(createPassengerDefaults);
    reset({ passengers: nextPassengers });
    setExpandedSections(passengerSections.map(() => true));
  }, [passengerSections, persistedPassengerDefaults, reset]);

  useEffect(() => {
    setExpandedSections((current) =>
      passengerSections.map((_, index) => current[index] || hasPassengerErrors(errors, index))
    );
  }, [errors, passengerSections]);

  useEffect(() => {
    if (idempotencyKeyRef.current || !hasValidRevalidation) return;
    idempotencyKeyRef.current = createIdempotencyKey();
  }, [hasValidRevalidation]);

  if (!hasValidRevalidation) return null;

  if (isPreparingSelection) {
    return (
      <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
        <AmbientSweep />
        <SiteHeader />
        <main className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-28">
          <BookingStepper current="select" />
          <div className="flex min-h-[48vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={2.2} />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (passengerSections.length === 0) {
    return (
      <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
        <AmbientSweep />
        <SiteHeader />
        <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-28">
          <BookingStepper current="details" />
          <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-sm text-error">
            Passenger information from the flight selection step was not found.
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const onSubmit = async (data: PassengerInfoFormValues) => {
    if (isSubmittingRef.current || bookingMutation.isPending) return;
    isSubmittingRef.current = true;
    bookingMutation.reset();
    setExpandedSections(passengerSections.map(() => true));

    const passengers = data.passengers.map(
      (passenger): BookingPassengerPayload => ({
        firstName: passenger.firstName.trim(),
        lastName: passenger.lastName.trim(),
        dateOfBirth: passenger.dateOfBirth,
        gender: passenger.gender,
        nationality: passenger.nationality.trim(),
        passengerType: passenger.passengerType,
        identifyType: passenger.identifyType,
        identifyNumber: passenger.identifyNumber.trim(),
        expiryDate: passenger.expiryDate?.trim() ? passenger.expiryDate : undefined,
      })
    );
    const primaryPassenger = data.passengers[0];
    const contacts: BookingContactPayload[] = [
      {
        email: primaryPassenger.email?.trim() ?? '',
        phone: primaryPassenger.phone?.trim() ?? '',
        primary: true,
      },
    ];

    setBookingRequestDraft({ contacts, passengers });

    if (isPreviewMode) {
      setBookingResponse({
        contacts,
        passengers,
        passengerSummary: effectivePassengerSummary ?? {
          adult: 0,
          child: 0,
          infant: 0,
        },
        pricing: bookingDraft.pricing,
      });
      navigate('/booking/passengers/seats');
      return;
    }

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = createIdempotencyKey();
      }
      const booking = await bookingMutation.mutateAsync({
        revalidateId: bookingDraft.revalidateId ?? '',
        idempotencyKey: idempotencyKeyRef.current,
        passengerSummary: bookingDraft.passengerSummary ?? {
          adult: 0,
          child: 0,
          infant: 0,
        },
        contacts,
        passengers,
      });
      setBookingResponse(booking);
      navigate('/booking/passengers/seats');
    } catch (error) {
      console.error(error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-28">
        <BookingStepper current="details" />
        <h1 className="mb-2 font-headline text-[2.1rem] font-black leading-[0.95] tracking-tight text-on-surface sm:text-5xl">
          Passenger Information
        </h1>
        <p className="mb-8 max-w-2xl text-[1.05rem] leading-8 text-on-surface-variant sm:mb-10">
          Enter the details exactly as shown on the travel document to speed up airport check-in.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {fields.map((field, index) => {
            const section = passengerSections[index];
            const Icon = PASSENGER_TYPE_ICONS[section.passengerType];
            const isExpanded = expandedSections[index] ?? false;
            const documentTypeId = `passenger-${index}-identifyType`;
            const lastNameError = getPassengerFieldError(errors, index, 'lastName');
            const firstNameError = getPassengerFieldError(errors, index, 'firstName');
            const genderError = getPassengerFieldError(errors, index, 'gender');
            const dateOfBirthError = getPassengerFieldError(errors, index, 'dateOfBirth');
            const identifyTypeError = getPassengerFieldError(errors, index, 'identifyType');
            const identifyNumberError = getPassengerFieldError(errors, index, 'identifyNumber');
            const emailError = getPassengerFieldError(errors, index, 'email');
            const phoneError = getPassengerFieldError(errors, index, 'phone');

            return (
              <section
                key={field.id}
                className="overflow-hidden rounded-2xl border border-luxury-gold/15 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 bg-surface-container-low px-4 py-4 text-left sm:px-6 sm:py-5"
                  onClick={() =>
                    setExpandedSections((current) =>
                      current.map((value, currentIndex) =>
                        currentIndex === index ? !value : value
                      )
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className="h-5 w-5 shrink-0 text-midnight-burgundy sm:h-6 sm:w-6"
                      strokeWidth={2}
                    />
                    <div>
                      <p className="text-xl font-black text-on-surface sm:text-lg">
                        {buildPassengerHeading(section)}
                      </p>
                      {PASSENGER_TYPE_DESCRIPTIONS[section.passengerType] ? (
                        <p className="text-xs font-semibold tracking-wide text-on-surface-variant">
                          {PASSENGER_TYPE_DESCRIPTIONS[section.passengerType]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-on-surface-variant transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className={`${isExpanded ? 'block' : 'hidden'} space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6 md:px-8`}
                >
                  <input
                    type="hidden"
                    {...register(`passengers.${index}.passengerType`)}
                    value={section.passengerType}
                  />
                  <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor={`passenger-${index}-lastName`}>Last name</FieldLabel>
                      <TextInput
                        id={`passenger-${index}-lastName`}
                        hasError={!!lastNameError}
                        aria-describedby={
                          lastNameError ? `passenger-${index}-lastName-error` : undefined
                        }
                        {...register(`passengers.${index}.lastName`)}
                        placeholder="Nguyen"
                      />
                      {lastNameError ? (
                        <p
                          id={`passenger-${index}-lastName-error`}
                          className="mt-1 text-xs text-red-500"
                        >
                          {lastNameError}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <FieldLabel htmlFor={`passenger-${index}-firstName`}>
                        First and middle name
                      </FieldLabel>
                      <TextInput
                        id={`passenger-${index}-firstName`}
                        hasError={!!firstNameError}
                        aria-describedby={
                          firstNameError ? `passenger-${index}-firstName-error` : undefined
                        }
                        {...register(`passengers.${index}.firstName`)}
                        placeholder="Van A"
                      />
                      {firstNameError ? (
                        <p
                          id={`passenger-${index}-firstName-error`}
                          className="mt-1 text-xs text-red-500"
                        >
                          {firstNameError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {section.passengerType === 'ADULT' ? (
                    <>
                      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
                        <div>
                          <FieldLabel htmlFor={`passenger-${index}-gender`}>Gender</FieldLabel>
                          <select
                            id={`passenger-${index}-gender`}
                            {...register(`passengers.${index}.gender`)}
                            aria-invalid={genderError ? true : undefined}
                            className={getSelectClassName(!!genderError)}
                          >
                            {GENDER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {genderError ? (
                            <p className="mt-1 text-xs text-red-500">{genderError}</p>
                          ) : null}
                        </div>
                        <div>
                          <FieldLabel htmlFor={`passenger-${index}-dob`}>Date of birth</FieldLabel>
                          <TextInput
                            id={`passenger-${index}-dob`}
                            type="date"
                            hasError={!!dateOfBirthError}
                            aria-describedby={
                              dateOfBirthError ? `passenger-${index}-dob-error` : undefined
                            }
                            {...register(`passengers.${index}.dateOfBirth`)}
                          />
                          {dateOfBirthError ? (
                            <p
                              id={`passenger-${index}-dob-error`}
                              className="mt-1 text-xs text-red-500"
                            >
                              {dateOfBirthError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <input
                        type="hidden"
                        {...register(`passengers.${index}.nationality`)}
                        value={DEFAULT_NATIONALITY}
                      />

                      <div className="grid gap-5 sm:gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                        <div>
                          <FieldLabel htmlFor={documentTypeId}>Document type</FieldLabel>
                          <select
                            id={documentTypeId}
                            {...register(`passengers.${index}.identifyType`)}
                            aria-invalid={identifyTypeError ? true : undefined}
                            className={getSelectClassName(!!identifyTypeError)}
                          >
                            {IDENTIFY_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {identifyTypeError ? (
                            <p className="mt-1 text-xs text-red-500">{identifyTypeError}</p>
                          ) : null}
                        </div>
                        <div className="md:self-end">
                          <TextInput
                            id={`passenger-${index}-identifyNumber`}
                            hasError={!!identifyNumberError}
                            aria-describedby={
                              identifyNumberError
                                ? `passenger-${index}-identifyNumber-error`
                                : undefined
                            }
                            {...register(`passengers.${index}.identifyNumber`)}
                            placeholder="ID card / Passport"
                          />
                          {identifyNumberError ? (
                            <p
                              id={`passenger-${index}-identifyNumber-error`}
                              className="mt-1 text-xs text-red-500"
                            >
                              {identifyNumberError}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
                        <div>
                          <FieldLabel htmlFor={`passenger-${index}-email`}>Email</FieldLabel>
                          <TextInput
                            id={`passenger-${index}-email`}
                            type="email"
                            hasError={!!emailError}
                            aria-describedby={
                              emailError ? `passenger-${index}-email-error` : undefined
                            }
                            {...register(`passengers.${index}.email`)}
                            placeholder="name@example.com"
                          />
                          {emailError ? (
                            <p
                              id={`passenger-${index}-email-error`}
                              className="mt-1 text-xs text-red-500"
                            >
                              {emailError}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <FieldLabel htmlFor={`passenger-${index}-phone`}>Phone number</FieldLabel>
                          <TextInput
                            id={`passenger-${index}-phone`}
                            type="tel"
                            hasError={!!phoneError}
                            aria-describedby={
                              phoneError ? `passenger-${index}-phone-error` : undefined
                            }
                            {...register(`passengers.${index}.phone`)}
                            placeholder="0912345678"
                          />
                          {phoneError ? (
                            <p
                              id={`passenger-${index}-phone-error`}
                              className="mt-1 text-xs text-red-500"
                            >
                              {phoneError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
                        <div>
                          <FieldLabel htmlFor={`passenger-${index}-dob`}>Date of birth</FieldLabel>
                          <TextInput
                            id={`passenger-${index}-dob`}
                            type="date"
                            hasError={!!dateOfBirthError}
                            aria-describedby={
                              dateOfBirthError ? `passenger-${index}-dob-error` : undefined
                            }
                            {...register(`passengers.${index}.dateOfBirth`)}
                          />
                          {dateOfBirthError ? (
                            <p
                              id={`passenger-${index}-dob-error`}
                              className="mt-1 text-xs text-red-500"
                            >
                              {dateOfBirthError}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <FieldLabel htmlFor={`passenger-${index}-gender`}>Gender</FieldLabel>
                          <select
                            id={`passenger-${index}-gender`}
                            {...register(`passengers.${index}.gender`)}
                            aria-invalid={genderError ? true : undefined}
                            className={getSelectClassName(!!genderError)}
                          >
                            {GENDER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {genderError ? (
                            <p className="mt-1 text-xs text-red-500">{genderError}</p>
                          ) : null}
                        </div>
                      </div>
                      <input
                        type="hidden"
                        {...register(`passengers.${index}.nationality`)}
                        value={DEFAULT_NATIONALITY}
                      />
                    </>
                  )}

                  {section.passengerType !== 'ADULT' ? (
                    <>
                      <input
                        type="hidden"
                        {...register(`passengers.${index}.identifyType`)}
                        value="ID_CARD"
                      />
                      <input
                        type="hidden"
                        {...register(`passengers.${index}.identifyNumber`)}
                        value=""
                      />
                    </>
                  ) : null}

                  <input type="hidden" {...register(`passengers.${index}.expiryDate`)} value="" />
                </div>
              </section>
            );
          })}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
            <Link
              to="/flights"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-outline-variant/30 px-5 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low sm:min-w-28 sm:whitespace-nowrap"
            >
              Back
            </Link>
            <Button
              type="submit"
              disabled={bookingMutation.isPending}
              icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}
            >
              {bookingMutation.isPending ? 'Creating booking...' : 'Continue to seat selection'}
            </Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
