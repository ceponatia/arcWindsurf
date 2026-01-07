import {
  Worker,
  type ConnectionOptions,
  type Processor,
  type WorkerOptions,
  type Job,
} from 'bullmq';
import type { JobResult } from './types.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

const getBullMqConnectionOptions = (redisUrl: string): ConnectionOptions => {
  const url = new URL(redisUrl);

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`Unsupported REDIS_URL protocol: ${url.protocol}`);
  }

  const port = url.port.length > 0 ? Number(url.port) : 6379;
  if (Number.isNaN(port)) {
    throw new Error(`Invalid REDIS_URL port: ${url.port}`);
  }

  const username = url.username.length > 0 ? decodeURIComponent(url.username) : undefined;
  const password = url.password.length > 0 ? decodeURIComponent(url.password) : undefined;

  return {
    host: url.hostname,
    port,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
};

/**
 * Standard Redis connection options for BullMQ.
 */
export const connection: ConnectionOptions = getBullMqConnectionOptions(REDIS_URL);

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
      connection,
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
