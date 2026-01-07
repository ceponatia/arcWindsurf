import { Queue } from 'bullmq';
import { connection } from '../config.js';
import type { JobData, CognitionTask, TickTask, EmbeddingTask, JobResult } from '../types.js';

/**
 * Queue for NPC cognition tasks (LLM processing)
 */
export const cognitionQueue = new Queue<JobData<CognitionTask>, JobResult>('cognition', {
  connection,
});

/**
 * Queue for simulation ticks
 */
export const tickQueue = new Queue<JobData<TickTask>, JobResult>('tick', {
  connection,
});

/**
 * Queue for embedding generation
 */
export const embeddingQueue = new Queue<JobData<EmbeddingTask>, JobResult>('embedding', {
  connection,
});

/**
 * Helper to enqueue a cognition task
 */
export const enqueueCognition = (
  sessionId: string,
  actorId: string,
  context: CognitionTask['context']
) => {
  return cognitionQueue.add(
    'think',
    {
      sessionId,
      payload: { actorId, context },
    },
    {
      priority: 1, // High priority for active NPCs
      removeOnComplete: true,
    }
  );
};

/**
 * Helper to enqueue a simulation tick
 */
export const enqueueTick = (sessionId: string, tick: TickTask) => {
  return tickQueue.add(
    'tick',
    {
      sessionId,
      payload: tick,
    },
    {
      removeOnComplete: true,
    }
  );
};

/**
 * Helper to enqueue an embedding task
 */
export const enqueueEmbedding = (sessionId: string, task: EmbeddingTask) => {
  return embeddingQueue.add(
    'embed',
    {
      sessionId,
      payload: task,
    },
    {
      removeOnComplete: true,
    }
  );
};
