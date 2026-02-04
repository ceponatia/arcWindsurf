import { getRecordOptional, setRecord } from '@minimal-rpg/schemas';
import type { Reducer, Projection } from '../types.js';
import { DEFAULT_START_TIME, createDefaultNpcLocationState } from '@minimal-rpg/schemas';
import type { NpcLocationState } from '@minimal-rpg/schemas';

export interface NpcState {
  id: string;
  location: NpcLocationState;
  health: {
    current: number;
    max: number;
  };
  status: 'alive' | 'dead';
  inventory: string[]; // item IDs
}

export type NpcsState = Record<string, NpcState>;

export const initialNpcsState: NpcsState = {};

export const npcReducer: Reducer<NpcsState> = (state, event) => {
  switch (event.type) {
    case 'ACTOR_SPAWN': {
      if (event.actorType !== 'npc') return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        id: event.actorId,
        location: createDefaultNpcLocationState(event.locationId, DEFAULT_START_TIME),
        health: { current: 100, max: 100 },
        status: 'alive',
        inventory: [],
      });
      return nextState;
    }

    case 'ACTOR_DESPAWN': {
      const actorId = event.actorId;
      const nextState = Object.fromEntries(
        Object.entries(state).filter(([key]) => key !== actorId)
      ) as NpcsState;
      return nextState;
    }

    case 'MOVED': {
      const npc = getRecordOptional(state, event.actorId);
      if (!npc) return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        ...npc,
        location: {
          ...npc.location,
          locationId: event.toLocationId,
        },
      });
      return nextState;
    }

    case 'DAMAGED': {
      const npc = getRecordOptional(state, event.actorId);
      if (!npc) return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        ...npc,
        health: {
          ...npc.health,
          current: Math.max(0, npc.health.current - event.amount),
        },
      });
      return nextState;
    }

    case 'HEALED': {
      const npc = getRecordOptional(state, event.actorId);
      if (!npc) return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        ...npc,
        health: {
          ...npc.health,
          current: Math.min(npc.health.max, npc.health.current + event.amount),
        },
      });
      return nextState;
    }

    case 'DIED': {
      const npc = getRecordOptional(state, event.actorId);
      if (!npc) return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        ...npc,
        status: 'dead',
        health: { ...npc.health, current: 0 },
      });
      return nextState;
    }

    case 'ITEM_ACQUIRED': {
      const npc = getRecordOptional(state, event.actorId);
      if (!npc) return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        ...npc,
        inventory: [...npc.inventory, event.itemId],
      });
      return nextState;
    }

    case 'ITEM_DROPPED': {
      const npc = getRecordOptional(state, event.actorId);
      if (!npc) return state;
      const nextState = { ...state };
      setRecord(nextState, event.actorId, {
        ...npc,
        inventory: npc.inventory.filter((id) => id !== event.itemId),
      });
      return nextState;
    }

    default:
      return state;
  }
};

export const npcProjection: Projection<NpcsState> = {
  name: 'npcs',
  reducer: npcReducer,
  initialState: initialNpcsState,
};
