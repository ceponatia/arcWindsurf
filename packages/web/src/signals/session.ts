import { signal } from '@preact/signals-react';
import type { StreamStatus } from '../types.js';

export const sessionStatus = signal<StreamStatus>('disconnected');
export const currentSessionId = signal<string | null>(null);
export const currentTick = signal<number>(0);

export const updateSessionStatus = (status: StreamStatus) => {
  sessionStatus.value = status;
};

export const setSessionId = (id: string | null) => {
  currentSessionId.value = id;
};

export const incrementTick = () => {
  currentTick.value += 1;
};
