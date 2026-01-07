import { signal } from '@preact/signals-react';
import type { StreamEvent } from '../types.js';

export const eventLog = signal<StreamEvent[]>([]);
export const lastEvent = signal<StreamEvent | null>(null);

export const addEvent = (event: StreamEvent) => {
  eventLog.value = [...eventLog.value, event];
  lastEvent.value = event;

  // Keep log at reasonable size
  if (eventLog.value.length > 100) {
    eventLog.value = eventLog.value.slice(-100);
  }
};

export const clearEvents = () => {
  eventLog.value = [];
  lastEvent.value = null;
};
