import { signal } from '@preact/signals-react';

export const eventLog = signal<any[]>([]);
export const lastEvent = signal<any | null>(null);

export const addEvent = (event: any) => {
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
