import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { StateManager, StateValidationError, PatchValidationError } from '../manager.js';
import type { DeepPartial } from '../types.js';
import type { Operation } from 'fast-json-patch';

// Test schema for validation tests
const TestProfileSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
  tags: z.array(z.string()),
});

type TestProfile = z.infer<typeof TestProfileSchema>;

describe('StateManager', () => {
  describe('getEffectiveState', () => {
    it('returns baseline when no overrides', () => {
      const manager = new StateManager();
      const baseline = { a: 1, b: { c: 2 } };
      const result = manager.getEffectiveState(baseline, {});
      expect(result.effective).toEqual(baseline);
    });

    it('merges overrides into baseline', () => {
      const manager = new StateManager();
      const baseline = { a: 1, b: { c: 2, d: 3 } };
      const overrides = { b: { c: 20 } };
      const result = manager.getEffectiveState(baseline, overrides);
      expect(result.effective).toEqual({ a: 1, b: { c: 20, d: 3 } });
    });

    it('tracks overridden paths', () => {
      const manager = new StateManager();
      const baseline = { a: 1, b: { c: 2 } };
      const overrides = { a: 10, b: { c: 20 } };
      const result = manager.getEffectiveState(baseline, overrides);
      expect(result.overriddenPaths).toContain('a');
      expect(result.overriddenPaths).toContain('b.c');
    });

    it('does not mutate baseline', () => {
      const manager = new StateManager();
      const baseline = { a: 1, b: { c: 2 } };
      const overrides = { b: { c: 20 } };
      manager.getEffectiveState(baseline, overrides);
      expect(baseline.b.c).toBe(2);
    });

    it('validates against schema when enabled', () => {
      const manager = new StateManager({ validateOnMerge: true });
      const baseline: TestProfile = {
        name: 'Test',
        age: 25,
        settings: { theme: 'light', notifications: true },
        tags: ['tag1'],
      };
      const overrides = { age: 30 };

      const result = manager.getEffectiveState(baseline, overrides, {
        schema: TestProfileSchema,
      });
      expect(result.effective.age).toBe(30);
    });

    it('throws on schema validation failure when enabled', () => {
      const manager = new StateManager({ validateOnMerge: true });
      const baseline = {
        name: 'Test',
        age: 25,
        settings: { theme: 'light', notifications: true },
        tags: ['tag1'],
      };
      const overrides = { age: -5 }; // Invalid: negative age

      expect(() =>
        manager.getEffectiveState(baseline, overrides, {
          schema: TestProfileSchema,
        })
      ).toThrow(StateValidationError);
    });

    it('replaces arrays instead of merging them', () => {
      const manager = new StateManager();
      const baseline = { tags: ['a', 'b', 'c'] };
      const overrides = { tags: ['x', 'y'] };
      const result = manager.getEffectiveState(baseline, overrides);
      expect(result.effective.tags).toEqual(['x', 'y']);
    });
  });

  describe('applyPatches', () => {
    it('applies simple replace patch', () => {
      const manager = new StateManager();
      const baseline: { a: number; b: number } = { a: 1, b: 2 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/a', value: 10 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newEffective.a).toBe(10);
      expect(result.patchesApplied).toBe(1);
    });

    it('applies add patch', () => {
      const manager = new StateManager();
      const baseline = { a: 1 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'add', path: '/b', value: 2 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newEffective).toEqual({ a: 1, b: 2 });
    });

    it('applies remove patch', () => {
      const manager = new StateManager();
      const baseline = { a: 1, b: 2 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'remove', path: '/b' }];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newEffective).toEqual({ a: 1 });
    });

    it('applies multiple patches in order', () => {
      const manager = new StateManager();
      const baseline: { count: number } = { count: 0 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [
        { op: 'replace', path: '/count', value: 1 },
        { op: 'replace', path: '/count', value: 2 },
        { op: 'replace', path: '/count', value: 3 },
      ];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newEffective.count).toBe(3);
      expect(result.patchesApplied).toBe(3);
    });

    it('computes minimal diff by default', () => {
      const manager = new StateManager({ computeMinimalDiff: true });
      const baseline = { a: 1, b: 2, c: 3 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/b', value: 20 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      // Only /b should be in overrides, not the entire state
      expect(result.newOverrides).toEqual({ b: 20 });
    });

    it('returns full state when minimal diff disabled', () => {
      const manager = new StateManager({ computeMinimalDiff: false });
      const baseline: { a: number; b: number } = { a: 1, b: 2 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/b', value: 20 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newOverrides).toEqual({ a: 1, b: 20 });
    });

    it('reports modified paths', () => {
      const manager = new StateManager();
      const baseline = { a: { x: 1 }, b: 2 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/a/x', value: 10 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.modifiedPaths).toContain('a.x');
    });

    it('throws on invalid patch when validation enabled', () => {
      const manager = new StateManager({ validatePatches: true });
      const baseline = { a: 1 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/nonexistent', value: 10 }];

      expect(() => manager.applyPatches(baseline, overrides, patches)).toThrow(
        PatchValidationError
      );
    });

    it('collects failed patches when allowPartialFailure is true', () => {
      const manager = new StateManager();
      const baseline = { a: 1 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [
        { op: 'replace', path: '/a', value: 10 },
        { op: 'replace', path: '/nonexistent/deep', value: 20 },
        { op: 'add', path: '/b', value: 30 },
      ];

      const result = manager.applyPatches(baseline, overrides, patches, {
        allowPartialFailure: true,
      });

      expect(result.patchesApplied).toBe(2);
      expect(result.failedPatches).toHaveLength(1);
      expect(result.failedPatches?.[0]?.index).toBe(1);
    });

    it('validates patched result against schema', () => {
      const manager = new StateManager();
      const baseline: TestProfile = {
        name: 'Test',
        age: 25,
        settings: { theme: 'light', notifications: true },
        tags: ['tag1'],
      };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/age', value: -5 }];

      expect(() =>
        manager.applyPatches(baseline, overrides, patches, {
          schema: TestProfileSchema,
        })
      ).toThrow(StateValidationError);
    });

    it('applies patches to effective state including overrides', () => {
      const manager = new StateManager();
      const baseline = { a: 1, b: 2 };
      const overrides = { b: 20 };
      const patches: Operation[] = [{ op: 'replace', path: '/b', value: 25 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newEffective.b).toBe(25);
    });
  });

  describe('diff', () => {
    it('returns empty diff for identical objects', () => {
      const manager = new StateManager();
      const obj = { a: 1, b: { c: 2 } };
      const result = manager.diff(obj, { ...obj });
      expect(result.isIdentical).toBe(true);
    });

    it('detects changes', () => {
      const manager = new StateManager();
      const original = { a: 1, b: 2 };
      const modified = { a: 1, b: 20 };
      const result = manager.diff(original, modified);
      expect(result.modifiedPaths).toContain('b');
      expect(result.diff).toEqual({ b: 20 });
    });
  });

  describe('validate', () => {
    it('returns success for valid data', () => {
      const manager = new StateManager();
      const data: TestProfile = {
        name: 'Test',
        age: 25,
        settings: { theme: 'light', notifications: true },
        tags: ['tag1'],
      };

      const result = manager.validate(data, TestProfileSchema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('returns errors for invalid data', () => {
      const manager = new StateManager();
      const data = {
        name: '',
        age: -5,
        settings: { theme: 'invalid', notifications: 'yes' },
        tags: 'not-an-array',
      };

      const result = manager.validate(data, TestProfileSchema);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('uses default configuration', () => {
      const manager = new StateManager();
      const baseline = { a: 1 };
      const overrides: DeepPartial<typeof baseline> = {};
      const patches: Operation[] = [{ op: 'replace', path: '/a', value: 2 }];

      // Should not throw even with invalid schema (validation disabled by default)
      const result = manager.applyPatches(baseline, overrides, patches);
      expect(result.newEffective.a).toBe(2);
    });

    it('respects custom configuration', () => {
      const manager = new StateManager({
        computeMinimalDiff: false,
      });
      const baseline = { a: 1, b: 2 };
      const overrides = {};
      const patches: Operation[] = [{ op: 'replace', path: '/a', value: 10 }];

      const result = manager.applyPatches(baseline, overrides, patches);
      // Full state returned since minimal diff is disabled
      expect(result.newOverrides).toEqual({ a: 10, b: 2 });
    });
  });
});
