import { chatbotService } from '../../services/chatbot.service';
import type { ChatRequest, RagChatResponse, ToolProposalView } from '../../types/chatbot.types';

// Simple unit tests for Chatbot service contract & responses
export async function testChatbotServiceContract() {
  const _request: ChatRequest = {
    message: 'Chính sách hành lý',
    clientMessageId: 'test-client-id-123',
  };

  if (typeof chatbotService.sendMessage !== 'function') {
    throw new Error('sendMessage must be defined on chatbotService');
  }

  if (typeof chatbotService.getActiveConversation !== 'function') {
    throw new Error('getActiveConversation must be defined on chatbotService');
  }

  if (typeof chatbotService.listConversations !== 'function') {
    throw new Error('listConversations must be defined on chatbotService');
  }

  if (typeof chatbotService.getConversationMessages !== 'function') {
    throw new Error('getConversationMessages must be defined on chatbotService');
  }

  if (typeof chatbotService.archiveActiveConversation !== 'function') {
    throw new Error('archiveActiveConversation must be defined on chatbotService');
  }

  if (typeof chatbotService.deleteConversation !== 'function') {
    throw new Error('deleteConversation must be defined on chatbotService');
  }

  if (typeof chatbotService.confirmProposal !== 'function') {
    throw new Error('confirmProposal must be defined on chatbotService');
  }

  if (typeof chatbotService.rejectProposal !== 'function') {
    throw new Error('rejectProposal must be defined on chatbotService');
  }

  return true;
}

export function assertValidRagResponse(response: RagChatResponse) {
  if (typeof response.answer !== 'string') {
    throw new Error('RagChatResponse answer must be a string');
  }
}

export function assertValidProposalView(proposal: ToolProposalView) {
  if (typeof proposal.id !== 'string') {
    throw new Error('ToolProposalView id must be a string');
  }
}
