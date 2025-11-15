import { defineConfig } from 'vite';

export default defineConfig({
  server: {
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
