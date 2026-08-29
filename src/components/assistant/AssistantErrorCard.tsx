import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';

interface AssistantErrorCardProps {
  language: AssistantLanguage;
  onRetry: () => void;
}

export const AssistantErrorCard: React.FC<AssistantErrorCardProps> = ({ language, onRetry }) => {
  return (
    <div className="mt-3 rounded-xl border border-rose-200/90 bg-rose-50/70 p-4 text-slate-800 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
          <AlertCircle className="h-5 w-5" />
        </div>

        <div className="flex flex-col">
          <h4 className="font-sans text-xs font-bold text-rose-900">
            {language === 'en'
              ? 'Service Temporarily Unavailable'
              : 'Dịch vụ tạm thời không phản hồi'}
          </h4>
          <p className="mt-1 text-xs text-slate-700 leading-relaxed">
            {language === 'en'
              ? 'The assistant is temporarily unavailable. Please try again in a moment.'
              : 'Hệ thống trợ lý ảo tạm thời chưa thể phản hồi. Vui lòng thử lại sau giây lát.'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end border-t border-rose-200/60 pt-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{language === 'en' ? 'Try again' : 'Thử lại'}</span>
        </button>
      </div>
    </div>
  );
};
