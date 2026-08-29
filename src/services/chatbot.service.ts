import api from '../api/axios';
import type {
  ChatConversationListView,
  ChatConversationView,
  ChatMessagePageView,
  ChatRequest,
  RagChatResponse,
  ToolProposalView,
} from '../types/chatbot.types';

const isMockEnabled = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_CHATBOT_MOCK === 'true';
};

function toAscii(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

let mockActiveConversation: ChatConversationView | null = null;
const mockConversationsList: ChatConversationView[] = [];

export const chatbotService = {
  async sendMessage(request: ChatRequest): Promise<RagChatResponse> {
    if (isMockEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const raw = request.message.toLowerCase();
      const ascii = toAscii(request.message);

      let response: RagChatResponse;

      if (raw.includes('đăng nhập') || ascii.includes('login') || ascii.includes('dang nhap')) {
        response = {
          answer: 'Bạn cần đăng nhập để thực hiện thao tác này.',
          answerType: 'AUTHENTICATION_REQUIRED',
          grounded: false,
          fallbackReason: 'AUTHENTICATION_REQUIRED',
        };
      } else if (
        ascii.includes('booking') ||
        raw.includes('chuyến bay của tôi') ||
        ascii.includes('chuyen bay cua toi') ||
        raw.includes('xem booking') ||
        ascii.includes('xem booking') ||
        raw.includes('xem thông tin booking') ||
        ascii.includes('xem thong tin booking')
      ) {
        response = {
          answer: 'Thông tin đặt vé của bạn (Mã: BK-8892): Chuyến bay VN123 (TP.HCM -> Hà Nội), khởi hành 14:30 15/09/2026.',
          answerType: 'TOOL_RESULT',
          grounded: true,
          trace: [
            { type: 'tool_call', label: 'Tra cứu booking BK-8892', status: 'ok', tool: 'getBookingDetails' },
          ],
        };
      } else if (
        raw.includes('đổi') ||
        ascii.includes('doi') ||
        raw.includes('ghế') ||
        ascii.includes('ghe') ||
        raw.includes('thanh toán') ||
        ascii.includes('thanh toan') ||
        ascii.includes('seat')
      ) {
        response = {
          answer: 'Tôi đã tạo đề xuất đổi ghế. Vui lòng xác nhận thông tin bên dưới:',
          answerType: 'CONFIRMATION_REQUIRED',
          grounded: true,
          proposal: {
            id: `proposal-${Date.now()}`,
            tool: 'SeatChangeHandler',
            operation: 'CHANGE_SEAT',
            status: 'PENDING',
            summary: 'Đổi ghế từ 12A sang 14C cho booking BK-8892 (Phí bổ sung: 150.000 VND).',
            details: { flightNumber: 'VN123', oldSeat: '12A', newSeat: '14C', fee: 150000 },
          },
        };
      } else if (
        raw.includes('tìm') ||
        ascii.includes('tim') ||
        raw.includes('chuyến bay') ||
        ascii.includes('chuyen bay') ||
        ascii.includes('flight') ||
        ascii.includes('sgn') ||
        ascii.includes('han')
      ) {
        response = {
          answer: 'Kết quả tìm kiếm chuyến bay TP.HCM (SGN) đi Hà Nội (HAN):\n- VN123 (08:00 - 10:15) giá từ 1.250.000 VND\n- VN125 (14:30 - 16:45) giá từ 1.450.000 VND',
          answerType: 'TOOL_RESULT',
          grounded: true,
          trace: [
            { type: 'tool_call', label: 'Tìm kiếm chuyến bay SGN -> HAN', status: 'ok', tool: 'searchFlights' },
          ],
        };
      } else {
        response = {
          answer:
            'Theo quy định hành lý của AirlineBooking, mỗi hành khách được mang 1 kiện hành lý xách tay tối đa 10kg và 1 túi cá nhân nhỏ.',
          answerType: 'ANSWER',
          grounded: true,
          confidence: 0.96,
          sources: [
            {
              sourceFile: 'chinh-sach-hanh-ly.md',
              headingPath: 'Chính sách hành lý xách tay > Quy định trọng lượng',
            },
          ],
        };
      }

      if (!mockActiveConversation) {
        mockActiveConversation = {
          id: `mock-conv-${Date.now()}`,
          status: 'ACTIVE',
          title: request.message.slice(0, 40),
          lastActiveAt: new Date().toISOString(),
        };
      }

      response.conversation = {
        id: mockActiveConversation.id,
        status: mockActiveConversation.status,
      };

      return response;
    }

    const response = await api.post<RagChatResponse>('/api/chatbot/messages', request);
    return response.data;
  },

  async getActiveConversation(): Promise<ChatConversationView | null> {
    if (isMockEnabled()) {
      return mockActiveConversation;
    }
    const response = await api.get<ChatConversationView | null>('/api/chatbot/conversations/active');
    if (response.status === 204 || !response.data) {
      return null;
    }
    return response.data;
  },

  async listConversations(cursor?: string, limit = 20): Promise<ChatConversationListView> {
    if (isMockEnabled()) {
      const items = [...mockConversationsList];
      if (mockActiveConversation && !items.some((c) => c.id === mockActiveConversation?.id)) {
        items.unshift(mockActiveConversation);
      }
      return {
        items,
        nextCursor: null,
      };
    }
    const response = await api.get<ChatConversationListView>('/api/chatbot/conversations', {
      params: { cursor, limit },
    });
    return response.data;
  },

  async getConversationMessages(
    conversationId: string,
    beforeSequence?: number,
    limit = 50
  ): Promise<ChatMessagePageView> {
    if (isMockEnabled()) {
      return { items: [], nextBeforeSequence: null };
    }
    const response = await api.get<ChatMessagePageView>(
      `/api/chatbot/conversations/${conversationId}/messages`,
      { params: { beforeSequence, limit } }
    );
    return response.data;
  },

  async archiveActiveConversation(): Promise<ChatConversationView | null> {
    if (isMockEnabled()) {
      if (mockActiveConversation) {
        mockActiveConversation.status = 'ARCHIVED';
        if (!mockConversationsList.some((c) => c.id === mockActiveConversation?.id)) {
          mockConversationsList.push({ ...mockActiveConversation });
        }
        mockActiveConversation = null;
      }
      return null;
    }
    const response = await api.post<ChatConversationView | null>(
      '/api/chatbot/conversations/active/archive'
    );
    if (response.status === 204 || !response.data) {
      return null;
    }
    return response.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    if (isMockEnabled()) {
      if (mockActiveConversation?.id === conversationId) {
        mockActiveConversation = null;
      }
      const idx = mockConversationsList.findIndex((c) => c.id === conversationId);
      if (idx !== -1) {
        mockConversationsList.splice(idx, 1);
      }
      return;
    }
    await api.delete(`/api/chatbot/conversations/${conversationId}`);
  },

  async getProposal(proposalId: string): Promise<ToolProposalView> {
    if (isMockEnabled()) {
      return {
        id: proposalId,
        status: 'PENDING',
        summary: 'Yêu cầu đổi ghế',
      };
    }
    const response = await api.get<ToolProposalView>(`/api/chatbot/proposals/${proposalId}`);
    return response.data;
  },

  async confirmProposal(proposalId: string): Promise<ToolProposalView> {
    if (isMockEnabled()) {
      return {
        id: proposalId,
        status: 'CONFIRMED',
        summary: 'Đã xác nhận thành công.',
      };
    }
    const response = await api.post<ToolProposalView>(`/api/chatbot/proposals/${proposalId}/confirm`);
    return response.data;
  },

  async rejectProposal(proposalId: string): Promise<ToolProposalView> {
    if (isMockEnabled()) {
      return {
        id: proposalId,
        status: 'REJECTED',
        summary: 'Đã từ chối yêu cầu.',
      };
    }
    const response = await api.post<ToolProposalView>(`/api/chatbot/proposals/${proposalId}/reject`);
    return response.data;
  },
};
