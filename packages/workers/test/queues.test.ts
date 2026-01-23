import { describe, it, expect, vi } from 'vitest';

const instances: Record<string, { add: ReturnType<typeof vi.fn> }> = {};

vi.mock('bullmq', () => ({
  Queue: class {
    name: string;
    add = vi.fn(async () => ({ id: 'job' }));
    constructor(name: string) {
      this.name = name;
      instances[name] = { add: this.add };
    }
  },
}));

describe('queues', () => {
  it('enqueues cognition/tick/embedding', async () => {
    const { enqueueCognition, enqueueTick, enqueueEmbedding } = await import(
      '../src/queues/index.js'
    );

    await enqueueCognition('s1', 'npc-1', { lastEvents: [], availableTools: [] });
    await enqueueTick('s1', { tickCount: 1, timestamp: Date.now() });
    await enqueueEmbedding('s1', { nodeId: 'n1', text: 'hello' });

    expect(instances.cognition?.add).toHaveBeenCalled();
    expect(instances.tick?.add).toHaveBeenCalled();
    expect(instances.embedding?.add).toHaveBeenCalled();
  });
});
