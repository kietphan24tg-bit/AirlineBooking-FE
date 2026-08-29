import {
  Bot,
  History,
  MessageCircle,
  PlusCircle,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { chatbotService } from '../../services/chatbot.service';
import type {
  ChatbotMessage,
  ChatMessageView,
  RagChatResponse,
  ToolProposalView,
} from '../../types/chatbot.types';
import {
  AuthRequiredCard,
  ErrorCard,
  ProposalCard,
  SourcesSection,
  ToolResultCard,
} from './ChatbotMessageCards';
import { ChatHistoryModal } from './ChatHistoryModal';

const SUGGESTIONS = [
  'Hỏi chính sách hành lý',
  'Tìm chuyến bay SGN - HAN',
  'Xem thông tin booking',
  'Yêu cầu đổi ghế / thanh toán',
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => window.location.pathname.includes('assistant'));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPopState = () => setHidden(window.location.pathname.includes('assistant'));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error]);

  const loadMessagesForConversation = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const pageView = await chatbotService.getConversationMessages(conversationId);
      const loadedMessages: ChatbotMessage[] = (pageView.items ?? []).map((msg: ChatMessageView) => ({
        id: `msg-${msg.sequenceNumber}-${msg.createdAt}`,
        role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
        text: msg.content,
        createdAt: msg.createdAt,
      }));
      setMessages(loadedMessages);
    } catch {
      setError('Không thể tải lịch sử tin nhắn.');
    } finally {
      setLoading(false);
    }
  }, []);

  const initActiveConversation = useCallback(async () => {
    if (initialLoaded) return;
    try {
      const active = await chatbotService.getActiveConversation();
      if (active && active.id) {
        setActiveConversationId(active.id);
        await loadMessagesForConversation(active.id);
      }
    } catch {
      // Non-blocking fallback for unauthenticated / initial guest state
    } finally {
      setInitialLoaded(true);
    }
  }, [initialLoaded, loadMessagesForConversation]);

  useEffect(() => {
    if (open && !initialLoaded) {
      void initActiveConversation();
    }
  }, [open, initialLoaded, initActiveConversation]);

  if (hidden) return null;

  const handleSend = async (event?: FormEvent, presetText?: string) => {
    event?.preventDefault();
    const textToSend = (presetText ?? input).trim();
    if (!textToSend || loading) return;

    setInput('');
    setError(null);
    setLastFailedText(null);

    const userMsgId = crypto.randomUUID();
    const clientMessageId = crypto.randomUUID();

    const newUserMsg: ChatbotMessage = {
      id: userMsgId,
      role: 'user',
      text: textToSend,
      clientMessageId,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const reply: RagChatResponse = await chatbotService.sendMessage({
        message: textToSend,
        clientMessageId,
      });

      if (reply.conversation?.id) {
        setActiveConversationId(reply.conversation.id);
      }

      const assistantMsg: ChatbotMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: reply.answer || 'Tôi đã xử lý yêu cầu của bạn.',
        reply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : 'Trợ lý đang tạm thời không khả dụng. Vui lòng thử lại sau.';
      setError(errMsg);
      setLastFailedText(textToSend);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedText) {
      void handleSend(undefined, lastFailedText);
    }
  };

  const handleConfirmProposal = async (proposal: ToolProposalView) => {
    const updated = await chatbotService.confirmProposal(proposal.id);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.reply?.proposal?.id === proposal.id) {
          return {
            ...msg,
            reply: {
              ...msg.reply,
              proposal: { ...proposal, status: updated.status || 'CONFIRMED' },
            },
          };
        }
        return msg;
      })
    );
  };

  const handleRejectProposal = async (proposal: ToolProposalView) => {
    const updated = await chatbotService.rejectProposal(proposal.id);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.reply?.proposal?.id === proposal.id) {
          return {
            ...msg,
            reply: {
              ...msg.reply,
              proposal: { ...proposal, status: updated.status || 'REJECTED' },
            },
          };
        }
        return msg;
      })
    );
  };

  const handleNewChat = async () => {
    try {
      if (activeConversationId) {
        await chatbotService.archiveActiveConversation();
      }
    } catch {
      // Continue resetting local state even if server archive failed
    } finally {
      setActiveConversationId(null);
      setMessages([]);
      setError(null);
      setLastFailedText(null);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    void loadMessagesForConversation(conversationId);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] font-body sm:bottom-6 sm:right-6">
      {open && (
        <section
          className="relative mb-3 flex h-[min(680px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-lowest shadow-2xl transition-all"
          aria-label="AirlineBooking Assistant"
        >
          {/* Header */}
          <header className="flex items-center justify-between bg-midnight-burgundy px-4 py-3 text-white shadow-xs">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-luxury-gold text-midnight-burgundy shadow-xs">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="font-headline text-sm font-bold">AirlineBooking Assistant</p>
                <p className="text-[11px] text-white/70">Trợ lý chuyến bay AI</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Cuộc trò chuyện mới"
                title="Tạo cuộc trò chuyện mới"
                onClick={() => void handleNewChat()}
                className="rounded-lg p-1.5 hover:bg-white/10 text-white/90 hover:text-white transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Lịch sử trò chuyện"
                title="Lịch sử trò chuyện"
                onClick={() => setHistoryOpen(true)}
                className="rounded-lg p-1.5 hover:bg-white/10 text-white/90 hover:text-white transition-colors"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Đóng chatbot"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/10 text-white/90 hover:text-white transition-colors ml-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* History Drawer Modal */}
          <ChatHistoryModal
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={() => void handleNewChat()}
          />

          {/* Message Area */}
          <div className="flex-1 space-y-3.5 overflow-y-auto bg-surface px-3 py-4 sm:px-4">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-surface-lowest p-4 text-sm text-on-surface shadow-xs border border-outline-variant/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Bot className="h-5 w-5" />
                  <span>Xin chào! Tôi có thể hỗ trợ gì cho bạn?</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Tôi có thể giúp bạn giải đáp chính sách hành lý, tìm kiếm chuyến bay, tra cứu thông tin đặt vé hoặc hỗ trợ thủ tục đổi ghế.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void handleSend(undefined, suggestion)}
                      className="rounded-xl border border-outline-variant/50 bg-surface/60 px-2.5 py-2 text-left text-xs font-medium text-on-surface hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === 'user';
              const reply = message.reply;
              const answerType = reply?.answerType;

              return (
                <div
                  key={message.id}
                  className={
                    isUser
                      ? 'ml-8 rounded-2xl rounded-br-xs bg-primary px-3.5 py-2.5 text-sm text-white shadow-xs'
                      : 'mr-3 rounded-2xl rounded-bl-xs bg-surface-lowest px-3.5 py-3 text-sm text-on-surface shadow-xs border border-outline-variant/30'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

                  {/* Render based on AnswerType & Reply data */}
                  {!isUser && reply && (
                    <>
                      {/* RAG Answer Sources */}
                      <SourcesSection sources={reply.sources} />

                      {/* Tool Result Card */}
                      {answerType === 'TOOL_RESULT' && (
                        <ToolResultCard answer={reply.answer} trace={reply.trace} />
                      )}

                      {/* Authentication Required Card */}
                      {answerType === 'AUTHENTICATION_REQUIRED' && (
                        <AuthRequiredCard answer={reply.answer} />
                      )}

                      {/* Confirmation Proposal Card */}
                      {reply.proposal && (
                        <ProposalCard
                          proposal={reply.proposal}
                          onConfirm={handleConfirmProposal}
                          onReject={handleRejectProposal}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="mr-16 rounded-2xl rounded-bl-xs bg-surface-lowest px-3.5 py-3 text-xs text-on-surface-variant shadow-xs border border-outline-variant/30 flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Đang xử lý thông tin...</span>
              </div>
            )}

            {/* Error & Retry Component */}
            {error && (
              <ErrorCard
                error={error}
                onRetry={lastFailedText ? handleRetry : undefined}
                onClose={() => setError(null)}
              />
            )}

            <div ref={endRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(event) => void handleSend(event)}
            className="border-t border-outline-variant/30 bg-surface-lowest p-3 shadow-sm"
          >
            <div className="flex items-end gap-2 rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 focus-within:border-primary transition-colors">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 4000))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !loading) {
                      void handleSend();
                    }
                  }
                }}
                disabled={loading}
                rows={1}
                placeholder="Nhập câu hỏi của bạn..."
                className="max-h-24 min-h-9 flex-1 resize-none bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
                aria-label="Nhập câu hỏi"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Gửi câu hỏi"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white transition-opacity disabled:opacity-40 hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-on-surface-variant/70">
              <span>Nhấn Enter để gửi, Shift+Enter để xuống dòng</span>
              <span>{input.length}/4000</span>
            </div>
          </form>
        </section>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Đóng trợ lý' : 'Mở trợ lý'}
        className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-xl transition-all hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
