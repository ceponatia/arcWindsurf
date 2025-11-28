import React from 'react';
import { cn } from '../lib/utils.js';

export interface MessageContentProps {
  content: string;
  className?: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, className }) => {
  // For now, we just preserve whitespace using CSS.
  // This ensures line breaks from the LLM or user edits are respected.
  // In the future, we can replace this with a Markdown parser.
  return <div className={cn('whitespace-pre-wrap', className)}>{content}</div>;
};
