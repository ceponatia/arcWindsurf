import { signal } from '@preact/signals-react';
import type { ViewMode } from '../types.js';

export const viewMode = signal<ViewMode>('home');
export const overlayOpen = signal<boolean>(false);
export const selectedActorId = signal<string | null>(null);

export const setViewMode = (mode: ViewMode) => {
  viewMode.value = mode;
};

export const toggleOverlay = () => {
  overlayOpen.value = !overlayOpen.value;
};

export const setSelectedActorId = (id: string | null) => {
  selectedActorId.value = id;
};
