import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveFromRoot = (relativePath: string) => resolve(__dirname, relativePath);

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
      '@minimal-rpg/schemas': resolveFromRoot('../schemas/src'),
      '@minimal-rpg/ui': resolveFromRoot('../ui/src'),
      '@minimal-rpg/utils': resolveFromRoot('../utils/src'),
    },
  },
});
