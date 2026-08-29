import React, { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  ChatMessage,
  AssistantLanguage,
  DemoStateKey,
} from '../types/assistant';
import {
  INITIAL_CONVERSATIONS,
  MOCK_FLIGHT_DATA,
  MOCK_BOOKING_DATA,
  MOCK_CONFIRMATION_DATA,
} from '../data/mockAssistantData';
import { AssistantTopNav } from '../components/assistant/AssistantTopNav';
import { AssistantSidebar } from '../components/assistant/AssistantSidebar';
import { AssistantChatHeader } from '../components/assistant/AssistantChatHeader';
import { AssistantStateSwitcher } from '../components/assistant/AssistantStateSwitcher';
import { AssistantMessageCard } from '../components/assistant/AssistantMessageCard';
import { AssistantComposer } from '../components/assistant/AssistantComposer';
import { AssistantEmptyState } from '../components/assistant/AssistantEmptyState';
import { AssistantSettingsModal } from '../components/assistant/AssistantSettingsModal';
import { toast } from 'sonner';

export default function Assistant() {
  // State management
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>('conv-1');
  const [language, setLanguage] = useState<AssistantLanguage>('en');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showStateDemoBar, setShowStateDemoBar] = useState(true);
  const [activeDemoStateKey, setActiveDemoStateKey] = useState<DemoStateKey | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active conversation object
  const activeConv = conversations.find((c) => c.id === activeId) || null;

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, isLoading]);

  // Handler: Start New Conversation
  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: language === 'en' ? 'New Trip Query' : 'Cuộc trò chuyện mới',
      timestamp: 'Just now',
      group: 'today',
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'welcome',
        },
      ],
    };
    setConversations([newConv, ...conversations]);
    setActiveId(newId);
    setActiveDemoStateKey('welcome');
    toast.success(
      language === 'en'
        ? 'Started new conversation'
        : 'Đã khởi tạo cuộc trò chuyện mới'
    );
  };

  // Handler: Select Conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
  };

  // Handler: Archive Conversation
  const handleArchiveConversation = (id: string) => {
    setConversations(
      conversations.map((c) => (c.id === id ? { ...c, archived: true } : c))
    );
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id && !c.archived);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.info(
      language === 'en' ? 'Conversation archived' : 'Đã lưu trữ cuộc trò chuyện'
    );
  };

  // Handler: Delete Conversation
  const handleDeleteConversation = (id: string) => {
    setConversations(conversations.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.error(
      language === 'en' ? 'Conversation deleted' : 'Đã xóa cuộc trò chuyện'
    );
  };

  // Handler: Clear Chat
  const handleClearChat = () => {
    if (!activeId) return;
    setConversations(
      conversations.map((c) => (c.id === activeId ? { ...c, messages: [] } : c))
    );
    setActiveDemoStateKey('empty');
    toast.info(language === 'en' ? 'Timeline cleared' : 'Đã xóa lịch sử tin nhắn');
  };

  // Handler: Export Transcript
  const handleExportTranscript = () => {
    if (!activeConv || activeConv.messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    const transcriptText = activeConv.messages
      .map((m) => `[${m.timestamp}] ${m.sender.toUpperCase()}: ${m.text || m.messageType}`)
      .join('\n\n');

    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airlinebooking-transcript-${activeConv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(
      language === 'en' ? 'Transcript downloaded!' : 'Đã tải xuống nhật ký trò chuyện!'
    );
  };

  // Handler: Send Message
  const handleSendMessage = (userText: string) => {
    if (!activeId) {
      handleNewConversation();
    }

    const currentId = activeId || conversations[0]?.id;
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: 'Just now',
      messageType: 'text',
    };

    // Append user message immediately
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentId) {
          const updatedTitle =
            c.messages.length <= 1 ? userText.slice(0, 30) + '...' : c.title;
          return {
            ...c,
            title: updatedTitle,
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      })
    );

    // Show loading typing state
    setIsLoading(true);

    // Simulate AI Concierge response logic
    setTimeout(() => {
      setIsLoading(false);
      const lower = userText.toLowerCase();
      let assistantMsg: ChatMessage;

      if (lower.includes('flight') || lower.includes('tim chuyen') || lower.includes('sgn')) {
        assistantMsg = {
          id: `msg-a-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'tool_flight',
          flightData: { ...MOCK_FLIGHT_DATA },
        };
      } else if (lower.includes('booking') || lower.includes('abc123') || lower.includes('tra cuu')) {
        assistantMsg = {
          id: `msg-a-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'tool_booking',
          bookingData: { ...MOCK_BOOKING_DATA },
        };
      } else if (lower.includes('seat') || lower.includes('doi ghe') || lower.includes('12a')) {
        assistantMsg = {
          id: `msg-a-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'confirmation',
          confirmationData: { ...MOCK_CONFIRMATION_DATA },
        };
      } else if (lower.includes('baggage') || lower.includes('hanh ly') || lower.includes('check in')) {
        assistantMsg = {
          id: `msg-a-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'rag',
          text:
            language === 'en'
              ? 'Our standard Economy allowance permits **1 carry-on bag (up to 10kg)** and **1 checked bag (up to 23kg)** for domestic flights. Online check-in opens 24h prior to departure.'
              : 'Quy định hành lý hạng Phổ thông bao gồm **1 kiện xách tay (tối đa 10kg)** và **1 kiện ký gửi (tối đa 23kg)** cho chuyến bay nội địa.',
          confidenceScore: 0.98,
          sources: [
            {
              id: 's1',
              title: 'AirlineBooking Tariff & Baggage Manual 2026',
              section: 'Article 4.1',
              url: '#',
            },
          ],
        };
      } else {
        assistantMsg = {
          id: `msg-a-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'rag',
          text:
            language === 'en'
              ? `I understand you are asking about: "${userText}". I can help you look up flight availability, verify your booking itinerary, or explain baggage and cancellation policies.`
              : `Tôi đã ghi nhận thắc mắc của bạn: "${userText}". Tôi có thể giúp bạn kiểm tra chuyến bay, mã đặt vé, hoặc giải đáp quy định hành lý.`,
          confidenceScore: 0.95,
          sources: [
            {
              id: 's2',
              title: 'Passenger Service Rules 2026',
              section: 'General Concierge Policy',
              url: '#',
            },
          ],
        };
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentId ? { ...c, messages: [...c.messages, assistantMsg] } : c
        )
      );
    }, 1200);
  };

  // Handler: Demo State Preset Injection
  const handleSelectDemoState = (key: DemoStateKey) => {
    setActiveDemoStateKey(key);

    if (key === 'empty') {
      handleClearChat();
      return;
    }

    if (!activeId) {
      handleNewConversation();
    }

    const currentId = activeId || conversations[0]?.id;
    let injectedMsg: ChatMessage;

    switch (key) {
      case 'welcome':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'welcome',
        };
        break;
      case 'rag':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'rag',
          text:
            language === 'en'
              ? 'For Economy Flex passengers, you are allowed **1 piece of carry-on baggage** weighing up to **10kg (22 lbs)** with maximum dimensions of 56 x 36 x 23 cm, plus **1 small personal item**.'
              : 'Đối với hạng Phổ thông Linh hoạt, hành khách được mang **1 kiện xách tay (tối đa 10kg)** và **1 túi cá nhân nhỏ**.',
          confidenceScore: 0.98,
          sources: [
            {
              id: 'src-1',
              title: 'AirlineBooking Baggage Policy §3.2',
              section: 'Carry-on Weight Restrictions',
              url: '#',
            },
            {
              id: 'src-2',
              title: 'Passenger Tariff & Baggage Rules 2026',
              section: 'Economy Class Allowance',
              url: '#',
            },
          ],
        };
        break;
      case 'tool_flight':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'tool_flight',
          flightData: { ...MOCK_FLIGHT_DATA },
        };
        break;
      case 'tool_booking':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'tool_booking',
          bookingData: { ...MOCK_BOOKING_DATA },
        };
        break;
      case 'confirmation':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'confirmation',
          confirmationData: { ...MOCK_CONFIRMATION_DATA },
        };
        break;
      case 'auth':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'auth',
        };
        break;
      case 'loading':
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 4000);
        return;
      case 'error':
        injectedMsg = {
          id: `msg-demo-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          messageType: 'error',
          error: {
            userMessageEn: 'The assistant is temporarily unavailable. Please try again in a moment.',
            userMessageVi: 'Hệ thống trợ lý tạm thời chưa thể phản hồi. Vui lòng thử lại sau giây lát.',
            canRetry: true,
          },
        };
        break;
      default:
        return;
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentId ? { ...c, messages: [...c.messages, injectedMsg] } : c
      )
    );
    toast.info(
      language === 'en'
        ? `Loaded Chatbot State: ${key}`
        : `Đã tải trạng thái Chatbot: ${key}`
    );
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-50 font-sans">
      {/* Top Navigation */}
      <AssistantTopNav
        language={language}
        onLanguageChange={setLanguage}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLoggedIn={isLoggedIn}
        onToggleAuth={() => {
          setIsLoggedIn(!isLoggedIn);
          toast.success(
            !isLoggedIn ? 'Signed in as Alex Morgan' : 'Signed out to Guest Mode'
          );
        }}
      />

      {/* Main Workspace (Two-column desktop layout) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (~280px) */}
        <AssistantSidebar
          conversations={conversations}
          activeConversationId={activeId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onArchiveConversation={handleArchiveConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Chat Panel */}
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          {/* Chat Header */}
          <AssistantChatHeader
            language={language}
            onClearChat={handleClearChat}
            onExportTranscript={handleExportTranscript}
            showStateDemoBar={showStateDemoBar}
            onToggleStateDemoBar={() => setShowStateDemoBar(!showStateDemoBar)}
          />

          {/* Quick Demo State Switcher Bar */}
          {showStateDemoBar && (
            <AssistantStateSwitcher
              activeStateKey={activeDemoStateKey}
              onSelectState={handleSelectDemoState}
            />
          )}

          {/* Scrollable Message Timeline */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {!activeConv || activeConv.messages.length === 0 ? (
              <AssistantEmptyState
                language={language}
                onSelectPrompt={handleSendMessage}
              />
            ) : (
              activeConv.messages.map((msg) => (
                <AssistantMessageCard
                  key={msg.id}
                  message={msg}
                  language={language}
                  onSelectPrompt={handleSendMessage}
                  onSignIn={() => {
                    setIsLoggedIn(true);
                    toast.success('Successfully signed in!');
                  }}
                  onContinueGeneral={() => {
                    handleSendMessage('Show general baggage policy');
                  }}
                  onRetry={() => {
                    handleSendMessage('Retry last search query');
                  }}
                />
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Composer at Bottom */}
          <AssistantComposer
            language={language}
            onSend={handleSendMessage}
            isLoading={isLoading}
            onCancelLoading={() => {
              setIsLoading(false);
              toast.info('Cancelled request.');
            }}
          />
        </main>
      </div>

      {/* Settings Modal */}
      <AssistantSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        onLanguageChange={setLanguage}
      />
    </div>
  );
}
