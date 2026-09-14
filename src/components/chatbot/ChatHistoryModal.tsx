import { Archive, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { chatbotService } from '../../services/chatbot.service';
import type { ChatConversationView } from '../../types/chatbot.types';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId?: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
}

export function ChatHistoryModal({
  isOpen,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatHistoryModalProps) {
  const [conversations, setConversations] = useState<ChatConversationView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chatbotService.listConversations();
      setConversations(res.items ?? []);
    } catch {
      setError('Không thể tải lịch sử trò chuyện.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchConversations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleArchiveActive = async () => {
    try {
      await chatbotService.archiveActiveConversation();
      await fetchConversations();
      onNewChat();
    } catch {
      setError('Không thể lưu trữ cuộc trò chuyện.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatbotService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        onNewChat();
      }
    } catch {
      setError('Không thể xoá cuộc trò chuyện.');
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-surface-lowest/95 backdrop-blur-xs p-4 border border-outline-variant/40 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <h3 className="font-headline text-base font-bold text-on-surface">Lịch sử trò chuyện</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-variant/40"
          aria-label="Đóng lịch sử"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="my-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Cuộc trò chuyện mới
        </button>

        {activeConversationId && (
          <button
            type="button"
            onClick={() => void handleArchiveActive()}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-variant/40 transition-colors"
            title="Lưu trữ cuộc trò chuyện hiện tại"
          >
            <Archive className="h-4 w-4" />
            Lưu trữ
          </button>
        )}
      </div>

      {error && <p className="text-xs text-error mb-2">{error}</p>}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && <p className="text-xs text-on-surface-variant p-2">Đang tải danh sách...</p>}

        {!loading && conversations.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-6">
            Chưa có lịch sử trò chuyện nào.
          </p>
        )}

        {conversations.map((conv) => {
          const isActive = conv.id === activeConversationId;
          return (
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectConversation(conv.id);
                onClose();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectConversation(conv.id);
                  onClose();
                }
              }}
              className={`group flex items-center justify-between rounded-xl p-3 text-xs cursor-pointer border transition-colors ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-outline-variant/30 bg-surface/40 hover:bg-surface-variant/40 text-on-surface'
              }`}
            >
              <div className="truncate pr-2">
                <p className="truncate font-medium">{conv.title || 'Cuộc trò chuyện mới'}</p>
                <p className="text-[10px] text-on-surface-variant/80">
                  {conv.lastActiveAt ? new Date(conv.lastActiveAt).toLocaleString('vi-VN') : ''}
                  {conv.status === 'ARCHIVED' && ' (Đã lưu trữ)'}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => void handleDelete(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-on-surface-variant hover:text-error rounded-md transition-opacity"
                title="Xoá cuộc trò chuyện"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
