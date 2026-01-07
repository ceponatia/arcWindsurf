import type { WorldEvent } from '@minimal-rpg/schemas';

/**
 * Generic wrapper for BullMQ job payloads.
 */
export interface JobData<T> {
  sessionId: string;
  payload: T;
  metadata?: Record<string, unknown>;
}

/**
 * Standardized configuration interface for all worker processes.
 */
export interface WorkerConfig {
  concurrency: number;
  limiter?: {
    max: number;
    duration: number;
  };
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

/**
 * Standardized return type for completed jobs to log metrics.
 */
export interface JobResult {
  success: boolean;
  message?: string;
  eventsEmitted?: number;
  error?: string;
  metrics?: {
    durationMs: number;
    cpuTime?: number;
  };
}

/**
 * Specific payload for Cognition tasks
 */
export interface CognitionTask {
  actorId: string;
  context: {
    lastEvents: WorldEvent[];
    availableTools: string[];
    memoryContext?: string;
  };
}

/**
 * Specific payload for Tick tasks
 */
export interface TickTask {
  timestamp: number;
  tickCount: number;
}

/**
 * Specific payload for Embedding tasks
 */
export interface EmbeddingTask {
  nodeId: string;
  text: string;
}
