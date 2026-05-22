import { ArrowRight, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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

function isPaymentRetryTooFastMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    /please wait\s*15\s*seconds/i.test(message) ||
    /another payment/i.test(message) ||
    /thao tác quá nhanh/i.test(message) ||
    /vui lòng thử lại sau 15 giây/i.test(message)
  );
}

function getPaymentRetryTooFastToastMessage(message: string | null | undefined): string {
  if (isPaymentRetryTooFastMessage(message)) {
    return 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau 15 giây.';
  }
  return message?.trim() || 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau 15 giây.';
}

function showCheckoutErrorToast(message: string) {
  toast.error(message, { duration: 15000 });
}

function resolvePaymentId(payment: CreatePaymentResponse | null): string | number | null {
  const id = payment?.payment?.id ?? payment?.payment?.paymentId;
  return id == null ? null : id;
}

function normalizePaymentMethodCode(method: string | null | undefined): string | null {
  const normalized = method?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'PAYOS_QR') return 'PAYOS';
  if (normalized === 'STRIPE') return 'STRIPE_CARD';
  return normalized;
}

function isStripeMethod(method?: PaymentMethod | null): boolean {
  return !!method && (method.provider ?? '').trim().toUpperCase() === 'STRIPE';
}

function isPayLaterMethod(method?: PaymentMethod | null): boolean {
  return !!method && method.code.trim().toUpperCase() === 'PAY_LATER';
}

function isSelectableMethod(method?: PaymentMethod | null): boolean {
  return !!method && (method.supported || isPayLaterMethod(method));
}

function parseIsoTime(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isDisabledByUnsupportedImplementation(method?: PaymentMethod | null): boolean {
  if (!method) return false;
  const code = method.code.trim().toUpperCase();
  return code === 'VNPAY' || code === 'MOMO';
}

function resolveDisabledMethodReason(
  method: PaymentMethod,
  bookingExpiresAtMs: number | null
): string | null {
  if (isSelectableMethod(method)) return null;
  if (isDisabledByUnsupportedImplementation(method)) {
    return 'Phương thức này hiện chưa được hỗ trợ.';
  }

  const remainingMs = bookingExpiresAtMs != null ? bookingExpiresAtMs - Date.now() : null;
  if (
    method.code.trim().toUpperCase() === 'PAYOS_QR' &&
    remainingMs != null &&
    remainingMs > 0 &&
    remainingMs < 5 * 60 * 1000
  ) {
    return 'Thanh toán VietQR không khả dụng vì thời gian giữ chỗ còn quá ít. Vui lòng chọn phương thức thanh toán khác.';
  }
  if (
    remainingMs != null &&
    remainingMs > 0 &&
    remainingMs < 5 * 60 * 1000 &&
    !isPayLaterMethod(method)
  ) {
    return 'Tạo thanh toán không khả dụng.';
  }

  return 'Phương thức này hiện không khả dụng cho đặt chỗ này.';
}

function resolveRedirectUrl(res: CreatePaymentResponse): string | null {
  const url = res.action?.paymentUrl ?? res.payment?.paymentUrl ?? null;
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatPaymentMethodName(method: PaymentMethod): string {
  const code = method.code.trim().toUpperCase();

  switch (code) {
    case 'STRIPE_CARD':
      return 'Thẻ tín dụng, thẻ ghi nợ quốc tế';
    case 'PAYOS_QR':
      return 'Mobile Banking VietQR';
    case 'VNPAY':
      return 'Thanh toán VNPAY';
    case 'MOMO':
      return 'Ví MoMo';
    case 'PAY_LATER':
      return 'Giữ chỗ, thanh toán sau';
    default:
      return method.label;
  }
}

function MethodIconButton({
  method,
  selected,
  onSelect,
  disabled,
  disabledReason,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  disabledReason?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolvePaymentIconUrl(method.icon);
  const title = formatPaymentMethodName(method);

  return (
    <div className="group relative" title={disabledReason ?? undefined}>
      <button
        type="button"
        disabled={disabled}
        aria-label={disabledReason ? `${title}. ${disabledReason}` : title}
        className={`flex min-h-[172px] w-full flex-col rounded-2xl border bg-white px-4 py-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
          selected
            ? 'border-cabin-burgundy ring-2 ring-cabin-burgundy/15'
            : 'border-outline-variant/20 hover:border-luxury-gold/35'
        }`}
        onClick={onSelect}
      >
        <div className="flex min-h-[88px] flex-1 items-center justify-center rounded-xl bg-surface-container-low/40 px-3 py-3">
          {src && !imgFailed ? (
            <img
              src={src}
              alt={method.label}
              className="h-12 w-full object-contain object-center md:h-14"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex items-center justify-center">
              <CreditCard className="h-9 w-9 text-on-surface-variant" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="mt-3 flex min-h-[48px] items-start justify-center">
          <span className="text-sm font-semibold leading-5 text-on-surface">{title}</span>
        </div>
      </button>
      {disabled && disabledReason ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-xl border border-outline-variant/20 bg-white px-3 py-2 text-left text-xs font-medium text-on-surface shadow-lg group-hover:block">
          {disabledReason}
        </div>
      ) : null}
      {disabled && disabledReason ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-0.5 hidden h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-outline-variant/20 bg-white group-hover:block" />
      ) : null}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const paymentRedirectingRef = useRef(false);
  const hardBlockHandledRef = useRef(false);
  const paymentMethodsToastMessageRef = useRef<string | null>(null);
  const acceptTermsRef = useRef<HTMLInputElement | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [resumeVersion, setResumeVersion] = useState(0);
  const [activePayment, setActivePayment] = useState<CreatePaymentResponse | null>(null);
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
  const acceptTermsField = register('acceptTerms');

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods', bookingId],
    queryFn: () =>
      getPaymentMethods(bookingId as string | number, {
        onlySupported: false,
      }),
    enabled: Boolean(bookingId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const groups = useMemo<PaymentMethodGroup[]>(
    () => paymentMethodsQuery.data?.groups ?? [],
    [paymentMethodsQuery.data?.groups]
  );
  const flatMethods = useMemo(() => groups.flatMap((g) => g.methods ?? []), [groups]);
  const supportedMethods = useMemo(
    () => flatMethods.filter((m) => isSelectableMethod(m)),
    [flatMethods]
  );
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
  const hasBooking = Boolean(bookingResponse);
  const bookingExpiresAtMs = parseIsoTime(bookingResponse?.raw?.booking?.expiresAt);

  useEffect(() => {
    if (!hasBooking && !paymentRedirectingRef.current) {
      navigate('/booking/passengers', { replace: true });
    }
  }, [hasBooking, navigate]);

  const resetTransientPaymentState = () => {
    setCreatingPayment(false);
    setRegeneratingPayment(false);
    setCheckingStatus(false);
    setCancelingPayment(false);
  };

  const refreshReturnFromPaymentState = () => {
    resetTransientPaymentState();
    setValue('acceptTerms', Boolean(acceptTermsRef.current?.checked));
    setResumeVersion((current) => current + 1);
  };

  useEffect(() => {
    const refreshPaymentMethods = () => {
      if (!bookingId) return;
      void paymentMethodsQuery.refetch();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        refreshReturnFromPaymentState();
      }
      refreshPaymentMethods();
    };

    const handleFocus = () => {
      refreshReturnFromPaymentState();
      refreshPaymentMethods();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      refreshReturnFromPaymentState();
      refreshPaymentMethods();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bookingId, paymentMethodsQuery.refetch]);

  const clearActivePaymentState = (options?: { keepError?: boolean }) => {
    setActivePayment(null);
    setStatusOverride(null);
    setCheckingStatus(false);
    setCancelingPayment(false);
    setRegeneratingPayment(false);
    if (!options?.keepError) {
      setPaymentError(null);
    }
  };

  useEffect(() => {
    if (!activePayment || !selectedCode) return;
    const activeMethod = normalizePaymentMethodCode(activePayment.payment.method);
    const requestedMethod = normalizePaymentMethodCode(selectedCode);
    if (!activeMethod || !requestedMethod || activeMethod === requestedMethod) return;
    setActivePayment(null);
    setStatusOverride(null);
    setCheckingStatus(false);
    setCancelingPayment(false);
    setRegeneratingPayment(false);
    setPaymentError(null);
  }, [activePayment, selectedCode]);

  const watchedAcceptTerms = watch('acceptTerms');
  const acceptTerms = watchedAcceptTerms || Boolean(acceptTermsRef.current?.checked);

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

  useEffect(() => {
    if (!paymentMethodsQuery.isError || !isHardBlock || !paymentMethodsError) {
      hardBlockHandledRef.current = false;
      return;
    }
    if (hardBlockHandledRef.current) return;
    hardBlockHandledRef.current = true;
    paymentRedirectingRef.current = true;
    clearBooking();
    navigate('/', {
      replace: true,
      state: { paymentRedirectMessage: paymentMethodsError },
    });
  }, [clearBooking, isHardBlock, navigate, paymentMethodsError, paymentMethodsQuery.isError]);

  useEffect(() => {
    if (!paymentMethodsQuery.isError || !paymentMethodsError || isHardBlock) {
      paymentMethodsToastMessageRef.current = null;
      return;
    }
    if (paymentMethodsToastMessageRef.current === paymentMethodsError) return;
    paymentMethodsToastMessageRef.current = paymentMethodsError;
    showCheckoutErrorToast(paymentMethodsError);
  }, [isHardBlock, paymentMethodsError, paymentMethodsQuery.isError]);

  const canPay =
    paymentMethodsQuery.isSuccess &&
    supportedMethods.length > 0 &&
    !paymentMethodsQuery.isError &&
    Boolean(selectedCode) &&
    supportedMethods.some((m) => m.code === selectedCode);
  const showInlinePaymentMethodsError = false;
  const showInlinePaymentError = false;
  const selectedMethod = flatMethods.find((m) => m.code === selectedCode) ?? null;
  const payLaterSelected = isPayLaterMethod(selectedMethod);

  if (!hasBooking || !pricing) return null;

  const currency = pricing.currency || 'VND';
  const checkoutServiceFee = Math.max(
    0,
    pricing.discountedTotalPrice -
      (pricing.baseFare + pricing.taxes + pricing.fees - pricing.discountAmount)
  );
  const formatCurrency = (amount: number) => {
    try {
      if (currency === 'VND') {
        return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
      }
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString('vi-VN')} ${currency}`;
    }
  };

  const onPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay || !acceptTerms || !bookingId || !selectedCode) return;
    void (async () => {
      clearActivePaymentState({ keepError: true });
      setPaymentError(null);
      setStatusOverride(null);
      setCreatingPayment(true);
      const selectedMethod = flatMethods.find((m) => m.code === selectedCode) ?? null;
      const stripeFlow = isStripeMethod(selectedMethod);
      const payLaterFlow = isPayLaterMethod(selectedMethod);
      try {
        const res = await createPaymentLink({ bookingId, method: selectedCode });
        if (stripeFlow) {
          const redirectUrl = resolveRedirectUrl(res);
          if (redirectUrl) {
            paymentRedirectingRef.current = true;
            flushSync(() => {
              refreshReturnFromPaymentState();
            });
            window.location.assign(redirectUrl);
            return;
          }
          const fallbackMsg = 'Không nhận được liên kết thanh toán Stripe. Vui lòng thử lại.';
          setPaymentError(fallbackMsg);
          setActivePayment(null);
          showCheckoutErrorToast(fallbackMsg);
          return;
        }
        if (payLaterFlow) {
          const paymentId = resolvePaymentId(res);
          if (paymentId != null) {
            const currentParams = new URLSearchParams(window.location.search);
            const mockPaymentResult = currentParams.get('mockPaymentResult');
            const mockPaymentVariant = currentParams.get('mockPaymentVariant');
            const nextParams = new URLSearchParams({ paymentId: String(paymentId) });
            if (mockPaymentResult === '1') {
              nextParams.set('mockPaymentResult', '1');
            }
            if (mockPaymentVariant) {
              nextParams.set('mockPaymentVariant', mockPaymentVariant);
            }
            navigate(`/booking/checkout/result?${nextParams.toString()}`);
            return;
          }
          const fallbackMsg =
            'KhÃ´ng nháº­n Ä‘Æ°á»£c phiÃªn thanh toÃ¡n tráº£ sau. Vui lÃ²ng thá»­ láº¡i.';
          setPaymentError(fallbackMsg);
          setActivePayment(null);
          showCheckoutErrorToast(fallbackMsg);
          return;
        }
        setActivePayment(res);
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
        if (isPaymentRetryTooFastMessage(msg)) {
          setPaymentError(null);
          setActivePayment(null);
          showCheckoutErrorToast(getPaymentRetryTooFastToastMessage(msg));
          setCreatingPayment(false);
          return;
        }
        setPaymentError(msg);
        setActivePayment(null);
        showCheckoutErrorToast(msg);
        setCreatingPayment(false);
        return;
      }
      setCreatingPayment(false);
    })();
  };

  const handleClosePayment = () => {
    clearActivePaymentState();
  };

  const handleRegenerate = async () => {
    if (!bookingId || !selectedCode) return;
    setPaymentError(null);
    setStatusOverride(null);
    setRegeneratingPayment(true);
    try {
      const res = await createPaymentLink({ bookingId, method: selectedCode });
      setActivePayment(res);
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
    const paymentId = resolvePaymentId(activePayment);
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
    const paymentId = resolvePaymentId(activePayment);
    if (paymentId == null) {
      setPaymentError('Không tìm thấy mã thanh toán để hủy.');
      return;
    }
    setPaymentError(null);
    setCancelingPayment(true);
    try {
      await cancelPayment(paymentId);
      handleClosePayment();
      toast.success('Da huy thanh toan.');
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const msg =
        pickBackendMessage(data) ||
        (status === 401 || status === 403
          ? 'Vui lòng đăng nhập lại để hủy thanh toán.'
          : 'Không thể hủy thanh toán. Vui lòng thử lại.');
      setPaymentError(msg);
    } finally {
      setCancelingPayment(false);
    }
  };

  const handlePaymentExpired = async () => {
    const paymentId = resolvePaymentId(activePayment);
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
      paymentRedirectingRef.current = true;
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
          ? 'Vui lòng đăng nhập lại để kiểm tra trạng thái thanh toán.'
          : 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.');
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
      {activePayment && (
        <PaymentCard
          data={activePayment}
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
      {paymentMethodsQuery.isError &&
        paymentMethodsError &&
        isHardBlock &&
        !hardBlockHandledRef.current && (
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
                  onClick={() => navigate('/', { replace: true })}
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
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[172px] animate-pulse rounded-2xl border border-outline-variant/20 bg-surface-container-high/40"
                  />
                ))}
              </div>
            )}

            {showInlinePaymentMethodsError &&
              paymentMethodsQuery.isError &&
              paymentMethodsError &&
              !isHardBlock && (
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

            {showInlinePaymentError && paymentError && !activePayment && (
              <div
                className="flex gap-3 rounded-xl border border-cabin-burgundy/40 bg-cabin-burgundy/5 p-4"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-cabin-burgundy" />
                <p className="text-sm font-medium text-on-surface">{paymentError}</p>
              </div>
            )}

            {paymentMethodsQuery.isSuccess && groupsWithMethods.length > 0 && (
              <div className="space-y-8 rounded-3xl border border-luxury-gold/15 bg-white/95 p-6 shadow-sm">
                {groupsWithMethods.map((group) => (
                  <div key={group.type} className="space-y-4">
                    {showGroupLabels && (
                      <p className="text-base font-black text-on-surface">{group.label}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                      {group.methods.map((method) => (
                        <MethodIconButton
                          key={method.code}
                          method={method}
                          selected={selectedCode === method.code}
                          onSelect={() => setSelectedCode(method.code)}
                          disabledReason={resolveDisabledMethodReason(method, bookingExpiresAtMs)}
                          disabled={methodsDisabled || !isSelectableMethod(method)}
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
                  <span className="text-on-surface-variant">Giá vé cơ bản</span>
                  <span className="font-bold text-on-surface">
                    {formatCurrency(pricing.baseFare)}
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
                  {...acceptTermsField}
                  ref={(node) => {
                    acceptTermsField.ref(node);
                    acceptTermsRef.current = node;
                  }}
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
                to="/booking/passengers/seats"
                className={`inline-flex items-center justify-center rounded-md border border-outline-variant/30 px-4 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low ${
                  payLaterSelected ? 'hidden' : ''
                }`}
              >
                Mua thêm
              </Link>
              <Button
                key={`checkout-submit-${resumeVersion}-${selectedCode ?? 'none'}-${acceptTerms ? '1' : '0'}-${creatingPayment ? 'busy' : 'idle'}`}
                type="submit"
                disabled={!acceptTerms || !canPay || creatingPayment}
                icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}
              >
                {creatingPayment ? 'Đang xử lý...' : 'Thanh toán ngay'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
