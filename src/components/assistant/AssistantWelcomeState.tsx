import React from 'react';
import { Plane, Ticket, Luggage, CheckSquare, Sparkles, ArrowRight } from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';

interface AssistantWelcomeStateProps {
  language: AssistantLanguage;
  onSelectPrompt: (promptText: string) => void;
}

export const AssistantWelcomeState: React.FC<AssistantWelcomeStateProps> = ({
  language,
  onSelectPrompt,
}) => {
  const chips = [
    {
      en: 'Find a flight',
      vi: 'Tìm chuyến bay',
      icon: <Plane className="h-3.5 w-3.5 text-sky-500" />,
      queryEn: 'Find flights from SGN to HAN tomorrow',
      queryVi: 'Tìm chuyến bay từ SGN đi HAN ngày mai',
    },
    {
      en: 'Check my booking',
      vi: 'Kiểm tra đặt vé',
      icon: <Ticket className="h-3.5 w-3.5 text-cyan-500" />,
      queryEn: 'Check status of booking ABC123',
      queryVi: 'Kiểm tra mã đặt vé ABC123',
    },
    {
      en: 'Baggage policy',
      vi: 'Quy định hành lý',
      icon: <Luggage className="h-3.5 w-3.5 text-indigo-500" />,
      queryEn: 'What is the carry-on baggage allowance for Economy?',
      queryVi: 'Hành lý xách tay hạng Phổ thông được bao nhiêu kg?',
    },
    {
      en: 'How do I check in?',
      vi: 'Cách làm thủ tục check-in',
      icon: <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />,
      queryEn: 'How do I check in online for my flight?',
      queryVi: 'Hướng dẫn làm thủ tục check-in trực tuyến?',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Hero Welcome Box */}
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/70 via-white to-white p-6 shadow-xs text-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white shadow-md">
            <Sparkles className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-sans text-xl font-bold text-slate-900 sm:text-2xl">
              {language === 'en'
                ? 'Hello! I’m your AirlineBooking Assistant.'
                : 'Xin chào! Tôi là Trợ lý ảo AirlineBooking.'}
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Your 24/7 AI concierge for flight reservations & travel policies.'
                : 'Trợ lý AI 24/7 hỗ trợ đặt vé và tư vấn quy định chuyến bay.'}
            </p>
          </div>
        </div>

        {/* Capability Overview Grid */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            {language === 'en' ? 'I can help you with:' : 'Tôi có thể hỗ trợ bạn:'}
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Plane className="h-4 w-4" />
              </div>
              <span className="font-medium text-slate-800">
                {language === 'en' ? 'Search & compare flights' : 'Tìm kiếm & so sánh chuyến bay'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <Ticket className="h-4 w-4" />
              </div>
              <span className="font-medium text-slate-800">
                {language === 'en' ? 'Check booking status & seat map' : 'Tra cứu booking & sơ đồ ghế'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Luggage className="h-4 w-4" />
              </div>
              <span className="font-medium text-slate-800">
                {language === 'en' ? 'Explain baggage & refund rules' : 'Quy định hành lý & hoàn vé'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="font-medium text-slate-800">
                {language === 'en' ? 'Assist with online check-in' : 'Hướng dẫn check-in trực tuyến'}
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Prompt Chips */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            {language === 'en' ? 'Suggested Prompts:' : 'Gợi ý câu hỏi:'}
          </p>

          <div className="flex flex-wrap gap-2">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(language === 'en' ? chip.queryEn : chip.queryVi)}
                className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-sky-400 hover:bg-sky-50/60 hover:text-sky-900 active:scale-95"
              >
                {chip.icon}
                <span>{language === 'en' ? chip.en : chip.vi}</span>
                <ArrowRight className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-sky-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
