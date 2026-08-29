export interface SourceCitation {
  sourceFile?: string;
  headingPath?: string;
}

export interface AgentTraceStep {
  type: string;
  label: string;
  status: string;
  tool?: string;
}

export interface ToolProposalView {
  id: string;
  tool?: string;
  operation?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | string;
  summary?: string;
  details?: Record<string, unknown>;
  expiresAt?: string;
  confirmPath?: string;
  rejectPath?: string;
}

export interface ChatConversationRef {
  id: string;
  status: string;
  contextExpiresAt?: string;
}

export type AnswerType =
  | 'ANSWER'
  | 'TOOL_RESULT'
  | 'CONFIRMATION_REQUIRED'
  | 'AUTHENTICATION_REQUIRED'
  | 'FALLBACK'
  | 'RAG';

export interface RagChatResponse {
  answer: string;
  sources?: SourceCitation[];
  grounded?: boolean;
  fallbackReason?: string;
  answerType?: AnswerType;
  conversation?: ChatConversationRef | null;
  proposal?: ToolProposalView | null;
  trace?: AgentTraceStep[];
  confidence?: number;
}

export interface ChatRequest {
  message: string;
  clientMessageId?: string;
}

export interface ChatConversationView {
  id: string;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  title?: string;
  summary?: string;
  lastActiveAt?: string;
  contextExpiresAt?: string;
  archivedAt?: string;
  archiveReason?: string;
}

export interface ChatConversationListView {
  items: ChatConversationView[];
  nextCursor?: string | null;
}

export interface ChatMessageView {
  sequenceNumber: number;
  role: 'USER' | 'ASSISTANT' | 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatMessagePageView {
  items: ChatMessageView[];
  nextBeforeSequence?: number | null;
}

export interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reply?: RagChatResponse;
  createdAt?: string;
  isError?: boolean;
  clientMessageId?: string;
}
