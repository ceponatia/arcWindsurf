import { trace, type Span } from '@opentelemetry/api';
import { type WorldEvent } from '@minimal-rpg/schemas';

const tracer = trace.getTracer('world-bus');

export type BusMiddleware = (
  event: WorldEvent,
  next: () => Promise<void>
) => Promise<void>;

/**
 * OpenTelemetry middleware for tracking event flow.
 */
export const telemetryMiddleware: BusMiddleware = async (event, next) => {
  return tracer.startActiveSpan(`bus:${event.type}`, async (span: Span) => {
    try {
      span.setAttribute('event.type', event.type);
      
      const rawEvent = event as Record<string, unknown>;
      if (typeof rawEvent['sessionId'] === 'string') {
        span.setAttribute('session.id', rawEvent['sessionId']);
      }
      
      await next();
      span.setStatus({ code: 0 }); // Ok
    } catch (err) {
      const error = err as Error;
      span.recordException(error);
      span.setStatus({ code: 1, message: error.message }); // Error
      throw err;
    } finally {
      span.end();
    }
  });
};
