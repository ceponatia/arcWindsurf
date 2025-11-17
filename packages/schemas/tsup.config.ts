import { defineConfig } from 'tsup';
import { baseTsupConfig } from '../../config/tsup.base.js';

export default defineConfig({
  ...baseTsupConfig,
  entry: {
    index: 'src/index.ts',
    character: 'src/character/index.ts',
    setting: 'src/setting/index.ts',
  },
  outDir: 'dist',
});
