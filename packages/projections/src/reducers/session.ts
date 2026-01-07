import type { WorldEvent } from '@minimal-rpg/bus';
import type { Reducer, Projection } from '../types.js';

export interface SessionState {
  status: 'active' | 'inactive';
  currentTick: number;
  startTime?: Date;
  endTime?: Date;
}

export const initialSessionState: SessionState = {
  status: 'inactive',
  currentTick: 0,
};

export const sessionReducer: Reducer<SessionState> = (state, event) => {
  switch (event.type) {
    case 'SESSION_START':
      return {
        ...state,
        status: 'active',
        startTime: new Date(),
        currentTick: 0,
      };

    case 'SESSION_END':
      return {
        ...state,
        status: 'inactive',
        endTime: new Date(),
      };

    case 'TICK':
      return {
        ...state,
        currentTick: (event as any).tick,
      };

    default:
      return state;
  }
};

export const sessionProjection: Projection<SessionState> = {
  name: 'session',
  reducer: sessionReducer,
  initialState: initialSessionState,
};
