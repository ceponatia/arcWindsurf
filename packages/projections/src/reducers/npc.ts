import type { WorldEvent } from '@minimal-rpg/bus';
import type { Reducer, Projection } from '../types.js';
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
  const payload = event as any;

  switch (event.type) {
    case 'ACTOR_SPAWN':
      if (payload.actorType !== 'npc') return state;
      return {
        ...state,
        [payload.actorId]: {
          id: payload.actorId,
          location: {
            locationId: payload.locationId,
            arrivedAt: new Date(),
            position: { x: 0, y: 0, z: 0 },
          },
          health: { current: 100, max: 100 },
          status: 'alive',
          inventory: [],
        },
      };

    case 'ACTOR_DESPAWN': {
      const actorId = payload.actorId;
      const newState = { ...state };
      delete newState[actorId];
      return newState;
    }

    case 'MOVED': {
      const npc = state[payload.actorId];
      if (!npc) return state;
      return {
        ...state,
        [payload.actorId]: {
          ...npc,
          location: {
            ...npc.location,
            locationId: payload.toLocationId,
            arrivedAt: (event as any).timestamp || new Date(),
          },
        },
      };
    }

    case 'DAMAGED':
      if (!state[payload.actorId]) return state;
      return {
        ...state,
        [payload.actorId]: {
          ...state[payload.actorId]!,
          health: {
            ...state[payload.actorId]!.health,
            current: Math.max(0, state[payload.actorId]!.health.current - payload.amount),
          },
        },
      };

    case 'HEALED':
      if (!state[payload.actorId]) return state;
      return {
        ...state,
        [payload.actorId]: {
          ...state[payload.actorId]!,
          health: {
            ...state[payload.actorId]!.health,
            current: Math.min(
              state[payload.actorId]!.health.max,
              state[payload.actorId]!.health.current + payload.amount
            ),
          },
        },
      };

    case 'DIED':
      if (!state[payload.actorId]) return state;
      return {
        ...state,
        [payload.actorId]: {
          ...state[payload.actorId]!,
          status: 'dead',
          health: { ...state[payload.actorId]!.health, current: 0 },
        },
      };

    case 'ITEM_ACQUIRED':
      if (!state[payload.actorId]) return state;
      return {
        ...state,
        [payload.actorId]: {
          ...state[payload.actorId]!,
          inventory: [...state[payload.actorId]!.inventory, payload.itemId],
        },
      };

    case 'ITEM_DROPPED':
      if (!state[payload.actorId]) return state;
      return {
        ...state,
        [payload.actorId]: {
          ...state[payload.actorId]!,
          inventory: state[payload.actorId]!.inventory.filter((id) => id !== payload.itemId),
        },
      };

    default:
      return state;
  }
};

export const npcProjection: Projection<NpcsState> = {
  name: 'npcs',
  reducer: npcReducer,
  initialState: initialNpcsState,
};
