import { vi } from 'vitest';

vi.mock('@minimal-rpg/bus', () => {
  return {
    worldBus: {
      emit: vi.fn(async () => undefined),
      subscribe: vi.fn(async () => undefined),
      unsubscribe: vi.fn(() => undefined),
    },
  };
});
