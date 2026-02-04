import type { StreamStatus } from '../types.js';

export interface StreamHandlers {
  onMessage: (data: unknown) => void;
  onStatusChange: (status: StreamStatus) => void;
  onError?: (error: unknown) => void;
}

/**
 * connectStream handles the SSE connection lifecycle and auto-reconnect logic.
 */
export function connectStream(url: string, handlers: StreamHandlers) {
  let eventSource: EventSource | null = null;
  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 1000;

  const connect = () => {
    handlers.onStatusChange('connecting');
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.info(`[Stream] Connected to ${url}`);
      handlers.onStatusChange('connected');
      retryCount = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : String(event.data);
        const data: unknown = JSON.parse(raw);
        handlers.onMessage(data);
      } catch (err) {
        console.error('[Stream] Failed to parse message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[Stream] EventSource error:', err);
      handlers.onStatusChange('error');
      eventSource?.close();

      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.info(`[Stream] Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(connect, delay);
        retryCount++;
      } else {
        handlers.onStatusChange('disconnected');
        handlers.onError?.(err);
      }
    };
  };

  connect();

  return () => {
    console.info('[Stream] Closing connection');
    eventSource?.close();
  };
}
