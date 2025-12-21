import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDevNewsPosts } from './posts.js';
import type { DevNewsPost } from './types.js';
import type { Components } from 'react-markdown';

/**
 * Formats an ISO date string into a friendly, locale-aware label.
 */
function formatPublishedAt(publishedAt: string): string {
  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return publishedAt;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

/**
 * Normalizes a post body into a single Markdown string.
 */
function normalizeMarkdown(body: DevNewsPost['body']): string {
  if (Array.isArray(body)) {
    return body.join('\n\n');
  }

  return body;
}

const MARKDOWN_COMPONENTS: Components = {
  a: ({ children, href, ...props }) => (
    <a {...props} href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

interface DevNewsProps {
  className?: string;
  maxHeightClassName?: string;
}

export const DevNews: React.FC<DevNewsProps> = ({
  className,
  maxHeightClassName = 'max-h-[420px]',
}) => {
  const posts: DevNewsPost[] = getDevNewsPosts();

  return (
    <section
      aria-label="Dev News"
      className={
        className ?? 'rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm overflow-hidden'
      }
    >
      <header className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-slate-800">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">Dev News</h2>
          <p className="text-xs text-slate-400">Updates and release notes (alpha)</p>
        </div>
        <div className="shrink-0 text-[11px] text-slate-500">Newest first</div>
      </header>

      <div className={`${maxHeightClassName} overflow-y-auto custom-scrollbar p-4`}>
        {posts.length === 0 ? (
          <div className="text-sm text-slate-400">No updates yet.</div>
        ) : (
          <ol className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <article className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-100 truncate">
                        {post.title}
                      </h3>
                      {post.summary ? (
                        <p className="mt-1 text-xs text-slate-400">{post.summary}</p>
                      ) : null}
                    </div>
                    <time
                      dateTime={post.publishedAt}
                      className="shrink-0 text-[11px] text-slate-500"
                    >
                      {formatPublishedAt(post.publishedAt)}
                    </time>
                  </div>

                  {post.tags && post.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 text-sm text-slate-200">
                    <div className="prose prose-invert prose-slate max-w-none prose-a:text-violet-300 hover:prose-a:text-violet-200 prose-code:text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                        {normalizeMarkdown(post.body)}
                      </ReactMarkdown>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};
