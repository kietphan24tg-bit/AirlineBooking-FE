import React from 'react';
import { DemoStateKey } from '../../types/assistant';
import {
  Sparkles,
  BookOpen,
  Plane,
  Ticket,
  AlertTriangle,
  Lock,
  Loader2,
  AlertOctagon,
  MessageSquareOff,
} from 'lucide-react';

interface AssistantStateSwitcherProps {
  activeStateKey: DemoStateKey | null;
  onSelectState: (key: DemoStateKey) => void;
}

export const AssistantStateSwitcher: React.FC<AssistantStateSwitcherProps> = ({
  activeStateKey,
  onSelectState,
}) => {
  const states: { key: DemoStateKey; label: string; icon: React.ReactNode }[] = [
    { key: 'welcome', label: '1. Welcome', icon: <Sparkles className="h-3 w-3" /> },
    { key: 'rag', label: '2. RAG Answer', icon: <BookOpen className="h-3 w-3" /> },
    { key: 'tool_flight', label: '3. Flight Card', icon: <Plane className="h-3 w-3" /> },
    { key: 'tool_booking', label: '3b. Booking Card', icon: <Ticket className="h-3 w-3" /> },
    { key: 'confirmation', label: '4. Confirmation', icon: <AlertTriangle className="h-3 w-3" /> },
    { key: 'auth', label: '5. Auth Required', icon: <Lock className="h-3 w-3" /> },
    { key: 'loading', label: '6. Loading', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    { key: 'error', label: '7. Error Fallback', icon: <AlertOctagon className="h-3 w-3" /> },
    { key: 'empty', label: '8. Empty State', icon: <MessageSquareOff className="h-3 w-3" /> },
  ];

  return (
    <div className="border-b border-sky-100 bg-slate-900 px-3 py-2 text-white">
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <span className="text-[0.68rem] font-bold uppercase tracking-wider text-sky-400 shrink-0">
          Demo State Switcher:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {states.map(({ key, label, icon }) => {
            const isActive = activeStateKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectState(key)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[0.7rem] font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white font-semibold shadow-xs ring-1 ring-sky-300'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
