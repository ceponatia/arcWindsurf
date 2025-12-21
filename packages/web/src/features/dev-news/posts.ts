import type { DevNewsPost } from './types.js';

/**
 * Dev News posts for the Home landing page.
 *
 * Note: For now this is file-backed content (easy to update during alpha).
 * When you later want admin-authored posts, this can be replaced with an API call.
 */
export const DEV_NEWS_POSTS: DevNewsPost[] = [
  {
    id: '2025-12-20-alpha-dev-news',
    title: 'Dev News is live (alpha)',
    publishedAt: '2025-12-20T00:00:00Z',
    summary: 'We now have an in-app feed for updates and release notes.',
    tags: ['alpha', 'ui'],
    body: [
      'Welcome to alpha. This Dev News panel is where we’ll post updates, fixes, and upcoming changes.',
      'If something feels off, please report it - we’re iterating quickly.',
    ],
  },
];

/**
 * Returns posts sorted newest-first.
 */
export function getDevNewsPosts(): DevNewsPost[] {
  return [...DEV_NEWS_POSTS].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
