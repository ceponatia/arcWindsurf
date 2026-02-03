import type { ReactNode } from 'react';
import type { Speaker } from '@minimal-rpg/schemas';

/**
 * Speaker metadata for assistant messages.
 * Re-exported from @minimal-rpg/schemas for backward compatibility.
 */
export type ChatViewSpeaker = Speaker;

export interface ChatViewMessage {
  role: string;
  content: string;
  idx?: number;
  speaker?: ChatViewSpeaker;
}

export interface ChatViewProps {
  messages: ChatViewMessage[];
  loading?: boolean;
  error?: string | null;
  draft: string;
  sending?: boolean;
  disabled?: boolean;
  editingIdx: number | null;
  editDraft: string;
  inputAccessory?: ReactNode;
  onDraftChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onStartEdit: (idx: number, currentContent: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (idx: number) => void | Promise<void>;
  onDeleteMessage: (idx: number) => void | Promise<void>;
  onRedo?: (idx: number) => void | Promise<void>;
  renderAfterMessage?: (message: ChatViewMessage, index: number) => ReactNode;
  /** If true, auto-scroll to bottom when messages change (default: true) */
  autoScroll?: boolean;
}

export interface MessageContentProps {
  content: string;
  className?: string;
}
