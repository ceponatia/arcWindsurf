import { type Processor } from 'bullmq';
import { type JobData, type EmbeddingTask, type JobResult } from '../types.js';

/**
 * Creates a processor for embedding generation.
 */
export const createEmbeddingProcessor = (): Processor<JobData<EmbeddingTask>, JobResult> => {
  return async (job) => {
    const { payload } = job.data;
    const { nodeId, text } = payload;

    try {
      console.log(`[EmbeddingProcessor] Generating embedding for node ${nodeId}`);
      // In a real implementation, this would call an embedding service (e.g. OpenAI)
      // and update the knowledge_nodes table in Postgres.

      // Mock duration
      await new Promise((resolve) => setTimeout(resolve, 200));

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
};
