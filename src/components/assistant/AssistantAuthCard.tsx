import React from 'react';
import { Lock, LogIn, HelpCircle } from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';

interface AssistantAuthCardProps {
  language: AssistantLanguage;
  onSignIn: () => void;
  onContinueGeneral: () => void;
}

export const AssistantAuthCard: React.FC<AssistantAuthCardProps> = ({
  language,
  onSignIn,
  onContinueGeneral,
}) => {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 p-4 text-white shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/30">
          <Lock className="h-5 w-5" />
        </div>

        <div className="flex flex-col">
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-sky-400">
            {language === 'en' ? 'AUTHENTICATION REQUIRED' : 'YÊU CẦU ĐĂNG NHẬP'}
          </span>
          <h3 className="font-sans text-sm font-bold text-white mt-0.5">
            {language === 'en'
              ? 'Please sign in to view personal booking or payment information.'
              : 'Vui lòng đăng nhập để xem thông tin đặt vé hoặc thanh toán cá nhân.'}
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            {language === 'en'
              ? 'Your booking records and personal itinerary are protected under airline security policy.'
              : 'Hành trình và thông tin của bạn được bảo mật theo chính sách an toàn thông tin.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-700/80 pt-3">
        <button
          type="button"
          onClick={onContinueGeneral}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>
            {language === 'en'
              ? 'Continue with general questions'
              : 'Tiếp tục câu hỏi chung'}
          </span>
        </button>

        <button
          type="button"
          onClick={onSignIn}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-sky-400 active:scale-95"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>{language === 'en' ? 'Sign in' : 'Đăng nhập ngay'}</span>
        </button>
      </div>
    </div>
  );
};
