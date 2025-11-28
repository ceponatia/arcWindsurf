import { type Operation } from 'fast-json-patch';

export interface StateManagerConfig {
  // Future config
}

export interface StateMergeResult<T> {
  effective: T;
}

export interface StatePatchResult<T> {
  newOverrides: Partial<T>;
}
