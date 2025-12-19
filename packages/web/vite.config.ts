import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  // In this monorepo, env vars live in the repo root `.env`.
  // This makes Vite load `.env`, `.env.local`, etc. from the repo root.
  envDir: path.resolve(__dirname, '../..'),
  // For GitHub Pages project sites, assets must be served from /<repo>/.
  // Set BASE_PATH in CI (or locally) to override.
  base:
    process.env['BASE_PATH'] ??
    (process.env['GITHUB_ACTIONS'] && process.env['GITHUB_REPOSITORY']
      ? `/${process.env['GITHUB_REPOSITORY'].split('/')[1] ?? ''}/`
      : '/'),
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
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // @xyflow/react ships ESM with a "use client" directive (Next.js hint).
        // Rollup warns during bundling even though it's harmless for our build.
        if (
          warning?.code === 'MODULE_LEVEL_DIRECTIVE' &&
          typeof warning.message === 'string' &&
          warning.message.includes('"use client"')
        ) {
          return;
        }

        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
          if (id.includes('/@xyflow/')) return 'vendor-xyflow';
          if (id.includes('/@tanstack/')) return 'vendor-tanstack';
          if (id.includes('/zustand/')) return 'vendor-zustand';

          return 'vendor';
        },
      },
    },
  },
}));
