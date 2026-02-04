import { worldBus } from '@minimal-rpg/bus';
import { TieredCognitionRouter, OpenAIProvider } from '@minimal-rpg/llm';
import { createWorker, getOpenAiWorkerConfig } from './config.js';
import { createCognitionProcessor } from './processors/cognition.js';
import { createTickProcessor } from './processors/tick.js';
import { createEmbeddingProcessor } from './processors/embedding.js';
import { cognitionQueue, tickQueue, embeddingQueue } from './queues/index.js';
import { Scheduler } from './scheduler/index.js';
import { HeartbeatMonitor } from './heartbeat-monitor.js';
import { presenceService, PAUSE_THRESHOLD_MS } from '@minimal-rpg/services';
import {
  listRecentSessionsByHeartbeat,
  listStaleSessionsByHeartbeat,
} from '@minimal-rpg/db/node';

/**
 * Main Worker Entry Point
 */
/**
 * Seed presence tracking from persisted session heartbeats.
 */
async function hydratePresenceFromDatabase(scheduler: Scheduler): Promise<void> {
  const cutoff = new Date(Date.now() - PAUSE_THRESHOLD_MS);
  const staleSessions = await listStaleSessionsByHeartbeat(cutoff);
  const recentSessions = await listRecentSessionsByHeartbeat(cutoff);

  if (staleSessions.length > 0) {
    console.info(`[Presence] Stopping ${staleSessions.length} stale session ticks`);
  }

  for (const session of staleSessions) {
    await scheduler.stopWorldTick(session.id);
  }

  for (const session of recentSessions) {
    const lastHeartbeatAt = session.lastHeartbeatAt;
    if (lastHeartbeatAt) {
      presenceService.seedSession(session.id, lastHeartbeatAt);
    }
  }
}

/**
 * Main Worker Entry Point
 */
async function main(): Promise<{ scheduler: Scheduler; heartbeatMonitor: HeartbeatMonitor }> {
  console.info('Starting Minimal RPG Background Workers...');

  // 1. Initialize dependencies
  const { apiKey, model, baseUrl } = getOpenAiWorkerConfig();

  const provider = new OpenAIProvider({
    id: 'openai',
    apiKey,
    model,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  const llmRouter = new TieredCognitionRouter({
    fast: provider,
    deep: provider,
    reasoning: provider,
  });

  // 2. Initialize Workers
  const cognitionWorker = createWorker('cognition', createCognitionProcessor(worldBus, llmRouter), {
    concurrency: 5,
  });

  const tickWorker = createWorker('tick', createTickProcessor(worldBus), { concurrency: 1 });

  const embeddingWorker = createWorker('embedding', createEmbeddingProcessor(), { concurrency: 2 });

  // 3. Initialize Scheduler
  const scheduler = new Scheduler(tickQueue);
  presenceService.setScheduler(scheduler);

  await hydratePresenceFromDatabase(scheduler).catch((error) => {
    console.warn('[Presence] Failed to hydrate presence from database', error);
  });

  const heartbeatMonitor = new HeartbeatMonitor({
    presence: presenceService,
    scheduler,
    pauseThresholdMs: PAUSE_THRESHOLD_MS,
  });

  heartbeatMonitor.start();

  console.info('Workers initialized and listening for jobs.');

  // Handle shutdown
  const shutdown = async () => {
    console.info('Shutting down workers...');
    heartbeatMonitor.stop();
    await Promise.all([
      cognitionWorker.close(),
      tickWorker.close(),
      embeddingWorker.close(),
      cognitionQueue.close(),
      tickQueue.close(),
      embeddingQueue.close(),
    ]);
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });

  return { scheduler, heartbeatMonitor };
}

// Start if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch((err) => {
    console.error('Failed to start workers:', err);
    process.exit(1);
  });
}

export * from './types.js';
export * from './config.js';
export * from './queues/index.js';
export * from './processors/cognition.js';
export * from './processors/tick.js';
export * from './processors/embedding.js';
export * from './scheduler/index.js';
