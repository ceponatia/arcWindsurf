// tsup.base.ts
import type { Options } from 'tsup';

export const baseTsupConfig: Options = {
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  target: 'es2023',
};
