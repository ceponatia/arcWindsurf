import { applyPatch, type Operation } from 'fast-json-patch';

/**
 * A generic reducer that applies JSON patches.
 * Expected event payload: { type: 'STATE_CHANGE', payload: { patches: Operation[] } }
 * Or: { type: 'STATE_CHANGE', payload: { path: string, value: any } }
 */
interface PatchEvent {
  type: 'STATE_CHANGE';
  payload?: unknown;
  path?: string;
  value?: unknown;
  patches?: readonly Operation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasOwn<K extends PropertyKey>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<string, unknown> & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPatchEvent(event: unknown): event is PatchEvent & Record<string, unknown> {
  if (!isRecord(event)) return false;
  if (!hasOwn(event, 'type')) return false;
  if (event.type !== 'STATE_CHANGE') return false;

  if (!hasOwn(event, 'payload')) return true;
  const payload = event.payload;
  if (payload === undefined) return true;
  return isRecord(payload);
}

function isOperationArray(value: unknown): value is readonly Operation[] {
  if (!Array.isArray(value)) return false;

  return value.every((entry) => {
    if (!isRecord(entry)) return false;
    return typeof entry['op'] === 'string' && typeof entry['path'] === 'string';
  });
}

export const patchReducer = <S extends object>(state: S, event: unknown): S => {
  if (!isPatchEvent(event)) return state;

  const payloadCandidate: Record<string, unknown> = isRecord(event.payload) ? event.payload : event;

  // Handle single path/value change
  if (
    typeof payloadCandidate['path'] === 'string' &&
    Object.prototype.hasOwnProperty.call(payloadCandidate, 'value')
  ) {
    const rawPath = payloadCandidate['path'];
    const rawValue = payloadCandidate['value'];

    const patch: Operation[] = [
      {
        op: 'replace',
        path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`,
        value: rawValue,
      },
    ];
    try {
      const result = applyPatch(state, patch, true, false);
      return result.newDocument;
    } catch (err) {
      console.warn('[PatchReducer] Failed to apply single patch:', err, patch);
      return state;
    }
  }

  // Handle multiple patches
  if (isOperationArray(payloadCandidate['patches'])) {
    try {
      const result = applyPatch(state, payloadCandidate['patches'], true, false);
      return result.newDocument;
    } catch (err) {
      console.warn('[PatchReducer] Failed to apply multi-patch:', err, payloadCandidate['patches']);
      return state;
    }
  }

  return state;
};
