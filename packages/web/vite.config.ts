import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkFrontmatter],
      // Note: we keep rehypeSlug so headings get stable IDs, but
      // we intentionally disable rehype-autolink-headings. With
      // hash-based routing (`#/docs/...`), auto-linked headings
      // change the hash to just `#id`, which navigates away from
      // the docs route and back to the app landing page.
      // If you want a heading to be a link, add it manually in MDX.
      rehypePlugins: [rehypeHighlight, rehypeSlug],
    }),
  ],
  resolve: {
    alias: {
      '@minimal-rpg/schemas': path.resolve(__dirname, '../schemas/src'),
      '@minimal-rpg/utils': path.resolve(__dirname, '../utils/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/characters': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/settings': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sessions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
