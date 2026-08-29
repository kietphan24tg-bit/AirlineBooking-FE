import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type {
  AgentTraceStep,
  SourceCitation,
  ToolProposalView,
} from '../../types/chatbot.types';

interface SourcesSectionProps {
  sources?: SourceCitation[];
}

export function SourcesSection({ sources }: SourcesSectionProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-outline-variant/30 pt-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 font-semibold text-on-surface-variant hover:text-primary transition-colors"
        aria-expanded={open}
      >
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span>Nguồn tham khảo ({sources.length})</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 pl-1">
          {sources.map((source, index) => {
            const fileName = source.sourceFile ?? 'Tài liệu chính sách';
            const path = source.headingPath ? ` > ${source.headingPath}` : '';
            return (
              <li
                key={`${fileName}-${index}`}
                className="flex items-start gap-1.5 text-on-surface-variant/90 bg-surface/50 p-1.5 rounded-md border border-outline-variant/20"
              >
                <span className="font-mono text-[10px] text-primary font-bold">[{index + 1}]</span>
                <span className="break-words">
                  <span className="font-medium text-on-surface">{fileName}</span>
                  {path && <span className="text-on-surface-variant/70">{path}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ToolResultCardProps {
  answer: string;
  trace?: AgentTraceStep[];
}

export function ToolResultCard({ answer, trace }: ToolResultCardProps) {
  const [showTrace, setShowTrace] = useState(false);

  return (
    <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs shadow-xs">
      <div className="flex items-start gap-2">
        <Wrench className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-primary">Thông tin hệ thống</p>
          <p className="text-on-surface whitespace-pre-wrap">{answer}</p>
        </div>
      </div>

      {trace && trace.length > 0 && (
        <div className="mt-2 pt-2 border-t border-primary/10">
          <button
            type="button"
            onClick={() => setShowTrace((prev) => !prev)}
            className="text-[11px] text-primary/80 font-medium hover:underline flex items-center gap-1"
          >
            {showTrace ? 'Ẩn chi tiết xử lý' : 'Xem chi tiết xử lý'}
            {showTrace ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showTrace && (
            <div className="mt-1.5 space-y-1 bg-surface-lowest p-2 rounded-md border border-outline-variant/20">
              {trace.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      step.status === 'ok'
                        ? 'bg-emerald-500'
                        : step.status === 'blocked'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-medium">{step.label}</span>
                  {step.tool && (
                    <span className="font-mono text-[10px] bg-surface-variant/60 px-1 py-0.5 rounded text-on-surface-variant">
                      {step.tool}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AuthRequiredCardProps {
  answer: string;
}

export function AuthRequiredCard({ answer }: AuthRequiredCardProps) {
  return (
    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs">
      <div className="flex items-start gap-2.5">
        <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Yêu cầu đăng nhập</p>
          <p className="text-amber-800 dark:text-amber-300">{answer}</p>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/login';
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 transition-colors shadow-xs"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: ToolProposalView;
  onConfirm: (proposal: ToolProposalView) => Promise<void>;
  onReject: (proposal: ToolProposalView) => Promise<void>;
}

export function ProposalCard({ proposal, onConfirm, onReject }: ProposalCardProps) {
  const [loading, setLoading] = useState<'confirm' | 'reject' | null>(null);

  const handleConfirm = async () => {
    setLoading('confirm');
    try {
      await onConfirm(proposal);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      await onReject(proposal);
    } finally {
      setLoading(null);
    }
  };

  const status = proposal.status ? proposal.status.toUpperCase() : 'PENDING';
  const isPending = status === 'PENDING';

  return (
    <div className="mt-3 rounded-xl border border-secondary/40 bg-secondary-fixed/20 p-3.5 text-xs shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-on-surface flex items-center gap-1.5">
          <Wrench className="h-4 w-4 text-primary" />
          Yêu cầu xác nhận thao tác
        </span>
        <span
          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
            isPending
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : status === 'CONFIRMED'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
          }`}
        >
          {isPending ? 'Chờ xác nhận' : status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã từ chối'}
        </span>
      </div>

      <p className="text-on-surface font-medium">{proposal.summary ?? 'Vui lòng xác nhận để tiếp tục thao tác.'}</p>

      {proposal.details && Object.keys(proposal.details).length > 0 && (
        <div className="bg-surface-lowest/80 p-2.5 rounded-lg border border-outline-variant/30 space-y-1">
          {Object.entries(proposal.details).map(([key, val]) => (
            <div key={key} className="flex justify-between text-[11px] gap-2">
              <span className="text-on-surface-variant capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
              <span className="font-semibold text-on-surface text-right">{String(val)}</span>
            </div>
          ))}
        </div>
      )}

      {isPending ? (
        <div className="pt-1 flex gap-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleReject()}
            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 font-medium text-on-surface hover:bg-surface-variant/40 disabled:opacity-50 transition-colors"
          >
            {loading === 'reject' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-error" />
            )}
            Từ chối
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleConfirm()}
            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading === 'confirm' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            )}
            Xác nhận
          </button>
        </div>
      ) : (
        <div className="pt-1 text-[11px] font-semibold flex items-center gap-1.5">
          {status === 'CONFIRMED' ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Đã thực thi thao tác
            </span>
          ) : (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Thao tác đã bị hủy
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ErrorCardProps {
  error: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorCard({ error, onRetry, onClose }: ErrorCardProps) {
  return (
    <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-error mt-0.5" />
          <p className="font-medium text-error">{error}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-error/70 hover:text-error text-xs underline shrink-0"
          >
            Đóng
          </button>
        )}
      </div>

      {onRetry && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md bg-error px-2.5 py-1 text-xs font-semibold text-white hover:bg-error/90 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
