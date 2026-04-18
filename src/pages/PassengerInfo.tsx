import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import AmbientSweep from '../components/layout/AmbientSweep';
import BookingStepper from '../components/booking/BookingStepper';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import type { PassengerBookingDetails } from '../types/booking.types';

const TITLES = [
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Dr', label: 'Dr' },
  { value: 'Prof', label: 'Prof' },
];

export interface PassengerInfoFormValues {
  title: { value: string; label: string } | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passport: string;
  dateOfBirth: string;
}

export default function PassengerInfo() {
  const navigate = useNavigate();
  const { register, handleSubmit, control } = useForm<PassengerInfoFormValues>({
    defaultValues: {
      title: { value: 'Mr', label: 'Mr' },
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      passport: '',
      dateOfBirth: '',
    },
  });

  const onSubmit = (data: PassengerInfoFormValues) => {
    const details: PassengerBookingDetails = {
      title: data.title?.value ?? '',
      name: [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      passport: data.passport.trim(),
      dob: data.dateOfBirth,
    };
    navigate('/booking/passengers/seats', {
      state: { passengers: [details] },
    });
  };

  const customSelectStyles = {
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
    option: (
      base: Record<string, unknown>,
      state: { isFocused: boolean; isSelected: boolean }
    ) => ({
      ...base,
      background: state.isSelected ? '#fef9f0' : state.isFocused ? '#f3f3f3' : 'transparent',
      color: 'var(--color-on-surface)',
      cursor: 'pointer',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
  };

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-28">
        <BookingStepper current="details" />
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-4xl">
          Thông tin hành khách
        </h1>
        <p className="mb-10 text-on-surface-variant">
          Nhập thông tin chính xác theo giấy tờ tùy thân để làm thủ tục suôn sẻ.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="title">Danh xưng</FieldLabel>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={TITLES}
                    styles={customSelectStyles}
                    isSearchable={false}
                    isClearable={false}
                  />
                )}
              />
            </div>
            <div>
              <FieldLabel htmlFor="pi-dob">Ngày sinh</FieldLabel>
              <TextInput id="pi-dob" type="date" {...register('dateOfBirth')} />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pi-first">Tên</FieldLabel>
              <TextInput id="pi-first" {...register('firstName')} placeholder="Tên" />
            </div>
            <div>
              <FieldLabel htmlFor="pi-last">Họ</FieldLabel>
              <TextInput id="pi-last" {...register('lastName')} placeholder="Họ" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="pi-email">Email</FieldLabel>
              <TextInput
                id="pi-email"
                type="email"
                {...register('email')}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <FieldLabel htmlFor="pi-phone">Điện thoại</FieldLabel>
              <TextInput id="pi-phone" type="tel" {...register('phone')} />
            </div>
            <div>
              <FieldLabel htmlFor="pi-passport">Hộ chiếu / CCCD</FieldLabel>
              <TextInput id="pi-passport" {...register('passport')} />
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
            <Link
              to="/flights"
              className="inline-flex items-center justify-center rounded-md border border-outline-variant/30 px-4 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low"
            >
              Quay lại
            </Link>
            <Button type="submit" icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}>
              Tiếp tục chọn ghế
            </Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
