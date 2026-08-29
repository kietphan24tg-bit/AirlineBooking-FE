import React, { useState } from 'react';
import { X, Settings, Shield, HelpCircle, Check, Sparkles } from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';
import { toast } from 'sonner';

interface AssistantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AssistantLanguage;
  onLanguageChange: (lang: AssistantLanguage) => void;
}

export const AssistantSettingsModal: React.FC<AssistantSettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'privacy' | 'help'>('settings');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-white">
                {language === 'en' ? 'Assistant Preferences' : 'Tùy chỉnh trợ lý'}
              </h3>
              <p className="text-[0.7rem] text-slate-400">AirlineBooking AI Agent Pipeline v2.4</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex border-b border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 border-b-2 py-2 px-3 transition-all ${
              activeTab === 'settings'
                ? 'border-sky-400 font-bold text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{language === 'en' ? 'Settings' : 'Cài đặt'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 border-b-2 py-2 px-3 transition-all ${
              activeTab === 'privacy'
                ? 'border-sky-400 font-bold text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{language === 'en' ? 'Privacy' : 'Bảo mật'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-1.5 border-b-2 py-2 px-3 transition-all ${
              activeTab === 'help'
                ? 'border-sky-400 font-bold text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{language === 'en' ? 'Help & FAQ' : 'Trợ giúp'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 min-h-[220px] text-xs text-slate-300">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  {language === 'en' ? 'Interface Language' : 'Ngôn ngữ giao diện'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onLanguageChange('en')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold border transition-all ${
                      language === 'en'
                        ? 'border-sky-400 bg-sky-950 text-white ring-1 ring-sky-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {language === 'en' && <Check className="h-3.5 w-3.5 text-sky-400" />}
                    English (US)
                  </button>

                  <button
                    type="button"
                    onClick={() => onLanguageChange('vi')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold border transition-all ${
                      language === 'vi'
                        ? 'border-sky-400 bg-sky-950 text-white ring-1 ring-sky-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {language === 'vi' && <Check className="h-3.5 w-3.5 text-sky-400" />}
                    Tiếng Việt
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  {language === 'en' ? 'AI Response Speed' : 'Tốc độ phản hồi AI'}
                </label>
                <p className="text-[0.7rem] text-slate-400">
                  {language === 'en'
                    ? 'Fast mode uses streaming optimization with policy validation.'
                    : 'Chế độ nhanh tối ưu thời gian phản hồi theo chính sách hãng.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-2 leading-relaxed text-slate-300">
              <p className="font-bold text-white">🔒 Airline Security & Privacy Compliance</p>
              <p>
                All personal booking numbers, passport details, and flight changes requested through
                the AirlineBooking Assistant are protected using end-to-end SSL encryption.
              </p>
              <p className="text-slate-400">
                Action proposals (e.g. seat changes or ticket cancellations) require explicit two-factor
                user confirmation before backend execution.
              </p>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="space-y-2">
              <p className="font-bold text-white">❓ Frequently Asked Questions</p>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="font-semibold text-sky-400 block">Q: Can the AI change my seat directly?</span>
                <span className="text-slate-300 block mt-0.5">
                  A: The AI generates a confirmation proposal. No seat change is finalized until you click
                  &quot;Confirm change&quot;.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => {
              toast.success(language === 'en' ? 'Preferences saved' : 'Đã lưu tùy chỉnh');
              onClose();
            }}
            className="rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold text-white hover:bg-sky-400 transition-colors"
          >
            {language === 'en' ? 'Save & Close' : 'Lưu & Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};
