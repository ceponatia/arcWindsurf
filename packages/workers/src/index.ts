import { worldBus } from '@minimal-rpg/bus';
import { TieredCognitionRouter, OpenAIProvider } from '@minimal-rpg/llm';
import { createWorker } from './config.js';
import { createCognitionProcessor } from './processors/cognition.js';
import { createTickProcessor } from './processors/tick.js';
import { createEmbeddingProcessor } from './processors/embedding.js';
import { cognitionQueue, tickQueue, embeddingQueue } from './queues/index.js';
import { Scheduler } from './scheduler/index.js';

/**
 * Main Worker Entry Point
 */
function main(): { scheduler: Scheduler } {
  console.log('Starting Minimal RPG Background Workers...');

  // 1. Initialize dependencies
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for workers LLM router');
  }

  const model = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
  const baseURL = process.env['OPENAI_BASE_URL'];

  const provider = new OpenAIProvider({
    id: 'openai',
    apiKey,
    model,
    ...(baseURL ? { baseURL } : {}),
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

  console.log('Workers initialized and listening for jobs.');

  // Handle shutdown
  const shutdown = async () => {
    console.log('Shutting down workers...');
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

  return { scheduler };
}

// Start if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (err) {
    console.error('Failed to start workers:', err);
    process.exit(1);
  }
}

export * from './types.js';
export * from './config.js';
export * from './queues/index.js';
export * from './processors/cognition.js';
export * from './processors/tick.js';
export * from './processors/embedding.js';
export * from './scheduler/index.js';
