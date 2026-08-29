import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Archive,
  Trash2,
  HelpCircle,
  Shield,
  Settings,
  X,
  Clock,
} from 'lucide-react';
import { Conversation, HistoryGroup } from '../../types/assistant';

interface AssistantSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onArchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AssistantSidebar: React.FC<AssistantSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onArchiveConversation,
  onDeleteConversation,
  onOpenSettings,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by search term
  const filteredConversations = conversations.filter(
    (c) =>
      !c.archived &&
      (c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Group by history period
  const groups: { key: HistoryGroup; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'previous_7_days', label: 'Previous 7 days' },
  ];

  const content = (
    <aside className="flex h-full w-full flex-col bg-slate-900 text-slate-200">
      {/* Header with New Conversation button */}
      <div className="p-3.5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3 lg:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Conversations
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onNewConversation();
            if (isMobileOpen) onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 px-4 font-sans text-xs font-bold text-white shadow-md transition-all hover:bg-sky-400 active:scale-98 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New Conversation</span>
        </button>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 transition-colors focus:border-sky-500 focus:bg-slate-950 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            {searchQuery ? 'No matching conversations found' : 'No history yet'}
          </div>
        ) : (
          groups.map(({ key, label }) => {
            const items = filteredConversations.filter((c) => c.group === key);
            if (items.length === 0) return null;

            return (
              <div key={key} className="space-y-1">
                <div className="px-3 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </div>
                {items.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-950/70 font-semibold text-white ring-1 ring-sky-500/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        if (isMobileOpen) onCloseMobile();
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <MessageSquare
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-xs font-medium text-slate-100">
                            {conv.title}
                          </span>
                          <span className="text-[0.65rem] text-slate-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 inline text-slate-500" />
                            {conv.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="hidden items-center gap-1 group-hover:flex">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveConversation(conv.id);
                          }}
                          title="Archive conversation"
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                        >
                          <Archive className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          title="Delete conversation"
                          className="rounded p-1 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Links */}
      <div className="border-t border-slate-800 p-2.5 text-xs text-slate-400 bg-slate-950/60">
        <div className="flex items-center justify-around text-[0.72rem]">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
            <span>Help</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span>Privacy</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (~280px) */}
      <div className="hidden w-[280px] shrink-0 lg:block border-r border-slate-800 h-full">
        {content}
      </div>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-[290px] max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
