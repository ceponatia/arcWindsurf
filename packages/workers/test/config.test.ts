import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('bullmq', () => ({
  Worker: class {
    name: string;
    processor: (job: { id: string }) => Promise<unknown>;
    options: Record<string, unknown>;
    handlers: Record<string, unknown> = {};

    constructor(name: string, processor: (job: { id: string }) => Promise<unknown>, options: Record<string, unknown>) {
      this.name = name;
      this.processor = processor;
      this.options = options;
    }

    on(event: string, handler: unknown) {
      this.handlers[event] = handler;
    }
  },
}));

afterEach(() => {
  vi.resetModules();
  delete process.env['REDIS_URL'];
});

describe('workers config', () => {
  it('builds connection from REDIS_URL', async () => {
    process.env['REDIS_URL'] = 'redis://user:pass@localhost:6380';
    const { connection } = await import('../src/config.js');
    const resolved = connection as unknown as {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };

    expect(resolved.host).toBe('localhost');
    expect(resolved.port).toBe(6380);
    expect(resolved.username).toBe('user');
    expect(resolved.password).toBe('pass');
  });

  it('supports rediss protocol', async () => {
    process.env['REDIS_URL'] = 'rediss://localhost:6380';
    const { connection } = await import('../src/config.js');
    const resolved = connection as unknown as { tls?: Record<string, unknown> };
    expect(resolved.tls).toEqual({});
  });

  it('wraps processor execution with metrics', async () => {
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    const { createWorker } = await import('../src/config.js');
    const processor = vi.fn(async () => ({ success: true }));

    const worker = createWorker('queue', processor) as unknown as {
      processor: (job: { id: string }) => Promise<unknown>;
    };
    const result = await worker.processor({
      id: 'job-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        metrics: expect.objectContaining({ durationMs: expect.any(Number) }),
      })
    );
  });

  it('returns error on processor crash', async () => {
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    const { createWorker } = await import('../src/config.js');
    const processor = vi.fn(async () => {
      throw new Error('boom');
    });

    const worker = createWorker('queue', processor) as unknown as {
      processor: (job: { id: string }) => Promise<unknown>;
    };
    const result = await worker.processor({
      id: 'job-2',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: 'boom',
      })
    );
  });
});
