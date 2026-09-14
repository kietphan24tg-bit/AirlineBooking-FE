import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { ConfirmationData, AssistantLanguage } from '../../types/assistant';
import { toast } from 'sonner';

interface AssistantConfirmationCardProps {
  data: ConfirmationData;
  language: AssistantLanguage;
  onUpdateStatus?: (status: 'COMPLETED' | 'CANCELLED') => void;
}

export const AssistantConfirmationCard: React.FC<AssistantConfirmationCardProps> = ({
  data,
  language,
  onUpdateStatus,
}) => {
  const [status, setStatus] = useState<'PENDING' | 'COMPLETED' | 'CANCELLED'>(data.status);
  const [secondsLeft, setSecondsLeft] = useState(data.expiresInSeconds || 299);

  useEffect(() => {
    if (status !== 'PENDING') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'PENDING' && secondsLeft === 0) {
      setStatus('CANCELLED');
    }
  }, [secondsLeft, status]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    setStatus('COMPLETED');
    if (onUpdateStatus) onUpdateStatus('COMPLETED');
    toast.success(
      language === 'en'
        ? `Seat change confirmed for ${data.bookingCode}! Updated seat: ${data.newValue}.`
        : `Xác nhận đổi ghế thành công cho mã đặt vé ${data.bookingCode}! Ghế mới: ${data.newValue}.`
    );
  };

  const handleCancel = () => {
    setStatus('CANCELLED');
    if (onUpdateStatus) onUpdateStatus('CANCELLED');
    toast.info(
      language === 'en' ? `Seat change proposal cancelled.` : `Đã hủy yêu cầu thay đổi ghế.`
    );
  };

  return (
    <div
      className={`mt-3 overflow-hidden rounded-xl border p-4 shadow-sm transition-all ${
        status === 'PENDING'
          ? 'border-amber-400/90 bg-amber-50/40 ring-1 ring-amber-400/20'
          : status === 'COMPLETED'
            ? 'border-emerald-300 bg-emerald-50/50'
            : 'border-slate-300 bg-slate-100/60 opacity-85'
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-3 border-b border-amber-200/60 pb-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              status === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : status === 'COMPLETED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-500 text-white'
            }`}
          >
            {status === 'PENDING' ? (
              <ShieldAlert className="h-4.5 w-4.5" />
            ) : status === 'COMPLETED' ? (
              <CheckCircle2 className="h-4.5 w-4.5" />
            ) : (
              <XCircle className="h-4.5 w-4.5" />
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-800">
              {language === 'en' ? 'CONFIRMATION REQUIRED' : 'YÊU CẦU XÁC NHẬN'}
            </span>
            <h3 className="font-sans text-xs font-bold text-slate-900 leading-snug">
              {data.description}
            </h3>
          </div>
        </div>

        {status === 'PENDING' && (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[0.68rem] font-mono font-bold text-amber-900">
            <Clock className="h-3 w-3 animate-spin text-amber-700" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="my-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <span className="text-[0.65rem] font-semibold uppercase text-slate-500 block">
            {language === 'en' ? 'Current Seat' : 'Ghế hiện tại'}
          </span>
          <span className="font-mono text-sm font-bold text-slate-700 block mt-0.5 line-through decoration-rose-500/70">
            {data.currentValue}
          </span>
        </div>

        <div className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-2.5">
          <span className="text-[0.65rem] font-bold uppercase text-emerald-800 flex items-center gap-1">
            {language === 'en' ? 'Requested Seat' : 'Ghế đề xuất'}
            <ArrowRight className="h-3 w-3 inline text-emerald-700" />
          </span>
          <span className="font-mono text-sm font-black text-emerald-900 block mt-0.5">
            {data.newValue}
          </span>
        </div>
      </div>

      {/* Notice */}
      <p className="text-[0.72rem] font-medium text-slate-600">
        {language === 'en'
          ? '🔒 Note: No changes are executed on your ticket until you explicitly click "Confirm change".'
          : '🔒 Lưu ý: Thay đổi chỉ có hiệu lực sau khi bạn nhấn "Xác nhận đổi ghế".'}
      </p>

      {/* Actions / Status Result */}
      {status === 'PENDING' ? (
        <div className="mt-3.5 flex items-center justify-end gap-2.5 border-t border-amber-200/60 pt-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
          >
            {language === 'en' ? 'Cancel' : 'Hủy bỏ'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-sky-500 active:scale-95"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{language === 'en' ? 'Confirm change' : 'Xác nhận đổi ghế'}</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-200 pt-2.5 text-center text-xs font-bold">
          {status === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {language === 'en'
                ? 'Status: Proposal Completed & Executed'
                : 'Trạng thái: Đã hoàn tất xác nhận'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <XCircle className="h-4 w-4" />
              {language === 'en'
                ? 'Status: Proposal Cancelled / Expired'
                : 'Trạng thái: Đã hủy hoặc hết hạn'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
