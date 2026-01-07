import { type Queue } from 'bullmq';
import { type JobData, type TickTask, type JobResult } from '../types.js';

export class Scheduler {
  constructor(private tickQueue: Queue<JobData<TickTask>, JobResult>) {}

  /**
   * Start the recurring world tick job.
   */
  async startWorldTick(sessionId: string, intervalMs = 1000) {
    const jobName = `tick-${sessionId}`;

    // Remove existing repeatable job for this session if any
    const repeatableJobs = await this.tickQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === jobName) {
        await this.tickQueue.removeRepeatableByKey(job.key);
      }
    }

    // Add new repeatable job
    await this.tickQueue.add(
      jobName,
      {
        sessionId,
        payload: {
          tickCount: 0, // This will need to be tracked or derived
          timestamp: Date.now(),
        },
      },
      {
        repeat: {
          every: intervalMs,
        },
        removeOnComplete: true,
      }
    );

    console.log(`[Scheduler] Started world tick for session ${sessionId} every ${intervalMs}ms`);
  }

  /**
   * Stop the recurring world tick job.
   */
  async stopWorldTick(sessionId: string) {
    const jobName = `tick-${sessionId}`;
    const repeatableJobs = await this.tickQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === jobName) {
        await this.tickQueue.removeRepeatableByKey(job.key);
      }
    }
    console.log(`[Scheduler] Stopped world tick for session ${sessionId}`);
  }
}
