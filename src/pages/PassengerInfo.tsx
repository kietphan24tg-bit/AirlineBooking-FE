import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AmbientSweep from '../components/layout/AmbientSweep';
import BookingStepper from '../components/booking/BookingStepper';
import MarketingNav from '../components/layout/MarketingNav';
import Button from '../components/ui/Button';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';

export interface PassengerInfoFormValues {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passport: string;
}

export default function PassengerInfo() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<PassengerInfoFormValues>({
    defaultValues: {
      title: 'Mr',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      passport: '',
    },
  });

  const onSubmit = () => {
    navigate('/booking/seats');
  };

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <MarketingNav active="book" />
      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-28">
        <BookingStepper current="details" />
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-4xl">
          Thông tin hành khách
        </h1>
        <p className="mb-10 text-on-surface-variant">
          Nhập thông tin chính xác theo giấy tờ tùy thân để làm thủ tục suôn sẻ.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-xl border border-luxury-gold/15 bg-surface-container-lowest p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="title">Danh xưng</FieldLabel>
              <TextInput id="title" {...register('title')} />
            </div>
            <div />
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
    </div>
  );
}
