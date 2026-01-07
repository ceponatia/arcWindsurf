import type { WorldEvent } from '@minimal-rpg/bus';

/**
 * A Reducer is a pure function that takes the current state and an event,
 * and returns the new state.
 */
export type Reducer<S> = (currentState: S, event: WorldEvent) => S;

/**
 * A Projection defines a named domain of state and how it is updated by events.
 */
export interface Projection<S> {
  name: string;
  reducer: Reducer<S>;
  initialState: S;
}

/**
 * Lightweight metadata for listing snapshots without loading state.
 */
export interface SnapshotHeader {
  sessionId: string;
  sequence: bigint;
  timestamp: Date;
  version: number;
}

/**
 * Type for processing events in bulk for replay optimization.
 */
export interface EventBatch {
  sessionId: string;
  events: WorldEvent[];
  startSequence: bigint;
  endSequence: bigint;
}

/**
 * Configuration for Projector.replay()
 */
export interface ReplayOptions {
  untilSeq?: bigint;
  fastForward?: boolean;
  batchSize?: number;
}

/**
 * Metadata for state changes, identifying the initiator.
 * Reused from legacy state-manager.
 */
export type StateChangeSource =
  | { type: 'agent'; agentType: string }
  | { type: 'user'; userId?: string }
  | { type: 'system'; reason: string };

/**
 * A complete state container used for persistence and audit trails.
 * Reused from legacy state-manager.
 */
export interface StateSnapshot<T> {
  baseline: T; // The immutable template
  overrides: Partial<T>; // Current session-specific modifications
  effective: T; // The final computed state (merged)
  createdAt: Date;
  sequence: bigint; // Sequence number from the event log
  version: number; // Version for optimistic concurrency
}
