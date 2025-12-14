import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@minimal-rpg/schemas': '../schemas/src',
      '@minimal-rpg/ui': '../ui/src',
      '@minimal-rpg/utils': '../utils/src',
    },
  },
});
