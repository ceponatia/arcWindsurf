import { signal, computed } from '@preact/signals-react';
import type { ActorDebugState } from '../types.js';

export const actorStates = signal<Record<string, ActorDebugState>>({});
export const activeActorIds = signal<string[]>([]);

export const updateActorState = (id: string, patch: Partial<ActorDebugState>) => {
  actorStates.value = {
    ...actorStates.value,
    [id]: {
      ...actorStates.value[id],
      ...patch,
    },
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
