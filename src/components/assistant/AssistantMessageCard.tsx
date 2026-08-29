import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
} from 'lucide-react';
import { ChatMessage, AssistantLanguage } from '../../types/assistant';
import { AssistantSourceList } from './AssistantSourceList';
import { AssistantFlightCard } from './AssistantFlightCard';
import { AssistantBookingCard } from './AssistantBookingCard';
import { AssistantConfirmationCard } from './AssistantConfirmationCard';
import { AssistantAuthCard } from './AssistantAuthCard';
import { AssistantErrorCard } from './AssistantErrorCard';
import { AssistantWelcomeState } from './AssistantWelcomeState';
import { toast } from 'sonner';

interface AssistantMessageCardProps {
  message: ChatMessage;
  language: AssistantLanguage;
  onSelectPrompt: (promptText: string) => void;
  onSignIn: () => void;
  onContinueGeneral: () => void;
  onRetry: () => void;
}

export const AssistantMessageCard: React.FC<AssistantMessageCardProps> = ({
  message,
  language,
  onSelectPrompt,
  onSignIn,
  onContinueGeneral,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<'helpful' | 'unhelpful' | null>(
    message.helpfulRating || null
  );

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      toast.success(
        language === 'en' ? 'Copied answer to clipboard' : 'Đã sao chép câu trả lời'
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRating = (rate: 'helpful' | 'unhelpful') => {
    setRating(rate);
    toast.success(
      rate === 'helpful'
        ? language === 'en'
          ? 'Thank you for your feedback!'
          : 'Cảm ơn đánh giá của bạn!'
        : language === 'en'
        ? 'Feedback logged. We will improve our response.'
        : 'Đã ghi nhận góp ý.'
    );
  };

  // 1. User Message (Right Aligned, Deep Navy)
  if (message.sender === 'user') {
    return (
      <div className="flex w-full justify-end mb-4 px-2">
        <div className="flex max-w-[85%] sm:max-w-[75%] flex-col items-end">
          <div className="flex items-center gap-1.5 mb-1 text-[0.68rem] text-slate-400">
            <span className="font-semibold text-slate-700">You</span>
            <span>·</span>
            <span>{message.timestamp}</span>
          </div>

          <div className="rounded-2xl rounded-tr-none bg-slate-900 px-4 py-3 text-xs leading-relaxed text-white shadow-md">
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Assistant Message (Left Aligned, White Card)
  return (
    <div className="flex w-full justify-start mb-5 px-2">
      <div className="flex max-w-[95%] sm:max-w-[88%] items-start gap-3">
        {/* Assistant Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white shadow-sm ring-1 ring-slate-200 mt-0.5">
          <Sparkles className="h-4 w-4 text-cyan-400" />
        </div>

        <div className="flex flex-1 flex-col">
          {/* Top Label */}
          <div className="flex items-center gap-2 mb-1 text-[0.68rem] text-slate-400">
            <span className="font-bold text-slate-900">AirlineBooking Assistant</span>
            <span>·</span>
            <span>{message.timestamp}</span>
          </div>

          {/* Assistant Message Body */}
          <div className="rounded-2xl rounded-tl-none border border-slate-200/90 bg-white p-4 shadow-sm text-xs text-slate-800">
            {/* Welcome State */}
            {message.messageType === 'welcome' && (
              <AssistantWelcomeState
                language={language}
                onSelectPrompt={onSelectPrompt}
              />
            )}

            {/* Standard Text or RAG Answer */}
            {message.text && message.messageType !== 'welcome' && (
              <div className="whitespace-pre-wrap leading-relaxed">
                {message.text.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={i} className="font-bold text-slate-900 my-1">
                        {line.replaceAll('**', '')}
                      </p>
                    );
                  }
                  return <p key={i} className="my-0.5">{line}</p>;
                })}
              </div>
            )}

            {/* RAG Answer extra components: Sources + Actions + Confidence */}
            {message.messageType === 'rag' && (
              <>
                {/* Sources Section */}
                {message.sources && <AssistantSourceList sources={message.sources} />}

                {/* Footer Bar: Actions + Confidence Indicator */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between border-t border-slate-100 pt-2.5 text-[0.7rem] text-slate-500 gap-2">
                  {/* Confidence Indicator */}
                  {message.confidenceScore && (
                    <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      <span>
                        {Math.round(message.confidenceScore * 100)}%{' '}
                        {language === 'en' ? 'Grounded in Official Policy' : 'Chính xác theo quy định'}
                      </span>
                    </div>
                  )}

                  {/* Actions: Copy & Rating */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      title="Copy answer"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRating('helpful')}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                        rating === 'helpful'
                          ? 'bg-sky-100 font-bold text-sky-800'
                          : 'hover:bg-slate-100 hover:text-slate-800'
                      }`}
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRating('unhelpful')}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                        rating === 'unhelpful'
                          ? 'bg-rose-100 font-bold text-rose-800'
                          : 'hover:bg-slate-100 hover:text-slate-800'
                      }`}
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Flight Result Card State */}
            {message.messageType === 'tool_flight' && message.flightData && (
              <AssistantFlightCard data={message.flightData} language={language} />
            )}

            {/* Booking Status Card State */}
            {message.messageType === 'tool_booking' && message.bookingData && (
              <AssistantBookingCard data={message.bookingData} language={language} />
            )}

            {/* Confirmation Required State */}
            {message.messageType === 'confirmation' && message.confirmationData && (
              <AssistantConfirmationCard
                data={message.confirmationData}
                language={language}
              />
            )}

            {/* Authentication Required State */}
            {message.messageType === 'auth' && (
              <AssistantAuthCard
                language={language}
                onSignIn={onSignIn}
                onContinueGeneral={onContinueGeneral}
              />
            )}

            {/* Loading State */}
            {message.messageType === 'loading' && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-sky-500 animate-bounce" />
                </div>
                <span className="font-mono text-xs font-semibold text-sky-800">
                  {language === 'en'
                    ? 'Checking your booking securely...'
                    : 'Đang kiểm tra dữ liệu hệ thống...'}
                </span>
              </div>
            )}

            {/* Error and Fallback State */}
            {message.messageType === 'error' && (
              <AssistantErrorCard language={language} onRetry={onRetry} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
