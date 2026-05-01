import { ArrowRight, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AmbientSweep from '../components/layout/AmbientSweep';
import BookingStepper from '../components/booking/BookingStepper';
import Button from '../components/ui/Button';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import PaymentCard from '../components/booking/PaymentCard';
import { useBookingStore } from '../stores/useBookingStore';
import type { CheckoutFormValues } from '../types/checkout.types';
import {
  cancelPayment,
  createPaymentLink,
  getPaymentMethods,
  getPaymentStatus,
} from '../services/payment.service';
import type { PaymentMethod, PaymentMethodGroup } from '../types/payment.types';
import type { CreatePaymentResponse, PaymentStatus } from '../types/payment-create.types';

const rawApiBase = String(import.meta.env.BE_URL || import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);

function resolvePaymentIconUrl(icon: string | null): string {
  const trimmed = (icon ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  // Payment icons are often served as static assets from the backend host.
  // In dev we proxy `/api/*` but not arbitrary static paths, so we still need BE base.
  const prefix = rawApiBase || '';
  if (!prefix) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${prefix}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function pickBackendMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const err = o.error;
  if (err && typeof err === 'object') {
    const m = (err as Record<string, unknown>).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof o.message === 'string' && o.message.trim()) return o.message;
  return null;
}

function paymentMethodsErrorMessage(status: number | undefined, data: unknown): string {
  const fromApi = pickBackendMessage(data);
  if (status === 404) {
    return fromApi || 'Không tìm thấy đặt chỗ hoặc đặt chỗ không thuộc về tài khoản của bạn.';
  }
  if (status === 409) {
    return (
      fromApi ||
      'Trạng thái đặt chỗ không cho phép thanh toán. Chỉ các đặt chỗ ở trạng thái PENDING hoặc PENDING_PAYMENT mới được thanh toán.'
    );
  }
  if (status === 410) {
    return fromApi || 'Thời gian giữ vé đã hết hạn (pnrExpiresAt). Vui lòng đặt vé lại.';
  }
  return fromApi || 'Không thể tải phương thức thanh toán. Vui lòng thử lại.';
}

function resolvePaymentId(payment: CreatePaymentResponse | null): string | number | null {
  const id = payment?.payment?.id ?? payment?.payment?.paymentId;
  return id == null ? null : id;
}

function isStripeMethod(method?: PaymentMethod | null): boolean {
  return !!method && (method.provider ?? '').trim().toUpperCase() === 'STRIPE';
}

function resolveRedirectUrl(res: CreatePaymentResponse): string | null {
  const url = res.action?.paymentUrl ?? res.payment?.paymentUrl ?? null;
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function MethodIconButton({
  method,
  selected,
  onSelect,
  disabled,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolvePaymentIconUrl(method.icon);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`overflow-hidden rounded-3xl border-5 border-amber-50 bg-surface-container-lowest/90 shadow-sm backdrop-blur-sm transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? 'text-secondary border-cabin-burgundy'
          : 'text-on-surface-variant hover:text-secondary'
      }`}
      onClick={onSelect}
    >
      {src && !imgFailed ? (
        <img
          src={src}
          alt={method.label}
          className="h-full min-h-[100px] w-full object-contain object-center p-2"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex min-h-[100px] flex-col items-center justify-center gap-1 px-2 py-4 text-center">
          <CreditCard className="h-8 w-8 text-on-surface-variant" strokeWidth={1.5} />
          <span className="text-xs font-semibold leading-tight">{method.label}</span>
        </div>
      )}
    </button>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [qrPayment, setQrPayment] = useState<CreatePaymentResponse | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [regeneratingPayment, setRegeneratingPayment] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [cancelingPayment, setCancelingPayment] = useState(false);
  const [statusOverride, setStatusOverride] = useState<PaymentStatus | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const bookingResponse = useBookingStore((state) => state.bookingResponse);
  const clearBooking = useBookingStore((state) => state.clearBooking);
  const bookingId = bookingResponse?.bookingId ?? null;

  const { register, watch, setValue } = useForm<CheckoutFormValues>({
    defaultValues: {
      paymentMethod: null,
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

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods', bookingId],
    queryFn: () => getPaymentMethods(bookingId as string | number),
    enabled: Boolean(bookingId),
  });

  const groups = useMemo<PaymentMethodGroup[]>(
    () => paymentMethodsQuery.data?.groups ?? [],
    [paymentMethodsQuery.data?.groups]
  );
  const flatMethods = useMemo(() => groups.flatMap((g) => g.methods ?? []), [groups]);
  const supportedMethods = useMemo(() => flatMethods.filter((m) => m.supported), [flatMethods]);
  const groupsWithMethods = useMemo(
    () => groups.filter((g) => (g.methods ?? []).length > 0),
    [groups]
  );
  const showGroupLabels = groupsWithMethods.length > 1;

  useEffect(() => {
    const candidates = supportedMethods.length > 0 ? supportedMethods : flatMethods;
    if (candidates.length === 0) return;
    setSelectedCode((prev) =>
      prev && candidates.some((m) => m.code === prev) ? prev : candidates[0]!.code
    );
  }, [supportedMethods, flatMethods]);

  useEffect(() => {
    if (!selectedCode) return;
    const method = flatMethods.find((m) => m.code === selectedCode);
    if (method) {
      setValue('paymentMethod', { value: method.code, label: method.label });
    }
  }, [selectedCode, flatMethods, setValue]);

  const pricing = bookingResponse?.pricing ?? null;
  const checkoutServiceFee =
    (bookingResponse?.lastSeatAssignment?.seatSurchargeTotal ?? 0) +
    (bookingResponse?.lastServicesResult?.ancillaryTotal ?? 0);
  const hasBooking = Boolean(bookingResponse);

  useEffect(() => {
    if (!hasBooking) {
      navigate('/booking/passengers', { replace: true });
    }
  }, [hasBooking, navigate]);

  useEffect(() => {
    const resetTransientPaymentState = () => {
      setCreatingPayment(false);
      setRegeneratingPayment(false);
      setCheckingStatus(false);
      setCancelingPayment(false);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        resetTransientPaymentState();
      }
    };

    const handleFocus = () => {
      resetTransientPaymentState();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const acceptTerms = watch('acceptTerms');

  const errorStatus = axios.isAxiosError(paymentMethodsQuery.error)
    ? paymentMethodsQuery.error.response?.status
    : undefined;
  const errorData = axios.isAxiosError(paymentMethodsQuery.error)
    ? paymentMethodsQuery.error.response?.data
    : undefined;

  const isHardBlock = errorStatus === 404 || errorStatus === 409 || errorStatus === 410;
  const paymentMethodsError =
    paymentMethodsQuery.isError && paymentMethodsQuery.error
      ? paymentMethodsErrorMessage(errorStatus, errorData)
      : null;

  const canPay =
    paymentMethodsQuery.isSuccess &&
    supportedMethods.length > 0 &&
    !paymentMethodsQuery.isError &&
    Boolean(selectedCode) &&
    supportedMethods.some((m) => m.code === selectedCode);

  if (!hasBooking || !pricing) return null;

  const currency = pricing.currency || 'VND';
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  const onPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay || !acceptTerms || !bookingId || !selectedCode) return;
    void (async () => {
      setPaymentError(null);
      setStatusOverride(null);
      setCreatingPayment(true);
      const selectedMethod = flatMethods.find((m) => m.code === selectedCode) ?? null;
      const stripeFlow = isStripeMethod(selectedMethod);
      try {
        const res = await createPaymentLink({ bookingId, method: selectedCode });
        if (stripeFlow) {
          const redirectUrl = resolveRedirectUrl(res);
          if (redirectUrl) {
            setCreatingPayment(false);
            window.location.assign(redirectUrl);
            return;
          }
          const fallbackMsg = 'Không nhận được liên kết thanh toán Stripe. Vui lòng thử lại.';
          setPaymentError(fallbackMsg);
          setQrPayment(null);
          toast.error(fallbackMsg);
          setCreatingPayment(false);
          return;
        }
        setQrPayment(res);
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        const data = axios.isAxiosError(err) ? err.response?.data : undefined;
        const msg =
          pickBackendMessage(data) ||
          (status === 401 || status === 403
            ? 'Vui lòng đăng nhập lại để tiếp tục thanh toán.'
            : status === 404 || status === 409 || status === 410
              ? paymentMethodsErrorMessage(status, data)
              : 'Không thể tạo mã thanh toán. Vui lòng thử lại.');
        setPaymentError(msg);
        setQrPayment(null);
        setCreatingPayment(false);
        return;
      }
      setCreatingPayment(false);
    })();
  };

  const handleClosePayment = () => {
    setQrPayment(null);
    setStatusOverride(null);
    setPaymentError(null);
  };

  const handleRegenerate = async () => {
    if (!bookingId || !selectedCode) return;
    setPaymentError(null);
    setStatusOverride(null);
    setRegeneratingPayment(true);
    try {
      const res = await createPaymentLink({ bookingId, method: selectedCode });
      setQrPayment(res);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const msg =
        pickBackendMessage(data) ||
        (status === 401 || status === 403
          ? 'Vui lòng đăng nhập lại để tiếp tục thanh toán.'
          : status === 404 || status === 409 || status === 410
            ? paymentMethodsErrorMessage(status, data)
            : 'Không thể tạo mã thanh toán. Vui lòng thử lại.');
      setPaymentError(msg);
    } finally {
      setRegeneratingPayment(false);
    }
  };

  const handleCheckStatus = async () => {
    const paymentId = resolvePaymentId(qrPayment);
    if (paymentId == null) return;
    setPaymentError(null);
    setCheckingStatus(true);
    try {
      const res = await getPaymentStatus(paymentId);
      const next = res.payment?.status as PaymentStatus | undefined;
      if (next) setStatusOverride(next);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const msg =
        pickBackendMessage(data) ||
        (status === 401 || status === 403
          ? 'Vui lòng đăng nhập lại để kiểm tra trạng thái thanh toán.'
          : 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.');
      setPaymentError(msg);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelPayment = async () => {
    const paymentId = resolvePaymentId(qrPayment);
    if (paymentId == null) {
      setPaymentError('Khong tim thay ma thanh toan de huy.');
      return;
    }
    setPaymentError(null);
    setCancelingPayment(true);
    try {
      const res = await cancelPayment(paymentId);
      setStatusOverride('CANCELLED');
      setQrPayment((current) =>
        current
          ? {
              ...current,
              payment: {
                ...current.payment,
                ...res,
                id: res.id ?? res.paymentId ?? current.payment.id,
              },
            }
          : current
      );
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const msg =
        pickBackendMessage(data) ||
        (status === 401 || status === 403
          ? 'Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i Ä‘á»ƒ há»§y thanh toÃ¡n.'
          : 'KhÃ´ng thá»ƒ há»§y thanh toÃ¡n. Vui lÃ²ng thá»­ láº¡i.');
      setPaymentError(msg);
    } finally {
      setCancelingPayment(false);
    }
  };

  const handlePaymentExpired = async () => {
    const paymentId = resolvePaymentId(qrPayment);
    if (paymentId == null) return;
    setPaymentError(null);
    setCheckingStatus(true);
    try {
      const res = await getPaymentStatus(paymentId);
      const next = res.payment?.status as PaymentStatus | undefined;
      if (next === 'SUCCESS') {
        setStatusOverride(next);
        return;
      }
      setStatusOverride(next ?? 'EXPIRED');
      clearBooking();
      navigate('/', {
        replace: true,
        state: { paymentExpired: true },
      });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const msg =
        pickBackendMessage(data) ||
        (status === 401 || status === 403
          ? 'Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i Ä‘á»ƒ kiá»ƒm tra tráº¡ng thÃ¡i thanh toÃ¡n.'
          : 'KhÃ´ng thá»ƒ kiá»ƒm tra tráº¡ng thÃ¡i thanh toÃ¡n. Vui lÃ²ng thá»­ láº¡i.');
      setPaymentError(msg);
    } finally {
      setCheckingStatus(false);
    }
  };

  const methodsDisabled =
    paymentMethodsQuery.isLoading || paymentMethodsQuery.isError || !paymentMethodsQuery.isSuccess;

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      {qrPayment && (
        <PaymentCard
          data={qrPayment}
          onClose={handleClosePayment}
          onRegenerate={handleRegenerate}
          onCheckStatus={handleCheckStatus}
          onCancel={handleCancelPayment}
          onExpired={handlePaymentExpired}
          checkingStatus={checkingStatus}
          canceling={cancelingPayment}
          regenerating={regeneratingPayment}
          statusOverride={statusOverride}
          errorMessage={paymentError}
        />
      )}
      {paymentMethodsQuery.isError && paymentMethodsError && isHardBlock && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-cabin-burgundy/30 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-cabin-burgundy/10">
                <AlertCircle className="h-5 w-5 text-cabin-burgundy" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-on-surface">Không thể thanh toán</p>
                <p className="mt-2 text-sm text-on-surface-variant">{paymentMethodsError}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={() => navigate('/home', { replace: true })}
                icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}
              >
                Quay lại trang chủ
              </Button>
            </div>
          </div>
        </div>
      )}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-28">
        <BookingStepper current="pay" />
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-4xl">
          Thanh toán
        </h1>
        <p className="mb-10 text-on-surface-variant">
          Hoàn tất thanh toán để xác nhận đặt vé của bạn.
        </p>

        <div>
          <form onSubmit={onPaymentSubmit} className="space-y-6">
            {paymentMethodsQuery.isLoading && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[116px] animate-pulse rounded-3xl border border-outline-variant/20 bg-surface-container-high/40"
                  />
                ))}
              </div>
            )}

            {paymentMethodsQuery.isError && paymentMethodsError && !isHardBlock && (
              <div
                className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${
                  isHardBlock
                    ? 'border-cabin-burgundy/40 bg-cabin-burgundy/5'
                    : 'border-outline-variant/40 bg-surface-container-low'
                }`}
                role="alert"
              >
                <div className="flex gap-3">
                  <AlertCircle
                    className={`mt-0.5 h-5 w-5 shrink-0 ${isHardBlock ? 'text-cabin-burgundy' : 'text-on-surface-variant'}`}
                  />
                  <p className="text-sm font-medium text-on-surface">{paymentMethodsError}</p>
                </div>
                {!isHardBlock && (
                  <button
                    type="button"
                    onClick={() => void paymentMethodsQuery.refetch()}
                    disabled={paymentMethodsQuery.isFetching}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-midnight-burgundy/30 px-3 py-2 text-sm font-semibold text-midnight-burgundy hover:bg-midnight-burgundy/10 disabled:opacity-60"
                  >
                    {paymentMethodsQuery.isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Thử lại
                  </button>
                )}
              </div>
            )}

            {paymentMethodsQuery.isSuccess &&
              supportedMethods.length === 0 &&
              flatMethods.length > 0 &&
              !paymentMethodsQuery.isError && (
                <div
                  className="flex gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4"
                  role="status"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant" />
                  <p className="text-sm font-medium text-on-surface">
                    Hiện tại chưa có phương thức thanh toán nào được hỗ trợ cho đặt chỗ này.
                  </p>
                </div>
              )}

            {paymentMethodsQuery.isSuccess && groupsWithMethods.length > 0 && (
              <div className="space-y-8">
                {groupsWithMethods.map((group) => (
                  <div key={group.type} className="space-y-3">
                    {showGroupLabels && (
                      <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
                        {group.label}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {group.methods.map((method) => (
                        <MethodIconButton
                          key={method.code}
                          method={method}
                          selected={selectedCode === method.code}
                          onSelect={() => setSelectedCode(method.code)}
                          disabled={methodsDisabled || !method.supported}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-luxury-gold/15 bg-white p-8 shadow-sm">
              <h2 className="mb-6 font-headline text-xl font-black text-on-surface">
                Tóm tắt đơn hàng
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Giá vé gốc</span>
                  <span className="font-bold text-on-surface">
                    {formatCurrency(pricing.originalTotalPrice)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Giảm giá</span>
                  <span className="font-bold text-secondary">
                    -{formatCurrency(pricing.discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Thuế</span>
                  <span className="font-bold text-on-surface">{formatCurrency(pricing.taxes)}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Phí</span>
                  <span className="font-bold text-on-surface">{formatCurrency(pricing.fees)}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <span className="text-on-surface-variant">Phí dịch vụ</span>
                  <span className="font-bold text-on-surface">
                    {formatCurrency(checkoutServiceFee)}
                  </span>
                </div>
                <div className="flex justify-between pt-3">
                  <span className="font-bold text-on-surface">Tổng cộng</span>
                  <span className="text-2xl font-black text-secondary">
                    {formatCurrency(pricing.discountedTotalPrice)}
                  </span>
                </div>
              </div>
            </div>

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

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/trips"
                className="inline-flex items-center justify-center rounded-md border border-outline-variant/30 px-4 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Hoàn thành sau
              </Link>
              <Button
                type="submit"
                disabled={!acceptTerms || !canPay || creatingPayment}
                icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}
              >
                {creatingPayment ? 'Đang tạo mã...' : 'Thanh toán ngay'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
