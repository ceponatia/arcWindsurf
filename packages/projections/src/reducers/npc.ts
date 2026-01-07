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
    case 'ACTOR_SPAWN':
      if (event.actorType !== 'npc') return state;
      return {
        ...state,
        [event.actorId]: {
          id: event.actorId,
          location: createDefaultNpcLocationState(event.locationId, DEFAULT_START_TIME),
          health: { current: 100, max: 100 },
          status: 'alive',
          inventory: [],
        },
      };

    case 'ACTOR_DESPAWN': {
      const actorId = event.actorId;
      const newState = { ...state };
      delete newState[actorId];
      return newState;
    }

    case 'MOVED': {
      const npc = state[event.actorId];
      if (!npc) return state;
      return {
        ...state,
        [event.actorId]: {
          ...npc,
          location: {
            ...npc.location,
            locationId: event.toLocationId,
          },
        },
      };
    }

    case 'DAMAGED': {
      const npc = state[event.actorId];
      if (!npc) return state;
      return {
        ...state,
        [event.actorId]: {
          ...npc,
          health: {
            ...npc.health,
            current: Math.max(0, npc.health.current - event.amount),
          },
        },
      };
    }

    case 'HEALED': {
      const npc = state[event.actorId];
      if (!npc) return state;
      return {
        ...state,
        [event.actorId]: {
          ...npc,
          health: {
            ...npc.health,
            current: Math.min(npc.health.max, npc.health.current + event.amount),
          },
        },
      };
    }

    case 'DIED': {
      const npc = state[event.actorId];
      if (!npc) return state;
      return {
        ...state,
        [event.actorId]: {
          ...npc,
          status: 'dead',
          health: { ...npc.health, current: 0 },
        },
      };
    }

    case 'ITEM_ACQUIRED': {
      const npc = state[event.actorId];
      if (!npc) return state;
      return {
        ...state,
        [event.actorId]: {
          ...npc,
          inventory: [...npc.inventory, event.itemId],
        },
      };
    }

    case 'ITEM_DROPPED': {
      const npc = state[event.actorId];
      if (!npc) return state;
      return {
        ...state,
        [event.actorId]: {
          ...npc,
          inventory: npc.inventory.filter((id) => id !== event.itemId),
        },
      };
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
