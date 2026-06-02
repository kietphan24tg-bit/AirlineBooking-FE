import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Lightbulb,
  RotateCw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/ui/Button';
import type { CreatePaymentResponse, PaymentStatus } from '../../types/payment-create.types';

interface PaymentCardProps {
  data: CreatePaymentResponse;
  onClose: () => void;
  onRegenerate: () => void | Promise<void>;
  onCheckStatus: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onExpired: () => void | Promise<void>;
  checkingStatus?: boolean;
  canceling?: boolean;
  regenerating?: boolean;
  statusOverride?: PaymentStatus | null;
  errorMessage?: string | null;
}

type ParsedRecipientDetails = {
  bankBin: string | null;
  bankName: string | null;
  bankShortName: string | null;
  accountNumber: string | null;
};

const BANK_BIN_MAP: Record<string, { name: string; shortName: string }> = {
  '970407': { name: 'Techcombank', shortName: 'TCB' },
  '970415': { name: 'VietinBank', shortName: 'CTG' },
  '970418': { name: 'BIDV', shortName: 'BIDV' },
  '970422': { name: 'Military Commercial Joint Stock Bank', shortName: 'MB' },
  '970423': { name: 'Tien Phong Bank', shortName: 'TPBank' },
  '970432': { name: 'Vietnam Prosperity Joint Stock Commercial Bank', shortName: 'VPBank' },
  '970436': { name: 'Vietcombank', shortName: 'VCB' },
};

function formatTimeLeft(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('vi-VN')} ${currency}`;
  }
}

function getQrImageUrlFromData(qrData: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    qrData
  )}`;
}

function parseEmvFields(payload: string | null): Map<string, string> {
  const fields = new Map<string, string>();
  if (!payload) return fields;

  let index = 0;
  while (index + 4 <= payload.length) {
    const id = payload.slice(index, index + 2);
    const length = Number(payload.slice(index + 2, index + 4));
    if (!Number.isFinite(length) || length < 0) break;
    const start = index + 4;
    const end = start + length;
    if (end > payload.length) break;
    fields.set(id, payload.slice(start, end));
    index = end;
  }

  return fields;
}

function getTransferContent(qrData: string | null, paymentId: number): string {
  const additionalData = parseEmvFields(qrData).get('62') ?? null;
  const billNumber = parseEmvFields(additionalData).get('01');
  const purpose = parseEmvFields(additionalData).get('08');
  return billNumber || purpose || `PAYMENT ${paymentId}`;
}

function parseVietQrRecipientDetails(qrData: string | null): ParsedRecipientDetails {
  const fallback: ParsedRecipientDetails = {
    bankBin: null,
    bankName: null,
    bankShortName: null,
    accountNumber: null,
  };
  const rootFields = parseEmvFields(qrData);

  for (let tag = 26; tag <= 51; tag += 1) {
    const merchantAccountInfo = rootFields.get(String(tag).padStart(2, '0'));
    if (!merchantAccountInfo) continue;

    const nestedFields = parseEmvFields(merchantAccountInfo);
    const guid = nestedFields.get('00');
    if (guid !== 'A000000727') continue;

    const rawBankAndAccount = nestedFields.get('01') ?? '';
    const compact = rawBankAndAccount.replace(/\s+/g, '');
    let bankBin: string | null = null;
    let accountNumber: string | null = null;

    const prefixedMatch = compact.match(/^0006(\d{6})(.+)$/);
    if (prefixedMatch) {
      bankBin = prefixedMatch[1] ?? null;
      accountNumber = prefixedMatch[2] ?? null;
    } else {
      const directMatch = compact.match(/^(\d{6})(.+)$/);
      if (directMatch) {
        bankBin = directMatch[1] ?? null;
        accountNumber = directMatch[2] ?? null;
      }
    }

    const mappedBank = bankBin ? BANK_BIN_MAP[bankBin] : null;
    return {
      bankBin,
      bankName: mappedBank?.name ?? (bankBin ? `Receiving bank (${bankBin})` : null),
      bankShortName: mappedBank?.shortName ?? null,
      accountNumber,
    };
  }

  return fallback;
}

async function copyToClipboard(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  } catch {
    toast.error('Unable to copy. Please try again.');
  }
}

export default function PaymentCard({
  data,
  onClose,
  onRegenerate,
  onCheckStatus,
  onCancel,
  onExpired,
  checkingStatus = false,
  canceling = false,
  regenerating = false,
  statusOverride = null,
  errorMessage = null,
}: PaymentCardProps) {
  const expireAtMs = useMemo(() => Date.parse(data.payment.expireAt), [data.payment.expireAt]);
  const [msLeft, setMsLeft] = useState(() => expireAtMs - Date.now());
  const [hasTriggeredExpiryCheck, setHasTriggeredExpiryCheck] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const status = (statusOverride ?? (data.payment.status as PaymentStatus)) || 'PENDING';
  const qrData = data.action?.qrData ?? data.payment.qrData ?? null;
  const qrImageUrl =
    data.action?.qrImageUrl ??
    data.payment.qrImageUrl ??
    (qrData ? getQrImageUrlFromData(qrData) : null);
  const amountText = formatMoney(data.payment.amount, data.payment.currency || 'VND');
  const transferContent = getTransferContent(qrData, data.payment.id);
  const recipientDetails = useMemo(() => parseVietQrRecipientDetails(qrData), [qrData]);
  const isCanceled = status === 'CANCELLED' || status === 'CANCELED';

  useEffect(() => {
    setMsLeft(expireAtMs - Date.now());
    setHasTriggeredExpiryCheck(false);
  }, [expireAtMs]);

  useEffect(() => {
    if (!Number.isFinite(expireAtMs)) return;
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setMsLeft(expireAtMs - Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [expireAtMs]);

  useEffect(() => {
    if (msLeft > 0) return;
    if (hasTriggeredExpiryCheck) return;
    setHasTriggeredExpiryCheck(true);
    void onExpired();
  }, [msLeft, hasTriggeredExpiryCheck, onExpired]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const badge =
    status === 'SUCCESS' ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> SUCCESS
      </span>
    ) : status === 'FAILED' ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
        <XCircle className="h-4 w-4" /> FAILED
      </span>
    ) : status === 'EXPIRED' ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
        <Clock className="h-4 w-4" /> EXPIRED
      </span>
    ) : isCanceled ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
        <XCircle className="h-4 w-4" /> CANCELLED
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
        <Clock className="h-4 w-4" /> PENDING
      </span>
    );

  return (
    <div
      className="fixed inset-0 z-[200] flex min-h-svh items-center justify-center bg-black/60 px-4 py-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-outline-variant/20 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-outline-variant/20 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-luxury-gold/10 text-luxury-gold">
              <Lightbulb className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-6 text-on-surface md:text-base">
                Open any banking app to <span className="font-black">scan the VietQR code</span> or{' '}
                <span className="font-black">make a bank transfer</span> using the exact amount and
                transfer note shown below.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {badge}
                {status === 'PENDING' ? (
                  <span className="rounded-full bg-luxury-gold/10 px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    Time left:{' '}
                    <span className="font-black text-midnight-burgundy">
                      {formatTimeLeft(msLeft)}
                    </span>
                  </span>
                ) : null}
                <span className="text-xs font-semibold text-on-surface-variant">
                  Payment #{data.payment.id}
                </span>
              </div>
            </div>
          </div>

          <div className={status === 'PENDING' ? 'hidden' : 'flex shrink-0 items-center gap-2'}>
            {status !== 'PENDING' ? (
              <button
                type="button"
                onClick={onClose}
                disabled={canceling || checkingStatus || regenerating}
                className="inline-flex h-10 items-center justify-center rounded-md border border-outline-variant/30 px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canceling ? 'Cancelling...' : 'Cancel'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={checkingStatus || regenerating}
                className="inline-flex h-10 items-center justify-center rounded-md border border-outline-variant/30 px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-8 px-5 py-7 md:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.1fr)] md:px-8">
          <div className="flex flex-col items-center justify-start">
            <div className="mb-2 flex items-center gap-2 text-3xl font-black leading-none">
              <span className="text-[#e51f2f]">VietQR</span>
              <span className="rounded bg-[#f8e32b] px-2 py-1 text-2xl text-[#078a43]">PRO</span>
            </div>

            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="Payment QR code"
                className={`h-[250px] w-[250px] bg-white object-contain p-1 md:h-[280px] md:w-[280px] ${
                  status !== 'PENDING' ? 'opacity-60' : ''
                }`}
              />
            ) : (
              <div className="flex h-[250px] w-[250px] flex-col items-center justify-center border border-outline-variant/30 bg-white p-4 text-center md:h-[280px] md:w-[280px]">
                <AlertCircle className="h-7 w-7 text-on-surface-variant" />
                <p className="mt-2 text-sm font-semibold text-on-surface">No QR data available</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Please generate a new payment code.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center gap-4 text-sm font-black">
              <span className="text-[#25529b]">napas 247</span>
              {recipientDetails.bankShortName ? (
                <>
                  <span className="h-7 w-px bg-outline-variant/40" />
                  <span className="text-[#d71920]">{recipientDetails.bankShortName}</span>
                </>
              ) : null}
            </div>

            {false ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={checkingStatus || regenerating || canceling}
                className="mt-8 inline-flex h-11 min-w-28 items-center justify-center rounded-md border border-outline-variant/40 px-7 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canceling ? 'Cancelling...' : 'Cancel'}
              </button>
            ) : null}
          </div>

          <div className="min-w-0 pt-1">
            {(status === 'FAILED' || status === 'EXPIRED' || isCanceled || errorMessage) && (
              <div
                className={`mb-5 flex gap-3 rounded-lg border p-4 ${
                  status === 'FAILED'
                    ? 'border-rose-200 bg-rose-50'
                    : status === 'EXPIRED'
                      ? 'border-amber-200 bg-amber-50'
                      : isCanceled
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-outline-variant/40 bg-surface-container-low'
                }`}
                role="alert"
              >
                <AlertCircle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    status === 'FAILED'
                      ? 'text-rose-700'
                      : status === 'EXPIRED'
                        ? 'text-amber-800'
                        : isCanceled
                          ? 'text-slate-700'
                          : 'text-on-surface-variant'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-black text-on-surface">
                    {status === 'FAILED'
                      ? 'Payment failed'
                      : status === 'EXPIRED'
                        ? 'Payment code has expired'
                        : 'An error occurred'}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {errorMessage || 'Please create a new code to continue the payment.'}
                  </p>
                </div>
              </div>
            )}

            {status === 'SUCCESS' ? (
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-800">Payment has been received.</p>
                <p className="mt-1 text-sm text-emerald-800/80">
                  You can close this window and continue.
                </p>
              </div>
            ) : null}

            {recipientDetails.bankName ? (
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-on-surface-variant">Bank</p>
                  <p className="font-black text-on-surface">{recipientDetails.bankName}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              {recipientDetails.accountNumber ? (
                <TransferRow
                  label="Account number:"
                  value={recipientDetails.accountNumber}
                  copyLabel="account number"
                />
              ) : null}
              <TransferRow label="Amount:" value={amountText} copyLabel="amount" />
              <TransferRow
                label="Transfer note:"
                value={transferContent}
                copyLabel="transfer note"
              />
            </div>

            <p className="mt-9 text-base leading-7 text-on-surface">
              Note: Enter the exact amount <span className="font-black">{amountText}</span> and
              transfer note <span className="font-black">{transferContent}</span> when making the
              payment. Recipient details should match what your banking app shows after scanning the
              QR code.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {status === 'PENDING' ? (
                <Button
                  type="button"
                  onClick={onCheckStatus}
                  disabled={checkingStatus || regenerating || canceling}
                  icon={
                    <RotateCw className={checkingStatus ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                  }
                >
                  Check again
                </Button>
              ) : null}

              {status === 'PENDING' ? (
                <Button
                  type="button"
                  onClick={onCancel}
                  disabled={checkingStatus || regenerating || canceling}
                  icon={<XCircle className="h-4 w-4" />}
                >
                  {canceling ? 'Cancelling...' : 'Cancel payment'}
                </Button>
              ) : null}

              {status === 'FAILED' || status === 'EXPIRED' || isCanceled ? (
                <Button
                  type="button"
                  onClick={onRegenerate}
                  disabled={regenerating || checkingStatus}
                  icon={<RotateCw className={regenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
                >
                  Create new code
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferRow({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <p className="text-sm text-on-surface-variant">{label}</p>
        <p className="mt-1 truncate text-base font-black text-on-surface">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void copyToClipboard(copyLabel, value)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-emerald-50 px-3 text-sm font-bold text-on-surface-variant transition hover:bg-emerald-100"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </button>
    </div>
  );
}
