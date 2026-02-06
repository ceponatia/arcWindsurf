import { describe, expect, it } from 'vitest';
import {
  ExamineObjectArgsSchema,
  NavigatePlayerArgsSchema,
  UseItemArgsSchema,
} from '../../../src/game/tools/tool-args.js';

describe('game/tools/tool-args', () => {
  it('validates examine_object args', () => {
    expect(ExamineObjectArgsSchema.safeParse({ target: 'door' }).success).toBe(true);
    expect(ExamineObjectArgsSchema.safeParse({}).success).toBe(false);
    expect(ExamineObjectArgsSchema.safeParse({ target: '' }).success).toBe(false);
  });

  it('validates navigate_player args', () => {
    expect(NavigatePlayerArgsSchema.safeParse({ direction: 'north' }).success).toBe(true);
    expect(NavigatePlayerArgsSchema.safeParse({ destination: 'tavern' }).success).toBe(true);
    expect(NavigatePlayerArgsSchema.safeParse({ describe_only: true }).success).toBe(true);
    expect(NavigatePlayerArgsSchema.safeParse({ direction: '' }).success).toBe(false);
  });

  it('validates use_item args', () => {
    expect(UseItemArgsSchema.safeParse({ item_name: 'potion' }).success).toBe(true);
    expect(UseItemArgsSchema.safeParse({ item_name: '' }).success).toBe(false);
    expect(UseItemArgsSchema.safeParse({}).success).toBe(false);
  });
});
