export interface SseEvent {
  event?: string;
  data: string;
  id?: string;
}

/**
 * Parse `text/event-stream` data into structured SSE events.
 *
 * This is intentionally minimal and supports the subset we emit:
 * - `event:`
 * - `id:`
 * - `data:` (may appear multiple times)
 */
export async function collectSseEvents(
  body: ReadableStream<Uint8Array>,
  options?: { maxEvents?: number; timeoutMs?: number }
): Promise<SseEvent[]> {
  const maxEvents = options?.maxEvents ?? 10_000;
  const timeoutMs = options?.timeoutMs ?? 30_000;

  const reader = body.getReader();
  const decoder = new TextDecoder();

  /**
   * SSE events are separated by a blank line.
   * Normalize CRLF to LF.
   */
  let buffer = '';
  const events: SseEvent[] = [];

  const timeout = setTimeout(() => {
    reader.cancel().catch(() => undefined);
  }, timeoutMs);

  try {
    while (events.length < maxEvents) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');

      while (events.length < maxEvents) {
        const sepIndex = buffer.indexOf('\n\n');
        if (sepIndex === -1) break;

        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        let event: string | undefined;
        let id: string | undefined;
        const dataLines: string[] = [];

        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event:')) {
            event = line.slice('event:'.length).trim();
            continue;
          }

          if (line.startsWith('id:')) {
            id = line.slice('id:'.length).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trim());
          }
        }

        const data = dataLines.join('\n');
        if (!event && data.length === 0) {
          continue;
        }

        const parsed: SseEvent = { data };
        if (event !== undefined) {
          parsed.event = event;
        }
        if (id !== undefined) {
          parsed.id = id;
        }

        events.push(parsed);
      }
    }

    return events;
  } finally {
    clearTimeout(timeout);
    await reader.cancel().catch(() => undefined);
  }
}
