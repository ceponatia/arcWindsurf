import { defineConfig } from 'tsup';
import { baseTsupConfig } from '../../config/tsup.base.js';

export default defineConfig({
  ...baseTsupConfig,
  entry: {
    index: 'src/index.ts',
  },
  outDir: 'dist',
  external: ['react', 'react-dom'],
});
