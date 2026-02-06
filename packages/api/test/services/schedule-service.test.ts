import { describe, expect, it } from 'vitest';
import {
  resolveNpcScheduleAtTime,
  resolveNpcSchedulesBatch,
} from '../../src/services/schedule-service.js';

describe('services/schedule-service', () => {
  it('re-exports schedule helpers', () => {
    expect(typeof resolveNpcScheduleAtTime).toBe('function');
    expect(typeof resolveNpcSchedulesBatch).toBe('function');
  });
});
