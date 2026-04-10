import { ArrowRight, CreditCard, Lock } from 'lucide-react';
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

const PAYMENT_METHODS = [
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'debit-card', label: 'Debit Card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'apple-pay', label: 'Apple Pay' },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'SG', label: 'Singapore' },
  { value: 'TH', label: 'Thailand' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
];

export interface CheckoutFormValues {
  paymentMethod: { value: string; label: string } | null;
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingAddress: string;
  city: string;
  postalCode: string;
  country: { value: string; label: string } | null;
  acceptTerms: boolean;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { register, handleSubmit, control, watch } = useForm<CheckoutFormValues>({
    defaultValues: {
      paymentMethod: { value: 'credit-card', label: 'Credit Card' },
      cardHolder: '',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      billingAddress: '',
      city: '',
      postalCode: '',
      country: { value: 'GB', label: 'United Kingdom' },
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  const onSubmit = () => {
    navigate('/trips');
  };

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: '#ffffff',
      borderColor: '#e5e5e5',
      boxShadow: 'none',
      borderRadius: '0.375rem',
      padding: '0',
    }),
    singleValue: (base: any) => ({
      ...base,
      color: '#1a1a2e',
      fontSize: '0.9375rem',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#1a1a2e' : state.isFocused ? '#f5f5f5' : 'white',
      color: state.isSelected ? '#d4af37' : '#1a1a2e',
      cursor: 'pointer',
    }),
    menu: (base: any) => ({
      ...base,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      borderRadius: '0.75rem',
    }),
  };

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-28">
        <BookingStepper current="pay" />
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-4xl">
          Thanh toán
        </h1>
        <p className="mb-10 text-on-surface-variant">
          Hoàn tất thanh toán để xác nhận đặt vé của bạn.
        </p>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Payment Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Payment Method Selection */}
              <div className="rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm">
                <h2 className="mb-6 font-headline text-xl font-black text-on-surface">
                  Phương thức thanh toán
                </h2>
                <FieldLabel htmlFor="payment-method">Chọn phương thức</FieldLabel>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={PAYMENT_METHODS}
                      styles={customSelectStyles}
                      isSearchable={false}
                      isClearable={false}
                    />
                  )}
                />
              </div>

              {/* Card Details */}
              <div className="rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm">
                <h2 className="mb-6 font-headline text-xl font-black text-on-surface">
                  Thông tin thẻ
                </h2>
                <div className="space-y-6">
                  <div>
                    <FieldLabel htmlFor="card-holder">Tên chủ thẻ</FieldLabel>
                    <TextInput
                      id="card-holder"
                      {...register('cardHolder')}
                      placeholder="JOHN DOE"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="card-number">Số thẻ</FieldLabel>
                    <TextInput
                      id="card-number"
                      {...register('cardNumber')}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div>
                      <FieldLabel htmlFor="expiry-month">Tháng</FieldLabel>
                      <TextInput id="expiry-month" {...register('expiryMonth')} placeholder="MM" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="expiry-year">Năm</FieldLabel>
                      <TextInput id="expiry-year" {...register('expiryYear')} placeholder="YY" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="cvv">CVV</FieldLabel>
                      <TextInput id="cvv" {...register('cvv')} placeholder="123" type="password" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm">
                <h2 className="mb-6 font-headline text-xl font-black text-on-surface">
                  Địa chỉ thanh toán
                </h2>
                <div className="space-y-6">
                  <div>
                    <FieldLabel htmlFor="billing-address">Địa chỉ</FieldLabel>
                    <TextInput
                      id="billing-address"
                      {...register('billingAddress')}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="city">Thành phố</FieldLabel>
                      <TextInput id="city" {...register('city')} placeholder="London" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="postal-code">Mã bưu điện</FieldLabel>
                      <TextInput
                        id="postal-code"
                        {...register('postalCode')}
                        placeholder="SW1A 1AA"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="country">Quốc gia</FieldLabel>
                    <Controller
                      name="country"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          options={COUNTRIES}
                          styles={customSelectStyles}
                          isSearchable
                          isClearable={false}
                        />
                      )}
                    />
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

          {/* Sidebar - Order Summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-28 rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-6 shadow-lg">
              <div className="mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-luxury-gold" strokeWidth={1.5} />
                <span className="text-xs font-bold uppercase tracking-widest text-luxury-gold">
                  Thanh toán an toàn
                </span>
              </div>

              {/* QR Code Section */}
              <div className="mb-6 flex flex-col items-center rounded-lg border border-luxury-gold/30 bg-white p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-on-surface">
                  Quét để thanh toán
                </p>
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://airline-booking.sovereign.local/payment/order-svg204"
                  alt="QR Code Thanh Toán"
                  className="h-32 w-32 rounded-md"
                />
                <p className="mt-3 text-[9px] text-on-surface-variant">Order: SV-204</p>
              </div>

              <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Chi tiết</h3>

              <div className="space-y-4 border-b border-outline-variant/20 pb-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="mt-0.5 h-4 w-4 text-luxury-gold" strokeWidth={2} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface">
                      Cách lập hóa đơn
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">Online</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Vé máy bay</span>
                  <span className="font-bold">£2,890</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Dịch vụ</span>
                  <span className="font-bold">£89</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Thuế & phí</span>
                  <span className="font-bold">£289</span>
                </div>
                <div className="border-t border-outline-variant/20 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-on-surface">Tổng</span>
                    <span className="text-xl font-black text-secondary">£3,268</span>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-[10px] text-on-surface-variant">
                Thanh toán này được bảo vệ bởi các tiêu chuẩn bảo mật quốc tế.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
