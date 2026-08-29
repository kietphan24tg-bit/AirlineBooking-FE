import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';
import { SourceItem } from '../../types/assistant';

interface AssistantSourceListProps {
  sources: SourceItem[];
}

export const AssistantSourceList: React.FC<AssistantSourceListProps> = ({ sources }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between font-semibold text-slate-700 hover:text-slate-900 focus:outline-none"
      >
        <div className="flex items-center gap-1.5 text-slate-600">
          <BookOpen className="h-3.5 w-3.5 text-sky-600" />
          <span>Official Policy Sources ({sources.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-1.5 border-t border-slate-200/80 pt-2">
          {sources.map((src, idx) => (
            <a
              key={src.id || idx}
              href={src.url}
              onClick={(e) => e.preventDefault()}
              className="flex items-center justify-between rounded-md p-1.5 transition-colors hover:bg-white hover:shadow-xs group"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-800 text-[0.72rem] group-hover:text-sky-700">
                  [{idx + 1}] {src.title}
                </span>
                <span className="text-[0.65rem] text-slate-500">{src.section}</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-sky-600" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
