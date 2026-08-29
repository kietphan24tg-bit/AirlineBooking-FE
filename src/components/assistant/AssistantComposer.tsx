import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Loader2, Sparkles } from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';
import { toast } from 'sonner';

interface AssistantComposerProps {
  language: AssistantLanguage;
  onSend: (text: string) => void;
  isLoading: boolean;
  onCancelLoading?: () => void;
}

export const AssistantComposer: React.FC<AssistantComposerProps> = ({
  language,
  onSend,
  isLoading,
  onCancelLoading,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHAR = 1000;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleAttachment = () => {
    toast.info(
      language === 'en'
        ? 'Attachment feature: Upload ticket PDF or passport photo.'
        : 'Tính năng đính kèm: Tải file PDF vé hoặc ảnh hộ chiếu.'
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHAR) {
      setText(val);
    }
  };

  return (
    <div className="sticky bottom-0 z-30 w-full border-t border-slate-200 bg-white/95 backdrop-blur-md p-3 shadow-lg">
      <div className="mx-auto max-w-4xl">
        {/* Loading status bar with Cancel option if loading */}
        {isLoading && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-1.5 text-xs text-sky-800 border border-sky-200">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
              <span>
                {language === 'en'
                  ? 'Checking your booking securely...'
                  : 'Đang kiểm tra thông tin bảo mật...'}
              </span>
            </div>
            {onCancelLoading && (
              <button
                type="button"
                onClick={onCancelLoading}
                className="text-[0.7rem] font-bold text-sky-700 underline hover:text-sky-900"
              >
                {language === 'en' ? 'Cancel request' : 'Hủy yêu cầu'}
              </button>
            )}
          </div>
        )}

        {/* Input Box Shell */}
        <div
          className={`relative flex items-end gap-2 rounded-2xl border p-2 shadow-sm transition-all ${
            isLoading
              ? 'border-slate-200 bg-slate-100/70 opacity-75 pointer-events-none'
              : 'border-slate-300 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200/60'
          }`}
        >
          {/* Attachment button */}
          <button
            type="button"
            onClick={handleAttachment}
            disabled={isLoading}
            title={language === 'en' ? 'Attach document' : 'Đính kèm tài liệu'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              language === 'en'
                ? 'Ask about flights, baggage, bookings or refunds...'
                : 'Hỏi về chuyến bay, hành lý, mã đặt vé hoặc hoàn vé...'
            }
            className="w-full resize-none border-0 bg-transparent py-2 px-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 max-h-32 min-h-[38px]"
          />

          {/* Right Action & Character Counter */}
          <div className="flex items-center gap-2 pb-0.5 pr-1">
            <span className="hidden text-[0.65rem] font-mono text-slate-400 sm:inline">
              {text.length}/{MAX_CHAR}
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              aria-label="Send message"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                text.trim() && !isLoading
                  ? 'bg-slate-900 text-white shadow-sm hover:bg-sky-600 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="mt-1.5 flex items-center justify-between text-[0.68rem] text-slate-400 px-2">
          <span>
            {language === 'en'
              ? 'Enter to send · Shift + Enter for a new line'
              : 'Enter để gửi · Shift + Enter để xuống dòng'}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[0.65rem] text-sky-700">
            <Sparkles className="h-3 w-3 text-cyan-500" />
            AirlineBooking AI Guardrail Protected
          </span>
        </div>
      </div>
    </div>
  );
};
