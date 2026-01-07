import { applyPatch, type Operation } from 'fast-json-patch';
import type { Reducer } from '../types.js';

/**
 * A generic reducer that applies JSON patches.
 * Expected event payload: { type: 'STATE_CHANGE', payload: { patches: Operation[] } }
 * Or: { type: 'STATE_CHANGE', payload: { path: string, value: any } }
 */
export const patchReducer = <S extends object>(state: S, event: any): S => {
  if (event.type !== 'STATE_CHANGE') {
    return state;
  }

  const payload = event.payload || event;

  // Handle single path/value change
  if (payload.path && payload.value !== undefined) {
    const patch: Operation[] = [
      {
        op: 'replace',
        path: payload.path.startsWith('/') ? payload.path : `/${payload.path}`,
        value: payload.value,
      },
    ];
    try {
      const result = applyPatch(state, patch, true, false);
      return result.newDocument as S;
    } catch (err) {
      console.warn('[PatchReducer] Failed to apply single patch:', err, patch);
      return state;
    }
  }

  // Handle multiple patches
  if (Array.isArray(payload.patches)) {
    try {
      const result = applyPatch(state, payload.patches, true, false);
      return result.newDocument as S;
    } catch (err) {
      console.warn('[PatchReducer] Failed to apply multi-patch:', err, payload.patches);
      return state;
    }
  }

  return state;
};
