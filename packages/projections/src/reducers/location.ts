import type { Reducer, Projection } from '../types.js';

export interface LocationState {
  id: string;
  actors: string[]; // actor IDs
  items: string[]; // item IDs
}

export type LocationsState = Record<string, LocationState>;

export const initialLocationsState: LocationsState = {};

export const locationReducer: Reducer<LocationsState> = (state, event) => {
  switch (event.type) {
    case 'ACTOR_SPAWN': {
      const locId = event.locationId;
      const current = state[locId] ?? { id: locId, actors: [], items: [] };
      return {
        ...state,
        [locId]: {
          ...current,
          actors: [...new Set([...current.actors, event.actorId])],
        },
      };
    }

    case 'ACTOR_DESPAWN': {
      const actorId = event.actorId;
      const newState = { ...state };
      for (const [id, location] of Object.entries(newState)) {
        newState[id] = {
          ...location,
          actors: location.actors.filter((aId) => aId !== actorId),
        };
      }
      return newState;
    }

    case 'MOVED': {
      const newState = { ...state };
      const { actorId, fromLocationId, toLocationId } = event;

      if (newState[fromLocationId]) {
        newState[fromLocationId] = {
          ...newState[fromLocationId],
          actors: newState[fromLocationId].actors.filter((id) => id !== actorId),
        };
      }

      const toLoc = newState[toLocationId] ?? { id: toLocationId, actors: [], items: [] };
      newState[toLocationId] = {
        ...toLoc,
        actors: [...new Set([...toLoc.actors, actorId])],
      };

      return newState;
    }

    case 'ITEM_ACQUIRED': {
      // Scan all locations to remove the item
      const newState = { ...state };
      for (const [id, location] of Object.entries(newState)) {
        newState[id] = {
          ...location,
          items: location.items.filter((iId) => iId !== event.itemId),
        };
      }
      return newState;
    }

    case 'ITEM_DROPPED': {
      const locId = Object.values(state).find((location) =>
        location.actors.includes(event.actorId)
      )?.id;

      if (!locId) {
        return state;
      }

      const current = state[locId] ?? { id: locId, actors: [], items: [] };
      return {
        ...state,
        [locId]: {
          ...current,
          items: [...new Set([...current.items, event.itemId])],
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
