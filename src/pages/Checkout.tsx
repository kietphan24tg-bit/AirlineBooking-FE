import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AmbientSweep from '../components/layout/AmbientSweep';
import BookingStepper from '../components/booking/BookingStepper';
import Button from '../components/ui/Button';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import { useState } from 'react';
import PaymentCard from '../components/booking/PaymentCard';
import type { CheckoutFormValues } from '../types/checkout.types';

const PAYMENT_METHODS = [
  { value: 'vietqr', label: 'VietQR' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'momo', label: 'Momo' },
  { value: 'pay_later', label: 'Pay Later' },
];

export default function Checkout() {
  const [selected, setSelected] = useState('vietqr');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const { register, watch } = useForm<CheckoutFormValues>({
    defaultValues: {
      paymentMethod: { value: 'vietqr', label: 'VietQR' },
      cardHolder: '',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      billingAddress: '',
      city: '',
      postalCode: '',
      country: { value: 'VN', label: 'Vietnam' },
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  const onPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaymentProcessing(!isPaymentProcessing);
  };

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      {isPaymentProcessing && <PaymentCard onClose={() => setIsPaymentProcessing(false)} />}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-28">
        <BookingStepper current="pay" />
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-4xl">
          Thanh toán
        </h1>
        <p className="mb-10 text-on-surface-variant">
          Hoàn tất thanh toán để xác nhận đặt vé của bạn.
        </p>

        {/* Main Payment Form */}
        <div>
          <form onSubmit={onPaymentSubmit} className="space-y-6">
            {/* Payment Method */}
            <div className="space-x-4 grid md:grid-cols-4">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  className={`overflow-hidden rounded-3xl border-5 border-amber-50 bg-surface-container-lowest/90 shadow-sm backdrop-blur-sm transition-all hover:shadow-xl ${
                    selected === method.value
                      ? 'text-secondary border-cabin-burgundy'
                      : 'text-on-surface-variant hover:text-secondary'
                  }`}
                  onClick={() => setSelected(method.value)}
                >
                  <img
                    src={`/src/assets/${method.value}.png`}
                    alt={method.label}
                    className="h-full w-full object-contain object-center"
                  />
                </button>
              ))}
            </div>

            {/* Order Summary Card */}
            <div className="rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm">
              <h2 className="mb-6 font-headline text-xl font-black text-on-surface">
                Tóm tắt đơn hàng
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Vé máy bay</span>
                  <span className="font-bold text-on-surface">£2,890.00</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Dịch vụ bổ sung</span>
                  <span className="font-bold text-on-surface">£89.00</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Thuế & phí</span>
                  <span className="font-bold text-on-surface">£289.00</span>
                </div>
                <div className="flex justify-between pt-3">
                  <span className="font-bold text-on-surface">Tổng cộng</span>
                  <span className="text-2xl font-black text-secondary">£3,268.00</span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm">
              <label className="flex items-start gap-4">
                <input
                  type="checkbox"
                  {...register('acceptTerms')}
                  className="mt-1 h-4 w-4 cursor-pointer"
                />
                <span className="text-sm text-on-surface-variant">
                  Tôi đồng ý với{' '}
                  <Link to="#" className="font-bold text-midnight-burgundy hover:underline">
                    Điều khoản và Điều kiện
                  </Link>{' '}
                  và{' '}
                  <Link to="#" className="font-bold text-midnight-burgundy hover:underline">
                    Chính sách Bảo mật
                  </Link>
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/trips"
                className="inline-flex items-center justify-center rounded-md border border-outline-variant/30 px-4 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Hoàn thành sau
              </Link>
              <Button
                type="submit"
                disabled={!acceptTerms}
                icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}
              >
                Thanh toán ngay
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
