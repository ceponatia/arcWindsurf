// tsup.base.ts
import type { Options } from 'tsup';

export const baseTsupConfig: Options = {
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2023',
};
