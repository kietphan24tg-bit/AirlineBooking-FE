import React from 'react';
import { Ticket, UserCheck, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { BookingStatusData, AssistantLanguage } from '../../types/assistant';
import { toast } from 'sonner';

interface AssistantBookingCardProps {
  data: BookingStatusData;
  language: AssistantLanguage;
}

export const AssistantBookingCard: React.FC<AssistantBookingCardProps> = ({ data, language }) => {
  const handleView = () => {
    toast.info(
      language === 'en'
        ? `Opening booking management for ${data.bookingCode}`
        : `Mở quản lý đặt vé cho ${data.bookingCode}`
    );
  };

  return (
    <div className="mt-2.5 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      {/* Top Header: PNR & Status */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-900 text-white">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 block">
              BOOKING REFERENCE
            </span>
            <span className="font-mono text-base font-black text-slate-900">
              {data.bookingCode}
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[0.68rem] font-bold text-sky-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {data.status}
        </span>
      </div>

      {/* Details Grid */}
      <div className="my-3 grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-slate-500">
            <UserCheck className="h-3 w-3 text-sky-600" />
            {language === 'en' ? 'Passenger (Masked)' : 'Hành khách'}
          </span>
          <span className="font-mono text-xs font-bold text-slate-900 block mt-0.5">
            {data.passengerMasked}
          </span>
        </div>

        <div className="rounded-lg bg-slate-50 p-2">
          <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-slate-500">
            <MapPin className="h-3 w-3 text-sky-600" />
            {language === 'en' ? 'Flight Route' : 'Hành trình'}
          </span>
          <span className="font-sans text-xs font-bold text-slate-900 block mt-0.5">
            {data.origin} → {data.destination}
          </span>
        </div>

        <div className="rounded-lg bg-slate-50 p-2">
          <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-slate-500">
            <Calendar className="h-3 w-3 text-sky-600" />
            {language === 'en' ? 'Departure Time' : 'Khởi hành'}
          </span>
          <span className="font-sans text-xs font-bold text-slate-900 block mt-0.5">
            {data.departureDate}
          </span>
        </div>

        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-[0.65rem] font-semibold text-slate-500 block">
            {language === 'en' ? 'Assigned Seat & Fare' : 'Chỗ ngồi & Hạng vé'}
          </span>
          <span className="font-sans text-xs font-bold text-sky-800 block mt-0.5 truncate">
            {data.seat} · {data.fareClass}
          </span>
        </div>
      </div>

      {/* Action button */}
      <div className="mt-3 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={handleView}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-800 transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-98"
        >
          <span>{language === 'en' ? 'View booking itinerary' : 'Xem chi tiết đặt vé'}</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
