import { signal, computed } from '@preact/signals-react';
import type { ActorDebugState } from '../types.js';

export const actorStates = signal<Record<string, ActorDebugState>>({});
export const activeActorIds = signal<string[]>([]);

export const updateActorState = (id: string, patch: Partial<ActorDebugState>) => {
  const existingEntry = Object.getOwnPropertyDescriptor(actorStates.value, id);
  const existingValue: unknown = existingEntry?.value;
  const existing =
    typeof existingValue === 'object' && existingValue !== null
      ? (existingValue as ActorDebugState)
      : ({} as ActorDebugState);
  const next = { ...actorStates.value };
  Object.defineProperty(next, id, {
    value: {
      ...existing,
      ...patch,
    },
    writable: true,
    enumerable: true,
    configurable: true,
  });
  actorStates.value = {
    ...next,
  };

  if (!activeActorIds.value.includes(id)) {
    activeActorIds.value = [...activeActorIds.value, id];
  }
};

export const activeActors = computed(() => {
  return activeActorIds.value;
});

export const resetActors = () => {
  actorStates.value = {};
  activeActorIds.value = [];
};
