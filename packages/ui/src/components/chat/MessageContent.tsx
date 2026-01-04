import React from 'react';
import Markdown from 'react-markdown';
import { cn } from '../../lib/utils.js';

export interface MessageContentProps {
  content: string;
  className?: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, className }) => {
  return (
    <div
      className={cn(
        'prose prose-invert prose-base max-w-none w-full text-left break-words overflow-hidden',
        // Customize prose sizing for chat context
        'prose-p:text-base prose-p:leading-relaxed prose-headings:text-left prose-blockquote:text-left',
        className
      )}
    >
      <Markdown
        components={{
          // Ensure paragraphs have proper spacing
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          // Style code blocks
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            return isInline ? (
              <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-sm">{children}</code>
            ) : (
              <code className={codeClassName}>{children}</code>
            );
          },
          // Style pre blocks for code
          pre: ({ children }) => (
            <pre className="bg-slate-800/70 rounded-lg p-3 overflow-x-auto text-sm">{children}</pre>
          ),
          // Lists
          ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
          // Blockquotes for dialogue or emphasis
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-violet-500/50 pl-3 italic text-slate-300">
              {children}
            </blockquote>
          ),
          // Strong/bold
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-100">{children}</strong>
          ),
          // Emphasis/italic
          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
