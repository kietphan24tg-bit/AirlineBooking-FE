import React from 'react';
import { Plane, Compass, Sparkles, MessageSquare } from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';

interface AssistantEmptyStateProps {
  language: AssistantLanguage;
  onSelectPrompt: (promptText: string) => void;
}

export const AssistantEmptyState: React.FC<AssistantEmptyStateProps> = ({
  language,
  onSelectPrompt,
}) => {
  const suggestions = [
    {
      en: 'What flights are available to Tokyo next month?',
      vi: 'Chuyến bay nào đến Tokyo tháng sau?',
    },
    {
      en: 'Can I change my flight date after booking?',
      vi: 'Tôi có thể đổi ngày bay sau khi đã thanh toán không?',
    },
    {
      en: 'What is the refund fee for Economy Flex tickets?',
      vi: 'Phí hoàn vé cho hạng Economy Flex là bao nhiêu?',
    },
  ];

  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
      {/* Abstract Airline Route Line Graphic */}
      <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-xl ring-4 ring-sky-100">
        {/* Dashed Route Line Circle */}
        <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-sky-400/40 animate-spin-slow" />
        <Plane className="h-10 w-10 text-sky-400 transform -rotate-12" />
        <Sparkles className="absolute top-2 right-2 h-4 w-4 text-cyan-300 animate-bounce" />
      </div>

      <h3 className="font-sans text-lg font-bold text-slate-900">
        {language === 'en'
          ? 'Start a conversation about your next trip.'
          : 'Bắt đầu cuộc trò chuyện cho chuyến đi tiếp theo của bạn.'}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">
        {language === 'en'
          ? 'Ask questions about flight schedules, baggage policies, seat selections or manage your existing booking.'
          : 'Đặt câu hỏi về lịch bay, hành lý, chọn chỗ ngồi hoặc quản lý mã đặt vé của bạn.'}
      </p>

      {/* Suggested prompts list */}
      <div className="mt-6 w-full max-w-md space-y-2">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(language === 'en' ? item.en : item.vi)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-900 active:scale-98"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <span className="flex-1 truncate">{language === 'en' ? item.en : item.vi}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
