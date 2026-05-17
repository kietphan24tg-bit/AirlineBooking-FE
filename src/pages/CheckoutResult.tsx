import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Loader2,
  PlaneTakeoff,
  RefreshCcw,
  Ticket,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AmbientSweep from '../components/layout/AmbientSweep';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import Button from '../components/ui/Button';
import {
  getPaymentResultStatus,
  getPaymentResultSummary,
} from '../services/payment.service';
import type {
  PaymentResultStatusResponse,
  PaymentResultSummaryPassenger,
  PaymentResultSummaryPassengerFareBreakdown,
  PaymentResultSummaryPassengerSegment,
  PaymentResultSummaryPassengerService,
  PaymentResultSummaryResponse,
  PaymentResultSummarySegment,
  PaymentResultSummarySeat,
} from '../types/payment-create.types';

function pickBackendMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const error = obj.error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  return null;
}

function formatCurrency(amount: number | null | undefined, currency = 'VND'): string {
  if (amount == null) return '--';
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return '--';
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] ?? '*'}***@${domain}`;
  return `${name.slice(0, 1)}${'*'.repeat(Math.min(name.length - 2, 8))}${name.slice(-1)}@${domain}`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '--';
  const trimmed = phone.replace(/\s+/g, '');
  if (trimmed.length <= 5) return trimmed;
  return `${trimmed.slice(0, 4)}${'*'.repeat(Math.max(0, trimmed.length - 7))}${trimmed.slice(-3)}`;
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '--';
  const normalized = method.trim().toUpperCase();
  if (normalized.includes('PAY_LATER')) return 'Thanh toán sau';
  if (normalized.includes('STRIPE')) return 'Stripe';
  if (normalized.includes('PAYOS') || normalized.includes('VIETQR')) return 'VietQR / PayOS';
  return method;
}

function formatTimeLeft(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getQrImageUrlFromData(qrData: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
    qrData
  )}`;
}

function passengerTypeLabel(type: string | null | undefined): string {
  const normalized = (type ?? '').trim().toUpperCase();
  if (normalized === 'ADULT') return 'Người lớn';
  if (normalized === 'CHILD') return 'Trẻ em';
  if (normalized === 'INFANT') return 'Em bé';
  return type || 'Hành khách';
}

function resolveSeatText(seat: PaymentResultSummarySeat | null | undefined): string {
  if (!seat || !seat.assigned || !seat.seatNumber) return 'Chưa chọn ghế';
  return seat.seatNumber;
}

function routeLabel(segment: PaymentResultSummarySegment): string {
  return `${segment.departure.airportCode ?? '--'} -> ${segment.arrival.airportCode ?? '--'}`;
}

function segmentDateSource(segment: PaymentResultSummarySegment): string | null {
  return segment.departure.time ?? segment.arrival.time ?? null;
}

function findPassengerSegment(
  passenger: PaymentResultSummaryPassenger,
  segmentKey: string
): PaymentResultSummaryPassengerSegment | null {
  return passenger.segments.find((item) => item.segmentKey === segmentKey) ?? null;
}

function servicesForSegment(
  services: PaymentResultSummaryPassengerService[],
  segmentKey: string
): PaymentResultSummaryPassengerService[] {
  return services.filter((service) => service.segmentKey === segmentKey || service.segmentKey == null);
}

function statusErrorMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  if (status === 404) return 'Không tìm thấy phiên thanh toán.';
  return pickBackendMessage(data) || 'Không thể kiểm tra trạng thái thanh toán.';
}

function summaryErrorMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  if (status === 404) return 'Không tìm thấy thông tin thanh toán.';
  if (status === 409) return 'Thanh toán đang được xác nhận, vui lòng đợi trong giây lát.';
  return pickBackendMessage(data) || 'Không thể tải thông tin thanh toán thành công.';
}

function isSummaryConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

function resolveMockPaymentId(searchParams: URLSearchParams): number | null {
  const legacyStatus = searchParams.get('status');
  const mockFlag = searchParams.get('mockPaymentResult') === '1';
  if (mockFlag || legacyStatus === 'success') return 1001;
  return null;
}

function isPendingPaymentExpired(expireAt: string | null | undefined): boolean {
  if (!expireAt) return false;
  const expireAtMs = Date.parse(expireAt);
  return Number.isFinite(expireAtMs) && Date.now() >= expireAtMs;
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-20 sm:px-6 lg:px-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function StateCard({
  icon,
  title,
  message,
  tone = 'default',
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  tone?: 'default' | 'danger' | 'success';
  actions?: React.ReactNode;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-cabin-burgundy/20'
      : tone === 'success'
        ? 'border-emerald-500/20'
        : 'border-luxury-gold/20';

  return (
    <div className={`mx-auto max-w-3xl rounded-[2rem] border bg-white/92 p-8 shadow-2xl backdrop-blur-sm sm:p-12 ${toneClass}`}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low shadow-inner">
          {icon}
        </div>
        <h1 className="font-headline text-3xl font-black text-on-surface md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-on-surface-variant sm:text-base">
          {message}
        </p>
        {actions ? <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div> : null}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-container-high/55 ${className}`} />;
}

function PendingResultSkeleton() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-luxury-gold/15 bg-white/92 shadow-[0_24px_60px_rgba(62,16,30,0.10)] backdrop-blur-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_24rem]">
          <div className="relative px-7 py-8 sm:px-10 sm:py-10">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-luxury-gold/50 to-transparent" />
            <SkeletonBlock className="h-10 w-64 rounded-full bg-amber-100" />
            <SkeletonBlock className="mt-6 h-4 w-36" />
            <SkeletonBlock className="mt-4 h-14 w-full max-w-[42rem]" />
            <SkeletonBlock className="mt-3 h-5 w-full max-w-[38rem]" />
            <SkeletonBlock className="mt-2 h-5 w-full max-w-[34rem]" />

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-8 w-36" />
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-6 w-32" />
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-6 w-40" />
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-6 w-36" />
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-6 w-32" />
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-6 w-40" />
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-amber-200/70 bg-amber-50/80 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3 w-28 bg-amber-100" />
                  <SkeletonBlock className="mt-4 h-10 w-40 bg-amber-100" />
                  <SkeletonBlock className="mt-4 h-5 w-full max-w-[25rem] bg-amber-100" />
                  <SkeletonBlock className="mt-2 h-5 w-full max-w-[20rem] bg-amber-100" />
                </div>
                <div className="flex gap-3 sm:flex-row">
                  <SkeletonBlock className="h-14 w-48 rounded-xl bg-amber-200/80" />
                  <SkeletonBlock className="h-14 w-36 rounded-xl bg-white/90" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden border-t border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.96),rgba(62,16,30,0.96))] px-7 py-8 text-white lg:border-l lg:border-t-0 lg:px-8 lg:py-10">
            <SkeletonBlock className="h-3 w-32 bg-white/15" />
            <SkeletonBlock className="mt-4 h-12 w-44 bg-white/15" />

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <SkeletonBlock className="mx-auto h-3 w-32 bg-white/15" />
              <SkeletonBlock className="mx-auto mt-6 aspect-square w-full max-w-[220px] rounded-2xl bg-white/15" />
            </div>

            <div className="mt-6 space-y-4 border-t border-luxury-gold/15 pt-6">
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-4 w-20 bg-white/15" />
                <SkeletonBlock className="h-8 w-32 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-4 w-24 bg-white/15" />
                <SkeletonBlock className="h-4 w-28 bg-white/15" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-4 w-24 bg-white/15" />
                <SkeletonBlock className="h-4 w-16 bg-white/15" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-4 w-24 bg-white/15" />
                <SkeletonBlock className="h-4 w-36 bg-white/15" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <article className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="border-b border-luxury-gold/10 pb-5">
            <SkeletonBlock className="h-3 w-36" />
            <SkeletonBlock className="mt-4 h-10 w-80" />
            <SkeletonBlock className="mt-3 h-5 w-full max-w-[28rem]" />
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] bg-surface-container-low px-5 py-5">
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="mt-4 h-7 w-48" />
              <SkeletonBlock className="mt-3 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-[88%]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-surface-container-low px-5 py-4">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonBlock className="mt-4 h-5 w-full" />
                  <SkeletonBlock className="mt-2 h-4 w-[82%]" />
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-luxury-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,244,240,0.92))] p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <SkeletonBlock className="h-3 w-40" />
          <SkeletonBlock className="mt-4 h-10 w-72" />
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-5 w-full" />
            <div className="rounded-2xl border border-luxury-gold/12 bg-white/80 px-5 py-4">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="mt-4 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-[88%]" />
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-white/80 px-5 py-4">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="mt-4 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-[82%]" />
            </div>
          </div>
        </article>
      </section>

    </div>
  );
}

function SuccessHero({ summary }: { summary: PaymentResultSummaryResponse }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-luxury-gold/15 bg-white/90 shadow-[0_24px_60px_rgba(62,16,30,0.10)] backdrop-blur-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_24rem]">
        <div className="relative px-7 py-8 sm:px-10 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-luxury-gold/50 to-transparent" />
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
            Thanh toÃƒÂ¡n hoÃƒÂ n tÃ¡ÂºÂ¥t
          </div>
          <p className="mt-6 font-headline text-sm font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            The Sovereign
          </p>
          <h1 className="mt-3 max-w-3xl font-headline text-3xl font-black tracking-tight text-on-surface sm:text-4xl lg:text-[2.8rem]">
            Thanh toÃƒÂ¡n thÃƒÂ nh cÃƒÂ´ng
          </h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                MÃƒÂ£ Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”
              </p>
              <p className="mt-2 font-mono text-xl font-black tracking-[0.18em] text-midnight-burgundy">
                {summary.booking.pnrCode}
              </p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                NgÃ†Â°Ã¡Â»Âi liÃƒÂªn hÃ¡Â»â€¡
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">{summary.contact.fullName || '--'}</p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Email
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">{maskEmail(summary.contact.email)}</p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">{maskPhone(summary.contact.phone)}</p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Ã„ÂÃƒÂ£ thanh toÃƒÂ¡n lÃƒÂºc
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">
                {formatDateTime(summary.booking.paidAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                HÃƒÂ nh khÃƒÂ¡ch
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">
                {summary.summary.passengerCount ?? summary.passengers.length} hÃƒÂ nh khÃƒÂ¡ch
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden border-t border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.96),rgba(62,16,30,0.96))] px-7 py-8 text-white lg:border-l lg:border-t-0 lg:px-8 lg:py-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-luxury-gold/10 blur-3xl" />
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-luxury-gold/80">
            TÃ¡Â»â€¢ng thanh toÃƒÂ¡n
          </p>
          <p className="mt-3 font-headline text-4xl font-black tracking-tight text-luxury-gold">
            {formatCurrency(summary.summary.totalAmount ?? summary.payment.amount, summary.summary.currency)}
          </p>
          <div className="mt-8 space-y-4 border-t border-luxury-gold/15 pt-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/70">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-luxury-gold">
                <CheckCircle2 className="h-4 w-4" />
                ThÃƒÂ nh cÃƒÂ´ng
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 text-sm">
              <span className="text-white/70">PhÃ†Â°Ã†Â¡ng thÃ¡Â»Â©c</span>
              <span className="max-w-[11rem] text-right font-semibold text-white">
                {paymentMethodLabel(summary.payment.method)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 text-sm">
              <span className="text-white/70">MÃƒÂ£ giao dÃ¡Â»â€¹ch</span>
              <span className="max-w-[11rem] text-right font-semibold text-white">
                {summary.payment.transactionId || '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PostPaymentInfo({ summary }: { summary: PaymentResultSummaryResponse }) {
  return (
    <section>
      <article className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="flex flex-col gap-2 border-b border-luxury-gold/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
              LiÃƒÂªn hÃ¡Â»â€¡ Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
              HÃ¡Â»â€œ sÃ†Â¡ sau thanh toÃƒÂ¡n
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant">
            ThÃƒÂ´ng tin liÃƒÂªn hÃ¡Â»â€¡ Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã„â€˜Ã†Â°a lÃƒÂªn khu vÃ¡Â»Â±c xÃƒÂ¡c nhÃ¡ÂºÂ­n phÃƒÂ­a trÃƒÂªn Ã„â€˜Ã¡Â»Æ’ dÃ¡Â»â€¦ theo dÃƒÂµi.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-[1.5rem] border border-luxury-gold/12 bg-surface-container-low px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              TrÃ¡ÂºÂ¡ng thÃƒÂ¡i xÃ¡Â»Â­ lÃƒÂ½
            </p>
            <p className="mt-2 text-lg font-black text-on-surface">Ã„ÂÃ¡ÂºÂ·t chÃ¡Â»â€” Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c xÃƒÂ¡c nhÃ¡ÂºÂ­n</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              HÃ¡Â»â€¡ thÃ¡Â»â€˜ng Ã„â€˜ÃƒÂ£ ghi nhÃ¡ÂºÂ­n thanh toÃƒÂ¡n vÃƒÂ  Ã„â€˜ang hoÃƒÂ n tÃ¡ÂºÂ¥t hÃ¡Â»â€œ sÃ†Â¡ vÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­, dÃ¡Â»â€¹ch vÃ¡Â»Â¥ Ã„â€˜i kÃƒÂ¨m vÃƒÂ  cÃƒÂ¡c bÃ†Â°Ã¡Â»â€ºc hÃ¡Â»â€” trÃ¡Â»Â£ sau Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-container-low px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                KÃƒÂªnh hÃ¡Â»â€” trÃ¡Â»Â£
              </p>
              <p className="mt-2 text-sm font-semibold text-on-surface">Email liÃƒÂªn hÃ¡Â»â€¡ trong Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                DÃƒÂ¹ng Ã„â€˜Ã¡Â»Æ’ nhÃ¡ÂºÂ­n xÃƒÂ¡c nhÃ¡ÂºÂ­n, cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t vÃƒÂ  phÃ¡ÂºÂ£n hÃ¡Â»â€œi tÃ¡Â»Â« hÃ¡Â»â€¡ thÃ¡Â»â€˜ng.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                LÃ†Â°u ÃƒÂ½
              </p>
              <p className="mt-2 text-sm font-semibold text-on-surface">KiÃ¡Â»Æ’m tra hÃƒÂ nh trÃƒÂ¬nh vÃƒÂ  dÃ¡Â»â€¹ch vÃ¡Â»Â¥ Ã„â€˜i kÃƒÂ¨m</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                NÃ¡ÂºÂ¿u cÃ¡ÂºÂ§n Ã„â€˜iÃ¡Â»Âu chÃ¡Â»â€°nh, hÃƒÂ£y thao tÃƒÂ¡c trÃ†Â°Ã¡Â»â€ºc thÃ¡Â»Âi hÃ¡ÂºÂ¡n lÃƒÂ m thÃ¡Â»Â§ tÃ¡Â»Â¥c.
              </p>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function BookingInfo({ summary }: { summary: PaymentResultSummaryResponse }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <article className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="flex flex-col gap-2 border-b border-luxury-gold/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
              LiÃƒÂªn hÃ¡Â»â€¡ Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
              ThÃƒÂ´ng tin Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant">ThÃƒÂ´ng tin liÃƒÂªn hÃ¡Â»â€¡ dÃƒÂ¹ng cho xÃƒÂ¡c nhÃ¡ÂºÂ­n vÃƒÂ  hÃ¡Â»â€” trÃ¡Â»Â£ sau thanh toÃƒÂ¡n.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-container-low px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">MÃƒÂ£ Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”</p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.18em] text-midnight-burgundy">
              {summary.booking.pnrCode}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-container-low px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">NgÃ†Â°Ã¡Â»Âi liÃƒÂªn hÃ¡Â»â€¡</p>
            <p className="mt-2 text-lg font-black text-on-surface">{summary.contact.fullName || '--'}</p>
          </div>
          <div className="rounded-2xl bg-surface-container-low px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Email</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">{maskEmail(summary.contact.email)}</p>
          </div>
          <div className="rounded-2xl bg-surface-container-low px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">{maskPhone(summary.contact.phone)}</p>
          </div>
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-luxury-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,244,240,0.92))] p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
          VÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­
        </p>
        <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
          TÃƒÂ³m tÃ¡ÂºÂ¯t thanh toÃƒÂ¡n
        </h2>
        <div className="mt-6 space-y-4 text-sm">
          <div className="flex items-start justify-between gap-4 border-b border-luxury-gold/10 pb-4">
            <span className="text-on-surface-variant">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i hÃ¡Â»â€œ sÃ†Â¡</span>
            <span className="font-semibold text-on-surface">
              {summary.tickets.length > 0 ? 'VÃƒÂ© Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c phÃƒÂ¡t hÃƒÂ nh trong hÃ¡Â»â€¡ thÃ¡Â»â€˜ng' : 'VÃƒÂ© Ã„â€˜ang Ã„â€˜Ã†Â°Ã¡Â»Â£c hoÃƒÂ n tÃ¡ÂºÂ¥t'}
            </span>
          </div>
          <div className="rounded-2xl border border-luxury-gold/12 bg-white/80 px-5 py-4">
            <p className="text-sm font-semibold text-on-surface">Truy cÃ¡ÂºÂ­p vÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              {summary.tickets.length > 0
                ? 'VÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­ Ã„â€˜ÃƒÂ£ cÃƒÂ³ trong hÃ¡Â»â€¡ thÃ¡Â»â€˜ng. NÃƒÂºt tÃ¡ÂºÂ£i file sÃ¡ÂºÂ½ Ã„â€˜Ã†Â°Ã¡Â»Â£c kÃƒÂ­ch hoÃ¡ÂºÂ¡t khi backend cung cÃ¡ÂºÂ¥p endpoint download.'
                : 'HÃ¡Â»â€¡ thÃ¡Â»â€˜ng Ã„â€˜ang Ã„â€˜Ã¡Â»â€œng bÃ¡Â»â„¢ dÃ¡Â»Â¯ liÃ¡Â»â€¡u vÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­ tÃ¡Â»Â« backend.'}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}

function FlightInfo({ segments }: { segments: PaymentResultSummarySegment[] }) {
  return (
    <section className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-luxury-gold/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PlaneTakeoff className="h-5 w-5 text-midnight-burgundy" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-on-surface">ThÃƒÂ´ng tin chuyÃ¡ÂºÂ¿n bay</h2>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {segments.map((segment) => (
          <article
            key={segment.segmentKey}
            className="rounded-[1.5rem] border border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(250,250,250,0.95),rgba(243,243,243,0.95))] p-5"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                  <span className="rounded-full bg-white px-3 py-1 text-midnight-burgundy">
                    {segment.journeyType || 'ChuyÃ¡ÂºÂ¿n Ã„â€˜i'}
                  </span>
                  <span>{segment.airlineName || 'Airline'}</span>
                  <span>{segment.flightNumber || '--'}</span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                  <div>
                    <p className="font-headline text-3xl font-black tracking-tight text-on-surface">
                      {segment.departure.airportCode || '--'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {formatTime(segment.departure.time)}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {segment.departure.city || segment.departure.airportName || '--'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {segment.departure.terminal ? `NhÃƒÂ  ga ${segment.departure.terminal}` : ' '}
                    </p>
                  </div>

                  <div className="min-w-[140px] text-center">
                    <p className="text-sm font-black text-midnight-burgundy">
                      {formatDuration(segment.durationMinutes)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      {(segment.stops ?? 0) > 0 ? `${segment.stops} Ã„â€˜iÃ¡Â»Æ’m dÃ¡Â»Â«ng` : 'Bay thÃ¡ÂºÂ³ng'}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-luxury-gold/30" />
                      <div className="h-2.5 w-2.5 rounded-full bg-midnight-burgundy" />
                      <div className="h-px flex-1 bg-luxury-gold/30" />
                    </div>
                  </div>

                  <div className="md:text-right">
                    <p className="font-headline text-3xl font-black tracking-tight text-on-surface">
                      {segment.arrival.airportCode || '--'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {formatTime(segment.arrival.time)}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {segment.arrival.city || segment.arrival.airportName || '--'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {segment.arrival.terminal ? `NhÃƒÂ  ga ${segment.arrival.terminal}` : ' '}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold text-on-surface-variant">
                  {formatDate(segmentDateSource(segment))}
                </p>
              </div>

              <div className="rounded-2xl border border-luxury-gold/10 bg-white/90 px-4 py-4 lg:min-w-[180px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">HÃ¡ÂºÂ¡ng vÃƒÂ©</p>
                <p className="mt-2 text-sm font-black text-on-surface">
                  {segment.fare?.cabinClass || '--'}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {segment.fare?.fareClassName || '--'}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PassengerInfo({
  summary,
}: {
  summary: PaymentResultSummaryResponse;
}) {
  return (
    <section className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-luxury-gold/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserRound className="h-5 w-5 text-midnight-burgundy" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-on-surface">HÃƒÂ nh khÃƒÂ¡ch</h2>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {summary.passengers.map((passenger, index) => (
          <article
            key={passenger.passengerId}
            className="rounded-[1.5rem] border border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(250,250,250,0.95),rgba(243,243,243,0.95))] p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  HÃƒÂ nh khÃƒÂ¡ch {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-lg font-black text-on-surface">
                  {passengerTypeLabel(passenger.passengerType)}: {passenger.fullName || '--'}
                </h3>
              </div>
              <div className="rounded-2xl border border-luxury-gold/10 bg-white/90 px-4 py-3 text-sm text-on-surface-variant">
                {passenger.segments.length} chÃ¡ÂºÂ·ng
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {summary.segments.map((segment) => {
                const passengerSegment = findPassengerSegment(passenger, segment.segmentKey);
                const segmentServices = servicesForSegment(passenger.services, segment.segmentKey);
                return (
                  <div
                    key={`${passenger.passengerId}-${segment.segmentKey}`}
                    className="rounded-2xl border border-luxury-gold/8 bg-white/90 p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      ChÃ¡ÂºÂ·ng bay
                    </p>
                    <p className="mt-1 text-sm font-black text-on-surface">{routeLabel(segment)}</p>
                    <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                      <p>
                        GhÃ¡ÂºÂ¿: <span className="font-semibold text-on-surface">{resolveSeatText(passengerSegment?.seat)}</span>
                      </p>
                      <p>
                        HÃƒÂ nh lÃƒÂ½ kÃƒÂ½ gÃ¡Â»Â­i:{' '}
                        <span className="font-semibold text-on-surface">
                          {segment.fare?.checkedBaggageKg != null
                            ? `GÃƒÂ³i ${segment.fare.checkedBaggageKg}kg`
                            : 'Theo Ã„â€˜iÃ¡Â»Âu kiÃ¡Â»â€¡n vÃƒÂ©'}
                        </span>
                      </p>
                      <p>
                        XÃƒÂ¡ch tay:{' '}
                        <span className="font-semibold text-on-surface">
                          {segment.fare?.carryOnBaggageKg != null
                            ? `${segment.fare.carryOnBaggageKg}kg`
                            : 'Theo Ã„â€˜iÃ¡Â»Âu kiÃ¡Â»â€¡n vÃƒÂ©'}
                        </span>
                      </p>
                      <p>
                        VÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­:{' '}
                        <span className="font-semibold text-on-surface">
                          {passengerSegment?.ticket?.ticketNumber || 'Ã„Âang cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t'}
                        </span>
                      </p>
                      <p>
                        DÃ¡Â»â€¹ch vÃ¡Â»Â¥ thÃƒÂªm:{' '}
                        <span className="font-semibold text-on-surface">
                          {segmentServices.length > 0
                            ? segmentServices
                                .map((service) => service.optionName || service.serviceName || 'DÃ¡Â»â€¹ch vÃ¡Â»Â¥')
                                .join(', ')
                            : 'KhÃƒÂ´ng cÃƒÂ³'}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FareBreakdown({
  summary,
  segmentsByKey,
}: {
  summary: PaymentResultSummaryResponse;
  segmentsByKey: Map<string, PaymentResultSummarySegment>;
}) {
  const totals = summary.fareBreakdown.totals;
  const currency = summary.fareBreakdown.currency;

  return (
    <section className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-luxury-gold/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-midnight-burgundy" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-on-surface">Chi tiÃ¡ÂºÂ¿t giÃƒÂ¡ vÃƒÂ©</h2>
        </div>
        <p className="text-sm text-on-surface-variant">TÃ¡Â»â€¢ng hÃ¡Â»Â£p giÃƒÂ¡ vÃƒÂ©, thuÃ¡ÂºÂ¿ phÃƒÂ­ vÃƒÂ  dÃ¡Â»â€¹ch vÃ¡Â»Â¥ theo tÃ¡Â»Â«ng hÃƒÂ nh khÃƒÂ¡ch.</p>
      </div>

      <div className="mt-6 space-y-5">
        {summary.fareBreakdown.byPassenger.map((passenger) => (
          <PassengerFareCard
            key={passenger.passengerId}
            passenger={passenger}
            currency={currency}
            segmentsByKey={segmentsByKey}
          />
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.04),rgba(255,255,255,0.95))] p-5">
        <div className="grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4">
            <span>GiÃƒÂ¡ vÃƒÂ©</span>
            <span className="font-semibold text-on-surface">{formatCurrency(totals.baseFare, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>ThuÃ¡ÂºÂ¿, phÃƒÂ­</span>
            <span className="font-semibold text-on-surface">{formatCurrency(totals.tax, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>DÃ¡Â»â€¹ch vÃ¡Â»Â¥</span>
            <span className="font-semibold text-on-surface">
              {formatCurrency((totals.serviceFee ?? 0) + (totals.seatFee ?? 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>GiÃ¡ÂºÂ£m giÃƒÂ¡</span>
            <span className="font-semibold text-on-surface">{formatCurrency(totals.discount, currency)}</span>
          </div>
        </div>

        <div className="my-5 h-px bg-outline-variant/30" />

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-on-surface">TÃ¡Â»â€¢ng tiÃ¡Â»Ân</span>
          <span className="text-2xl font-black text-emerald-600">
            {formatCurrency(totals.total, currency)}
          </span>
        </div>
      </div>
    </section>
  );
}

function PassengerFareCard({
  passenger,
  currency,
  segmentsByKey,
}: {
  passenger: PaymentResultSummaryPassengerFareBreakdown;
  currency: string;
  segmentsByKey: Map<string, PaymentResultSummarySegment>;
}) {
  return (
    <article className="rounded-[1.5rem] border border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(250,250,250,0.95),rgba(243,243,243,0.95))] p-5">
      <h3 className="text-lg font-black text-on-surface">{passenger.passengerLabel}</h3>
      <div className="mt-4 space-y-4">
        {passenger.bySegment.map((segment) => {
          const segmentSummary = segmentsByKey.get(segment.segmentKey);
          const header = segmentSummary ? routeLabel(segmentSummary) : segment.routeLabel;
          const serviceTotal = segment.services.reduce((sum, item) => sum + item.amount, 0);
          const taxesTotal = segment.taxesAndFees.reduce((sum, item) => sum + item.amount, 0);

          return (
            <div
              key={`${passenger.passengerId}-${segment.segmentKey}`}
              className="rounded-2xl border border-luxury-gold/8 bg-white/90 p-4"
            >
              <p className="text-sm font-black text-on-surface">{header}</p>
              <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between gap-4">
                  <span>GiÃƒÂ¡ vÃƒÂ©</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(segment.fare.baseFare, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>ThuÃ¡ÂºÂ¿, phÃƒÂ­</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(taxesTotal + segment.fare.vatOnFare, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>DÃ¡Â»â€¹ch vÃ¡Â»Â¥</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(serviceTotal, currency)}
                  </span>
                </div>
                <div className="h-px bg-outline-variant/20" />
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-on-surface">TÃ¡Â»â€¢ng chÃ¡ÂºÂ·ng</span>
                  <span className="font-black text-on-surface">
                    {formatCurrency(segment.segmentTotal, currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-luxury-gold/8 bg-white/90 px-4 py-3">
        <span className="text-sm font-semibold text-on-surface">TÃ¡Â»â€¢ng hÃƒÂ nh khÃƒÂ¡ch</span>
        <span className="text-lg font-black text-on-surface">
          {formatCurrency(passenger.passengerTotal, currency)}
        </span>
      </div>
    </article>
  );
}

function ResultActions({ hasTickets }: { hasTickets: boolean }) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            Ã„ÂiÃ¡Â»Âu hÃ†Â°Ã¡Â»â€ºng tiÃ¡ÂºÂ¿p theo
          </p>
          <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
            TiÃ¡ÂºÂ¿p tÃ¡Â»Â¥c hÃƒÂ nh trÃƒÂ¬nh
          </h2>
        </div>
        <p className="text-sm text-on-surface-variant">Quay vÃ¡Â»Â trang chÃ¡Â»Â§ hoÃ¡ÂºÂ·c mÃ¡Â»Å¸ khu vÃ¡Â»Â±c quÃ¡ÂºÂ£n lÃƒÂ½ chuyÃ¡ÂºÂ¿n Ã„â€˜i cÃ¡Â»Â§a bÃ¡ÂºÂ¡n.</p>
      </div>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <Link
          to="/trips"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-luxury-gold/20 bg-surface-container-low px-6 py-3 text-sm font-semibold text-on-surface transition hover:border-midnight-burgundy/25 hover:bg-white"
        >
          <Ticket className="h-4 w-4" />
          Xem chuyÃ¡ÂºÂ¿n Ã„â€˜i cÃ¡Â»Â§a tÃƒÂ´i
        </Link>
        {hasTickets ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-luxury-gold/20 bg-surface-container-low px-6 py-3 text-sm font-semibold text-on-surface-variant opacity-70"
            title="ChÃ¡Â»Â©c nÃ„Æ’ng tÃ¡ÂºÂ£i file sÃ¡ÂºÂ½ Ã„â€˜Ã†Â°Ã¡Â»Â£c bÃ¡ÂºÂ­t khi backend hÃ¡Â»â€” trÃ¡Â»Â£ endpoint download"
          >
            <FileText className="h-4 w-4" />
            TÃ¡ÂºÂ£i vÃƒÂ© Ã„â€˜iÃ¡Â»â€¡n tÃ¡Â»Â­
          </button>
        ) : null}
        <Button
          type="button"
          className="lg:w-auto"
          onClick={() => navigate('/', { replace: true })}
          icon={<Home className="h-4 w-4" strokeWidth={2} />}
        >
          VÃ¡Â»Â trang chÃ¡Â»Â§
        </Button>
      </div>
    </section>
  );
}

function PendingResultActions({
  paymentUrl,
  onRefresh,
  refreshing,
}: {
  paymentUrl: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[1.75rem] border border-luxury-gold/12 bg-white/92 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            HÃ†Â°Ã¡Â»â€ºng tiÃ¡ÂºÂ¿p theo
          </p>
          <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">
            HoÃƒÂ n tÃ¡ÂºÂ¥t thanh toÃƒÂ¡n Ã„â€˜Ã¡Â»Æ’ xÃƒÂ¡c nhÃ¡ÂºÂ­n vÃƒÂ©
          </h2>
        </div>
        <p className="text-sm text-on-surface-variant">
          MÃ¡Â»Å¸ lÃ¡ÂºÂ¡i link thanh toÃƒÂ¡n hoÃ¡ÂºÂ·c kiÃ¡Â»Æ’m tra thÃ¡Â»Â§ cÃƒÂ´ng Ã„â€˜Ã¡Â»Æ’ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t ngay khi giao dÃ¡Â»â€¹ch hoÃƒÂ n tÃ¡ÂºÂ¥t.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        {paymentUrl ? (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-luxury-gold/20 bg-surface-container-low px-6 py-3 text-sm font-semibold text-on-surface transition hover:border-midnight-burgundy/25 hover:bg-white"
          >
            Thanh toÃƒÂ¡n ngay
          </a>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="lg:w-auto"
          onClick={onRefresh}
          disabled={refreshing}
          icon={<RefreshCcw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} />}
        >
          KiÃ¡Â»Æ’m tra thanh toÃƒÂ¡n
        </Button>
        <Button
          type="button"
          className="lg:w-auto"
          onClick={() => navigate('/', { replace: true })}
          icon={<Home className="h-4 w-4" strokeWidth={2} />}
        >
          VÃ¡Â»Â trang chÃ¡Â»Â§
        </Button>
      </div>
    </section>
  );
}

function SuccessView({ summary }: { summary: PaymentResultSummaryResponse }) {
  const segmentsByKey = new Map(summary.segments.map((segment) => [segment.segmentKey, segment]));

  return (
    <div className="space-y-6">
      <SuccessHero summary={summary} />
      <FlightInfo segments={summary.segments} />
      <PassengerInfo summary={summary} />
      <FareBreakdown summary={summary} segmentsByKey={segmentsByKey} />
      <ResultActions hasTickets={summary.tickets.length > 0} />
    </div>
  );
}

function FailureView({
  statusData,
  statusError,
}: {
  statusData: PaymentResultStatusResponse | undefined;
  statusError: unknown;
}) {
  const navigate = useNavigate();
  const message =
    statusData?.failure?.message ||
    (statusError ? statusErrorMessage(statusError) : 'Giao dÃ¡Â»â€¹ch chÃ†Â°a thÃ¡Â»Æ’ hoÃƒÂ n tÃ¡ÂºÂ¥t.');

  return (
    <StateCard
      tone="danger"
      icon={<XCircle className="h-12 w-12 text-cabin-burgundy" strokeWidth={2.5} />}
      title="Thanh toÃƒÂ¡n khÃƒÂ´ng thÃƒÂ nh cÃƒÂ´ng"
      message={message}
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            className="sm:w-auto"
            onClick={() => navigate(-1)}
            icon={<RefreshCcw className="h-4 w-4" strokeWidth={2} />}
          >
            Quay lÃ¡ÂºÂ¡i
          </Button>
          <Button
            type="button"
            className="sm:w-auto"
            onClick={() => navigate('/', { replace: true })}
            icon={<Home className="h-4 w-4" strokeWidth={2} />}
          >
            VÃ¡Â»Â trang chÃ¡Â»Â§
          </Button>
        </>
      }
    />
  );
}

function PendingPaymentView({
  statusData,
  onRefresh,
  refreshing,
}: {
  statusData: PaymentResultStatusResponse;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const expireAtMs = useMemo(
    () => (statusData.expireAt ? Date.parse(statusData.expireAt) : Number.NaN),
    [statusData.expireAt]
  );
  const [msLeft, setMsLeft] = useState(() =>
    Number.isFinite(expireAtMs) ? expireAtMs - Date.now() : 0
  );

  useEffect(() => {
    setMsLeft(Number.isFinite(expireAtMs) ? expireAtMs - Date.now() : 0);
  }, [expireAtMs]);

  useEffect(() => {
    if (!Number.isFinite(expireAtMs)) return;
    const intervalId = window.setInterval(() => {
      setMsLeft(expireAtMs - Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [expireAtMs]);

  const qrImageUrl =
    statusData.qrImageUrl ??
    (statusData.qrData ? getQrImageUrlFromData(statusData.qrData) : null);
  const expiredLocally = Number.isFinite(expireAtMs) && msLeft <= 0;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-luxury-gold/15 bg-white/92 shadow-[0_24px_60px_rgba(62,16,30,0.10)] backdrop-blur-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_24rem]">
        <div className="px-7 py-8 sm:px-10 sm:py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-amber-700">
            <Clock3 className="h-4 w-4" strokeWidth={2.2} />
            ChÃƒÂ¡Ã‚Â»Ã‚Â thanh toÃƒÆ’Ã‚Â¡n
          </div>
          <p className="mt-6 font-headline text-sm font-black uppercase tracking-[0.22em] text-midnight-burgundy">
            The Sovereign
          </p>
          <h1 className="mt-3 max-w-3xl font-headline text-3xl font-black tracking-tight text-on-surface sm:text-4xl">
            MÃƒÆ’Ã‚Â£ QR thanh toÃƒÆ’Ã‚Â¡n Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ sÃƒÂ¡Ã‚ÂºÃ‚Âµn sÃƒÆ’Ã‚Â ng
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
            Booking Ãƒâ€žÃ¢â‚¬Ëœang Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£c giÃƒÂ¡Ã‚Â»Ã‚Â¯ chÃƒÂ¡Ã‚Â»Ã¢â‚¬â€ trong 1 giÃƒÂ¡Ã‚Â»Ã‚Â. HoÃƒÆ’Ã‚Â n tÃƒÂ¡Ã‚ÂºÃ‚Â¥t chuyÃƒÂ¡Ã‚Â»Ã†â€™n khoÃƒÂ¡Ã‚ÂºÃ‚Â£n trong thÃƒÂ¡Ã‚Â»Ã‚Âi gian
            cÃƒÆ’Ã‚Â²n lÃƒÂ¡Ã‚ÂºÃ‚Â¡i Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã†â€™ hÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ thÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœng xÃƒÆ’Ã‚Â¡c nhÃƒÂ¡Ã‚ÂºÃ‚Â­n vÃƒÆ’Ã‚Â  phÃƒÂ¡Ã‚ÂºÃ‚Â£n hÃƒÂ¡Ã‚Â»Ã¢â‚¬Å“i sang trang thÃƒÆ’Ã‚Â nh cÃƒÆ’Ã‚Â´ng.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                MÃƒÆ’Ã‚Â£ Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚ÂºÃ‚Â·t chÃƒÂ¡Ã‚Â»Ã¢â‚¬â€
              </p>
              <p className="mt-2 font-mono text-xl font-black tracking-[0.18em] text-midnight-burgundy">
                {statusData.pnrCode || '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                PhÃƒâ€ Ã‚Â°Ãƒâ€ Ã‚Â¡ng thÃƒÂ¡Ã‚Â»Ã‚Â©c
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">
                {paymentMethodLabel(statusData.method)}
              </p>
            </div>
            <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                HÃƒÂ¡Ã‚ÂºÃ‚Â¿t hÃƒÂ¡Ã‚ÂºÃ‚Â¡n lÃƒÆ’Ã‚Âºc
              </p>
              <p className="mt-2 text-sm font-bold text-on-surface">
                {formatDateTime(statusData.expireAt)}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="sm:w-auto"
              onClick={onRefresh}
              disabled={refreshing}
              icon={<RefreshCcw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} />}
            >
              KiÃƒÂ¡Ã‚Â»Ã†â€™m tra thanh toÃƒÆ’Ã‚Â¡n
            </Button>
            {statusData.paymentUrl ? (
              <a
                href={statusData.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-outline-variant/30 px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                MÃƒÂ¡Ã‚Â»Ã…Â¸ trang thanh toÃƒÆ’Ã‚Â¡n
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative overflow-hidden border-t border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.96),rgba(62,16,30,0.96))] px-7 py-8 text-white lg:border-l lg:border-t-0 lg:px-8 lg:py-10">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-luxury-gold/80">
            TÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ng thanh toÃƒÆ’Ã‚Â¡n
          </p>
          <p className="mt-3 font-headline text-4xl font-black tracking-tight text-luxury-gold">
            {formatCurrency(statusData.amount, statusData.currency ?? 'VND')}
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="QR thanh toÃƒÆ’Ã‚Â¡n"
                className="mx-auto aspect-square w-full max-w-[220px] rounded-2xl bg-white p-3 shadow-lg"
              />
            ) : (
              <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-2xl bg-white/10 text-sm text-white/70">
                ChÃƒâ€ Ã‚Â°a cÃƒÆ’Ã‚Â³ mÃƒÆ’Ã‚Â£ QR
              </div>
            )}
          </div>
          <div className="mt-6 space-y-4 border-t border-luxury-gold/15 pt-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/70">TrÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÆ’Ã‚Â¡i</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-luxury-gold">
                <Clock3 className="h-4 w-4" />
                {expiredLocally ? 'Ãƒâ€žÃ‚Âang hÃƒÂ¡Ã‚ÂºÃ‚Â¿t hÃƒÂ¡Ã‚ÂºÃ‚Â¡n' : 'Ãƒâ€žÃ‚Âang chÃƒÂ¡Ã‚Â»Ã‚Â'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/70">Payment ID</span>
              <span className="font-semibold text-white">#{statusData.paymentId}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/70">MÃƒÆ’Ã‚Â£ giao dÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¹ch</span>
              <span className="max-w-[11rem] text-right font-semibold text-white">
                {statusData.transactionId || '--'}
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-4 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                ThÃƒÂ¡Ã‚Â»Ã‚Âi gian cÃƒÆ’Ã‚Â²n lÃƒÂ¡Ã‚ÂºÃ‚Â¡i
              </p>
              <p className="mt-2 font-mono text-3xl font-black tracking-[0.14em] text-luxury-gold">
                {formatTimeLeft(msLeft)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PayLaterResultView({
  statusData,
  summary,
  onRefresh,
  refreshing,
}: {
  statusData: PaymentResultStatusResponse;
  summary: PaymentResultSummaryResponse;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const expireAtMs = useMemo(
    () => (statusData.expireAt ? Date.parse(statusData.expireAt) : Number.NaN),
    [statusData.expireAt]
  );
  const [msLeft, setMsLeft] = useState(() =>
    Number.isFinite(expireAtMs) ? expireAtMs - Date.now() : 0
  );

  useEffect(() => {
    setMsLeft(Number.isFinite(expireAtMs) ? expireAtMs - Date.now() : 0);
  }, [expireAtMs]);

  useEffect(() => {
    if (!Number.isFinite(expireAtMs)) return;
    const intervalId = window.setInterval(() => {
      setMsLeft(expireAtMs - Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [expireAtMs]);

  const qrImageUrl =
    statusData.qrImageUrl ??
    (statusData.qrData ? getQrImageUrlFromData(statusData.qrData) : null);
  const expiredLocally = Number.isFinite(expireAtMs) && msLeft <= 0;
  const segmentsByKey = new Map(summary.segments.map((segment) => [segment.segmentKey, segment]));

  return (
    <div className="space-y-6">
      {expiredLocally ? (
        <div className="rounded-[1.5rem] border border-cabin-burgundy/25 bg-cabin-burgundy/6 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-cabin-burgundy" />
            <div>
              <p className="text-sm font-black text-on-surface">
                PhiÃƒÂªn chÃ¡Â»Â thanh toÃƒÂ¡n Ã„â€˜ÃƒÂ£ hÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n
              </p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Booking khÃƒÂ´ng cÃƒÂ²n Ã„â€˜Ã†Â°Ã¡Â»Â£c giÃ¡Â»Â¯. Vui lÃƒÂ²ng quay lÃ¡ÂºÂ¡i tÃƒÂ¬m chuyÃ¡ÂºÂ¿n vÃƒÂ  Ã„â€˜Ã¡ÂºÂ·t lÃ¡ÂºÂ¡i tÃ¡Â»Â« Ã„â€˜Ã¡ÂºÂ§u nÃ¡ÂºÂ¿u bÃ¡ÂºÂ¡n
                vÃ¡ÂºÂ«n muÃ¡Â»â€˜n tiÃ¡ÂºÂ¿p tÃ¡Â»Â¥c.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-luxury-gold/15 bg-white/92 shadow-[0_24px_60px_rgba(62,16,30,0.10)] backdrop-blur-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_24rem]">
          <div className="relative px-7 py-8 sm:px-10 sm:py-10">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-luxury-gold/50 to-transparent" />
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-amber-700">
              <Clock3 className="h-4 w-4" strokeWidth={2.2} />
              GiÃ¡Â»Â¯ chÃ¡Â»â€” trong 1 giÃ¡Â»Â
            </div>
            <p className="mt-6 font-headline text-sm font-black uppercase tracking-[0.22em] text-midnight-burgundy">
              The Sovereign
            </p>
            <h1 className="mt-3 max-w-3xl font-headline text-3xl font-black tracking-tight text-on-surface sm:text-4xl lg:text-[2.8rem]">
              Ã„ÂÃ¡ÂºÂ·t chÃ¡Â»â€” Ã„â€˜ang chÃ¡Â»Â thanh toÃƒÂ¡n
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
              HÃ¡Â»â€¡ thÃ¡Â»â€˜ng Ã„â€˜ÃƒÂ£ tÃ¡ÂºÂ¡o mÃƒÂ£ thanh toÃƒÂ¡n vÃƒÂ  Ã„â€˜ang giÃ¡Â»Â¯ booking cÃ¡Â»Â§a bÃ¡ÂºÂ¡n. HoÃƒÂ n tÃ¡ÂºÂ¥t thanh toÃƒÂ¡n trÃ†Â°Ã¡Â»â€ºc
              thÃ¡Â»Âi Ã„â€˜iÃ¡Â»Æ’m hÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n Ã„â€˜Ã¡Â»Æ’ vÃƒÂ© Ã„â€˜Ã†Â°Ã¡Â»Â£c xÃƒÂ¡c nhÃ¡ÂºÂ­n tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng ngay trÃƒÂªn trang nÃƒÂ y.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  MÃƒÂ£ Ã„â€˜Ã¡ÂºÂ·t chÃ¡Â»â€”
                </p>
                <p className="mt-2 font-mono text-xl font-black tracking-[0.18em] text-midnight-burgundy">
                  {statusData.pnrCode || '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  HÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n lÃƒÂºc
                </p>
                <p className="mt-2 text-sm font-bold text-on-surface">
                  {formatDateTime(statusData.expireAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-luxury-gold/12 bg-surface-container-lowest/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  TrÃ¡ÂºÂ¡ng thÃƒÂ¡i
                </p>
                <p className="mt-2 text-sm font-bold text-on-surface">
                  {expiredLocally ? 'Ã„ÂÃƒÂ£ hÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n chÃ¡Â»Â thanh toÃƒÂ¡n' : 'Ã„Âang giÃ¡Â»Â¯ chÃ¡Â»â€” chÃ¡Â»Â thanh toÃƒÂ¡n'}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-amber-200/70 bg-amber-50/80 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-800/80">
                    ThÃ¡Â»Âi gian cÃƒÂ²n lÃ¡ÂºÂ¡i
                  </p>
                  <p className="mt-2 font-mono text-3xl font-black tracking-[0.14em] text-cabin-burgundy">
                    {formatTimeLeft(msLeft)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Khi thanh toÃƒÂ¡n thÃƒÂ nh cÃƒÂ´ng, trang nÃƒÂ y sÃ¡ÂºÂ½ tÃ¡Â»Â± chuyÃ¡Â»Æ’n sang trÃ¡ÂºÂ¡ng thÃƒÂ¡i hoÃƒÂ n tÃ¡ÂºÂ¥t.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    className="sm:w-auto"
                    onClick={onRefresh}
                    disabled={refreshing}
                    icon={<RefreshCcw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} />}
                  >
                    KiÃ¡Â»Æ’m tra thanh toÃƒÂ¡n
                  </Button>
                  {statusData.paymentUrl ? (
                    <a
                      href={statusData.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-luxury-gold/20 bg-white px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-midnight-burgundy/25 hover:bg-surface-container-low"
                    >
                      Thanh toÃƒÂ¡n ngay
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden border-t border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.96),rgba(62,16,30,0.96))] px-7 py-8 text-white lg:border-l lg:border-t-0 lg:px-8 lg:py-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-luxury-gold/10 blur-3xl" />
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-luxury-gold/80">
              TÃ¡Â»â€¢ng thanh toÃƒÂ¡n
            </p>
            <p className="mt-3 font-headline text-4xl font-black tracking-tight text-luxury-gold">
              {formatCurrency(statusData.amount, statusData.currency ?? 'VND')}
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                MÃƒÂ£ QR thanh toÃƒÂ¡n
              </p>
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="QR thanh toÃƒÂ¡n"
                  className="mx-auto mt-4 aspect-square w-full max-w-[220px] rounded-2xl bg-white p-3 shadow-lg"
                />
              ) : (
                <div className="mx-auto mt-4 flex aspect-square w-full max-w-[220px] items-center justify-center rounded-2xl bg-white/10 text-sm text-white/70">
                  ChÃ†Â°a cÃƒÂ³ mÃƒÂ£ QR
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4 border-t border-luxury-gold/15 pt-6">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white/70">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-luxury-gold">
                  <Clock3 className="h-4 w-4" />
                  {expiredLocally ? 'HÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n' : 'ChÃ¡Â»Â thanh toÃƒÂ¡n'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-white/70">PhÃ†Â°Ã†Â¡ng thÃ¡Â»Â©c</span>
                <span className="max-w-[11rem] text-right font-semibold text-white">
                  {paymentMethodLabel(statusData.method)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white/70">Payment ID</span>
                <span className="font-semibold text-white">#{statusData.paymentId}</span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-white/70">MÃƒÂ£ giao dÃ¡Â»â€¹ch</span>
                <span className="max-w-[11rem] text-right font-semibold text-white">
                  {statusData.transactionId || '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FlightInfo segments={summary.segments} />
      <PassengerInfo summary={summary} />
      <FareBreakdown summary={summary} segmentsByKey={segmentsByKey} />


      <PendingResultActions
        paymentUrl={statusData.paymentUrl}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </div>
  );
}

export default function CheckoutResult() {
  const [searchParams] = useSearchParams();
  const expiredToastShownRef = useRef(false);

  const rawPaymentId = searchParams.get('paymentId');
  const paymentIdFromQuery =
    rawPaymentId && /^\d+$/.test(rawPaymentId.trim()) ? Number(rawPaymentId.trim()) : null;
  const paymentId = paymentIdFromQuery ?? resolveMockPaymentId(searchParams);

  const statusQuery = useQuery({
    queryKey: ['payment-result-status', paymentId],
    queryFn: () => getPaymentResultStatus(paymentId as number),
    enabled: paymentId != null,
    refetchInterval: (query) => {
      const data = query.state.data as PaymentResultStatusResponse | undefined;
      if (data?.resultPage === 'PENDING') {
        return Math.max((data.polling.nextPollAfterSeconds ?? 3) * 1000, 1000);
      }
      return false;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['payment-result-summary', paymentId],
    queryFn: () => getPaymentResultSummary(paymentId as number),
    enabled:
      paymentId != null &&
      (statusQuery.data?.resultPage === 'SUCCESS' ||
        (statusQuery.data?.resultPage === 'PENDING' &&
          !isPendingPaymentExpired(statusQuery.data?.expireAt))),
    retry: false,
    refetchInterval: (query) => (isSummaryConflict(query.state.error) ? 3000 : false),
  });

  useEffect(() => {
    const pendingStatus = statusQuery.data?.resultPage === 'PENDING';
    const expired = pendingStatus && isPendingPaymentExpired(statusQuery.data?.expireAt);
    if (!expired) {
      expiredToastShownRef.current = false;
      return;
    }
    if (expiredToastShownRef.current) return;
    expiredToastShownRef.current = true;
    toast.error('Phiên thanh toán đã hết hạn. Booking không còn được giữ.');
  }, [statusQuery.data?.expireAt, statusQuery.data?.resultPage]);

  const expiredPendingStatus =
    statusQuery.data?.resultPage === 'PENDING' &&
    isPendingPaymentExpired(statusQuery.data?.expireAt);
  const expiredFailure =
    statusQuery.data?.failure?.message === 'Booking payment window has expired';

  if (paymentId == null) {
    return (
      <ResultShell>
        <StateCard
          icon={<XCircle className="h-12 w-12 text-cabin-burgundy" strokeWidth={2.5} />}
          title="KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y phiÃƒÂªn thanh toÃƒÂ¡n"
          message="LiÃƒÂªn kÃ¡ÂºÂ¿t thanh toÃƒÂ¡n khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡ hoÃ¡ÂºÂ·c thiÃ¡ÂºÂ¿u paymentId. Vui lÃƒÂ²ng quay lÃ¡ÂºÂ¡i tÃ¡Â»Â« luÃ¡Â»â€œng thanh toÃƒÂ¡n."
          tone="danger"
          actions={
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
            >
              <Home className="h-4 w-4" />
              VÃ¡Â»Â trang chÃ¡Â»Â§
            </Link>
          }
        />
      </ResultShell>
    );
  }

  if (statusQuery.isLoading && !statusQuery.data) {
    return (
      <ResultShell>
        <PendingResultSkeleton />
      </ResultShell>
    );
  }

  if (false && statusQuery.isLoading && !statusQuery.data) {
    return (
      <ResultShell>
        <StateCard
          icon={<Loader2 className="h-12 w-12 animate-spin text-luxury-gold" strokeWidth={2.2} />}
          title="Ã„Âang xÃƒÂ¡c nhÃ¡ÂºÂ­n thanh toÃƒÂ¡n"
          message="HÃ¡Â»â€¡ thÃ¡Â»â€˜ng Ã„â€˜ang kiÃ¡Â»Æ’m tra trÃ¡ÂºÂ¡ng thÃƒÂ¡i giao dÃ¡Â»â€¹ch vÃƒÂ  chuÃ¡ÂºÂ©n bÃ¡Â»â€¹ hiÃ¡Â»Æ’n thÃ¡Â»â€¹ mÃƒÂ£ thanh toÃƒÂ¡n."
          actions={
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface-variant">
              <Clock3 className="h-4 w-4" />
              Ã„Âang Ã„â€˜Ã¡Â»â€œng bÃ¡Â»â„¢ vÃ¡Â»â€ºi backend
            </div>
          }
        />
      </ResultShell>
    );
  }

  const showPending = statusQuery.data?.resultPage === 'PENDING';

  if (expiredPendingStatus) {
    return (
      <ResultShell>
        <StateCard
          icon={<XCircle className="h-12 w-12 text-cabin-burgundy" strokeWidth={2.5} />}
          title="Phiên thanh toán đã hết hạn"
          message="Liên kết này thuộc một phiên thanh toán trả sau đã quá hạn. Booking không còn được giữ, vui lòng quay lại tìm chuyến và đặt lại nếu bạn muốn tiếp tục."
          tone="danger"
          actions={
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
            >
              <Home className="h-4 w-4" />
              Về trang chủ
            </Link>
          }
        />
      </ResultShell>
    );
  }

  if (showPending && statusQuery.data && summaryQuery.data) {
    return (
      <ResultShell>
        <PayLaterResultView
          statusData={statusQuery.data}
          summary={summaryQuery.data}
          onRefresh={() => void statusQuery.refetch()}
          refreshing={statusQuery.isFetching || summaryQuery.isFetching}
        />
      </ResultShell>
    );
  }

  if (showPending) {
    return (
      <ResultShell>
        <StateCard
          icon={<Loader2 className="h-12 w-12 animate-spin text-luxury-gold" strokeWidth={2.2} />}
          title="Đang tải chi tiết booking chờ thanh toán"
          message="Hệ thống đang dựng thông tin chuyến bay, hành khách và giá vé cho phiên thanh toán này."
          actions={
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface-variant">
              <Clock3 className="h-4 w-4" />
              {summaryQuery.isFetching ? 'Đang lấy summary từ backend' : 'Chờ dữ liệu chi tiết'}
            </div>
          }
        />
      </ResultShell>
    );
  }

  if (expiredFailure) {
    return (
      <ResultShell>
        <StateCard
          icon={<XCircle className="h-12 w-12 text-cabin-burgundy" strokeWidth={2.5} />}
          title="Phiên thanh toán đã hết hạn"
          message="Liên kết này thuộc một phiên thanh toán trả sau đã quá hạn. Booking không còn được giữ, vui lòng quay lại tìm chuyến và đặt lại nếu bạn muốn tiếp tục."
          tone="danger"
          actions={
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
            >
              <Home className="h-4 w-4" />
              Về trang chủ
            </Link>
          }
        />
      </ResultShell>
    );
  }

  if (statusQuery.isError || statusQuery.data?.resultPage === 'ERROR') {
    return (
      <ResultShell>
        <FailureView statusData={statusQuery.data} statusError={statusQuery.error} />
      </ResultShell>
    );
  }

  if (summaryQuery.isError && !isSummaryConflict(summaryQuery.error)) {
    return (
      <ResultShell>
        <StateCard
          icon={<XCircle className="h-12 w-12 text-cabin-burgundy" strokeWidth={2.5} />}
          title="KhÃƒÂ´ng thÃ¡Â»Æ’ tÃ¡ÂºÂ£i thÃƒÂ´ng tin thanh toÃƒÂ¡n"
          message={summaryErrorMessage(summaryQuery.error)}
          tone="danger"
          actions={
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
            >
              <Home className="h-4 w-4" />
              VÃ¡Â»Â trang chÃ¡Â»Â§
            </Link>
          }
        />
      </ResultShell>
    );
  }

  if (!summaryQuery.data) {
    return (
      <ResultShell>
        <StateCard
          icon={<Loader2 className="h-12 w-12 animate-spin text-luxury-gold" strokeWidth={2.2} />}
          title="Ã„Âang tÃ¡ÂºÂ£i thÃƒÂ´ng tin chuyÃ¡ÂºÂ¿n Ã„â€˜i"
          message="Thanh toÃƒÂ¡n Ã„â€˜ÃƒÂ£ thÃƒÂ nh cÃƒÂ´ng. HÃ¡Â»â€¡ thÃ¡Â»â€˜ng Ã„â€˜ang dÃ¡Â»Â±ng lÃ¡ÂºÂ¡i thÃƒÂ´ng tin vÃƒÂ© vÃƒÂ  hÃƒÂ nh khÃƒÂ¡ch tÃ¡Â»Â« backend."
        />
      </ResultShell>
    );
  }

  return (
    <ResultShell>
      <SuccessView summary={summaryQuery.data} />
    </ResultShell>
  );
}
