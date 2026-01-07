import { signal, computed } from '@preact/signals-react';

// Using unknown for now, refactor to proper NpcState from @minimal-rpg/schemas later
export const actorStates = signal<Record<string, any>>({});
export const activeActorIds = signal<string[]>([]);

export const updateActorState = (id: string, state: any) => {
  actorStates.value = {
    ...actorStates.value,
    [id]: state,
  };

  if (!activeActorIds.value.includes(id)) {
    activeActorIds.value = [...activeActorIds.value, id];
  }
};

export const activeActors = computed(() => {
  return activeActorIds.value.map((id) => actorStates.value[id]).filter(Boolean);
});

export const resetActors = () => {
  actorStates.value = {};
  activeActorIds.value = [];
};
