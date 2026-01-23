import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectStream } from '../src/services/stream.js';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  url: string;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

describe('connectStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles open, message, and error', () => {
    const onMessage = vi.fn();
    const onStatusChange = vi.fn();

    const disconnect = connectStream('http://example.com', { onMessage, onStatusChange });

    const instance = MockEventSource.instances[0];
    if (!instance) {
      throw new Error('Missing EventSource instance');
    }
    instance.onopen?.(new Event('open'));
    expect(onStatusChange).toHaveBeenCalledWith('connected');

    instance.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ ok: true }) }));
    expect(onMessage).toHaveBeenCalledWith({ ok: true });

    instance.onerror?.(new Event('error'));
    expect(onStatusChange).toHaveBeenCalledWith('error');

    disconnect();
    expect(instance.closed).toBe(true);
  });
});
