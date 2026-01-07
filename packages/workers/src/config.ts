import { Redis } from 'ioredis';
import { Worker, type Processor, type WorkerOptions, type Job } from 'bullmq';
import type { JobResult } from './types.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

/**
 * Standard Redis connection for BullMQ
 */
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * HOF factory to ensure consistent error handling and logging stats for all queues.
 */
export function createWorker<T, R extends JobResult = JobResult>(
  queueName: string,
  processor: Processor<T, R>,
  options: Partial<WorkerOptions> = {}
): Worker<T, R> {
  const worker = new Worker<T, R>(
    queueName,
    async (job: Job<T, R>) => {
      const start = Date.now();
      try {
        console.log(`[Worker:${queueName}] Processing job ${job.id}`);
        const result = await processor(job);
        const duration = Date.now() - start;

        if (result.success) {
          console.log(`[Worker:${queueName}] Job ${job.id} completed in ${duration}ms`);
        } else {
          console.error(`[Worker:${queueName}] Job ${job.id} failed: ${result.error}`);
        }

        return {
          ...result,
          metrics: {
            ...result.metrics,
            durationMs: duration,
          },
        } as R;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`[Worker:${queueName}] Job ${job.id} crashed after ${duration}ms:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metrics: {
            durationMs: duration,
          },
        } as R;
      }
    },
    {
      connection: connection as any,
      ...options,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker:${queueName}] Job ${job?.id} failed with error:`, err);
  });

  worker.on('error', (err) => {
    console.error(`[Worker:${queueName}] Worker error:`, err);
  });

  return worker;
}
