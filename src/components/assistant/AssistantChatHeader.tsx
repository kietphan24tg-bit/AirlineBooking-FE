import React, { useState } from 'react';
import {
  Sparkles,
  MoreVertical,
  RotateCcw,
  Download,
  Sliders,
} from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';

interface AssistantChatHeaderProps {
  language: AssistantLanguage;
  onClearChat: () => void;
  onExportTranscript: () => void;
  showStateDemoBar: boolean;
  onToggleStateDemoBar: () => void;
}

export const AssistantChatHeader: React.FC<AssistantChatHeaderProps> = ({
  language,
  onClearChat,
  onExportTranscript,
  showStateDemoBar,
  onToggleStateDemoBar,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex h-15 w-full items-center justify-between border-b border-slate-200/90 bg-white px-4 shadow-xs shrink-0">
      {/* Assistant Info */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white shadow-sm ring-1 ring-slate-200">
          <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-sans text-sm font-bold text-slate-900">
              AirlineBooking Assistant
            </h2>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-sky-800">
              AI Agent Pipeline
            </span>
          </div>
          <p className="text-[0.72rem] font-medium text-slate-500">
            {language === 'en'
              ? 'Online · Ready for flight lookup & booking assistance'
              : 'Trực tuyến · Sẵn sàng trợ giúp đặt vé & tra cứu'}
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle Demo Presets Bar Button */}
        <button
          type="button"
          onClick={onToggleStateDemoBar}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all border ${
            showStateDemoBar
              ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Toggle Chatbot State Switcher Demo Bar"
        >
          <Sliders className="h-3.5 w-3.5 text-sky-600" />
          <span className="hidden sm:inline">State Switcher</span>
        </button>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 z-40 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1 text-xs text-slate-700 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    onExportTranscript();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Export Transcript</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearChat();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                  <span>Clear Current Timeline</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
