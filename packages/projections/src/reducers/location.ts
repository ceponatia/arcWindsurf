import type { WorldEvent } from '@minimal-rpg/bus';
import type { Reducer, Projection } from '../types.js';

export interface LocationState {
  id: string;
  actors: string[]; // actor IDs
  items: string[]; // item IDs
}

export type LocationsState = Record<string, LocationState>;

export const initialLocationsState: LocationsState = {};

export const locationReducer: Reducer<LocationsState> = (state, event) => {
  const payload = event as any;

  switch (event.type) {
    case 'ACTOR_SPAWN': {
      const locId = payload.locationId;
      if (!locId) return state;
      const current = state[locId] || { id: locId, actors: [], items: [] };
      return {
        ...state,
        [locId]: {
          ...current,
          actors: [...new Set([...current.actors, payload.actorId])],
        },
      };
    }

    case 'ACTOR_DESPAWN': {
      const actorId = payload.actorId;
      const newState = { ...state };
      for (const id in newState) {
        if (newState[id]) {
          newState[id] = {
            ...newState[id],
            actors: newState[id].actors.filter((aId) => aId !== actorId),
          };
        }
      }
      return newState;
    }

    case 'MOVED': {
      const newState = { ...state };
      const { actorId, fromLocationId, toLocationId } = payload;

      if (fromLocationId && newState[fromLocationId]) {
        newState[fromLocationId] = {
          ...newState[fromLocationId],
          actors: newState[fromLocationId].actors.filter((id) => id !== actorId),
        };
      }

      const toLoc = newState[toLocationId] || { id: toLocationId, actors: [], items: [] };
      newState[toLocationId] = {
        ...toLoc,
        actors: [...new Set([...toLoc.actors, actorId])],
      };

      return newState;
    }

    case 'ITEM_ACQUIRED': {
      // Scan all locations to remove the item
      const newState = { ...state };
      for (const id in newState) {
        if (newState[id]) {
          newState[id] = {
            ...newState[id],
            items: newState[id].items.filter((iId) => iId !== payload.itemId),
          };
        }
      }
      return newState;
    }

    case 'ITEM_DROPPED': {
      const locId = payload.locationId;
      if (!locId) return state;
      const current = state[locId] || { id: locId, actors: [], items: [] };
      return {
        ...state,
        [locId]: {
          ...current,
          items: [...new Set([...current.items, payload.itemId])],
        },
      };
    }

    default:
      return state;
  }
};

export const locationProjection: Projection<LocationsState> = {
  name: 'location',
  reducer: locationReducer,
  initialState: initialLocationsState,
};
