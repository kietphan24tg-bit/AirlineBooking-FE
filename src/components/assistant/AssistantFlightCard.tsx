import React from 'react';
import { Plane, ArrowRight, Clock, Users, ArrowUpRight } from 'lucide-react';
import { FlightResultData, AssistantLanguage } from '../../types/assistant';
import { toast } from 'sonner';

interface AssistantFlightCardProps {
  data: FlightResultData;
  language: AssistantLanguage;
}

export const AssistantFlightCard: React.FC<AssistantFlightCardProps> = ({ data, language }) => {
  const handleSelect = () => {
    toast.success(
      language === 'en'
        ? `Flight ${data.flightNumber} details opened.`
        : `Đã xem chi tiết chuyến bay ${data.flightNumber}.`
    );
  };

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-sky-200/90 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md">
      {/* Top Bar: Airline & Badge */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">{data.airline}</span>
            <span className="ml-2 font-mono text-[0.7rem] font-bold text-sky-700">
              {data.flightNumber}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.68rem] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
          <Users className="h-3 w-3" />
          {data.badge}
        </span>
      </div>

      {/* Flight Route & Schedule */}
      <div className="my-3.5 flex items-center justify-between">
        {/* Origin */}
        <div className="flex flex-col">
          <span className="font-mono text-xl font-black text-slate-900">{data.originCode}</span>
          <span className="text-xs font-semibold text-slate-700">{data.departureTime}</span>
          <span className="text-[0.68rem] text-slate-500 truncate max-w-[120px]" title={data.originCity}>
            {data.originCity}
          </span>
        </div>

        {/* Flight Line & Duration */}
        <div className="flex flex-col items-center px-2 flex-1">
          <div className="flex items-center gap-1 text-[0.68rem] font-medium text-slate-500">
            <Clock className="h-3 w-3 text-sky-600" />
            <span>{data.duration}</span>
          </div>
          <div className="relative my-1 flex w-full max-w-[140px] items-center">
            <div className="h-0.5 w-full bg-slate-200" />
            <Plane className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 transform text-sky-600" />
          </div>
          <span className="text-[0.65rem] text-slate-400">{data.aircraft}</span>
        </div>

        {/* Destination */}
        <div className="flex flex-col text-right">
          <span className="font-mono text-xl font-black text-slate-900">{data.destinationCode}</span>
          <span className="text-xs font-semibold text-slate-700">{data.arrivalTime}</span>
          <span className="text-[0.68rem] text-slate-500 truncate max-w-[120px]" title={data.destinationCity}>
            {data.destinationCity}
          </span>
        </div>
      </div>

      {/* Price & Action Button */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <span className="text-[0.68rem] font-medium text-slate-500 block">
            {language === 'en' ? 'One-way starting from' : 'Giá vé một chiều từ'}
          </span>
          <span className="font-sans text-lg font-black text-slate-900">
            {language === 'en' ? data.price : data.priceVnd}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSelect}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sky-600 active:scale-95"
        >
          <span>{language === 'en' ? 'View details' : 'Xem chi tiết'}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
