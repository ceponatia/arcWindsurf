import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  StateManager,
  StateValidationError,
  PatchValidationError,
  SliceRegistrationError,
  deepMerge,
  deepDiff,
  deepEqual,
  getAtPath,
  setAtPath,
} from '../src/index.js';
import type { Operation } from '../src/index.js';

describe('utility functions', () => {
  describe('deepMerge', () => {
    const cases = [
      {
        name: 'deep merges nested overrides and tracks paths',
        target: { stats: { health: 100, mana: 50 }, tags: ['hero'] },
        source: { stats: { mana: 20 } },
        expected: { stats: { health: 100, mana: 20 }, tags: ['hero'] },
        paths: ['stats.mana'],
      },
      {
        name: 'replaces arrays wholesale',
        target: { tags: ['a', 'b'] },
        source: { tags: ['b'] },
        expected: { tags: ['b'] },
        paths: ['tags'],
      },
    ];

    cases.forEach(({ name, target, source, expected, paths }) => {
      it(name, () => {
        const { merged, overriddenPaths } = deepMerge(target, source, true);
        expect(merged).toEqual(expected);
        expect(overriddenPaths).toEqual(paths);
      });
    });
  });

  describe('deepDiff', () => {
    const cases: {
      name: string;
      original: Record<string, unknown>;
      modified: Record<string, unknown>;
      expectedDiff: Record<string, unknown>;
      addedPaths: string[];
      modifiedPaths: string[];
      removedPaths: string[];
    }[] = [
      {
        name: 'captures added and modified paths',
        original: { stats: { health: 100, mana: 50 }, tags: ['hero'] },
        modified: { stats: { health: 75, mana: 50, stamina: 20 }, tags: ['veteran'] },
        expectedDiff: { stats: { health: 75, stamina: 20 }, tags: ['veteran'] },
        addedPaths: ['stats.stamina'],
        modifiedPaths: ['stats.health', 'tags'],
        removedPaths: [],
      },
      {
        name: 'reports removed keys alongside additions',
        original: { profile: { name: 'Aria', level: 3 } },
        modified: { profile: { name: 'Aria', title: 'Hero' } },
        expectedDiff: { profile: { title: 'Hero' } },
        addedPaths: ['profile.title'],
        modifiedPaths: [],
        removedPaths: ['profile.level'],
      },
    ];

    cases.forEach(
      ({ name, original, modified, expectedDiff, addedPaths, modifiedPaths, removedPaths }) => {
        it(name, () => {
          const result = deepDiff(original, modified);
          expect(result.diff).toEqual(expectedDiff);
          expect(result.addedPaths).toEqual(addedPaths);
          expect(result.modifiedPaths).toEqual(modifiedPaths);
          expect(result.removedPaths).toEqual(removedPaths);
          expect(result.isIdentical).toBe(false);
        });
      }
    );
  });

  describe('deepEqual', () => {
    const cases = [
      { name: 'identical primitives', a: 1, b: 1, equal: true },
      { name: 'different primitives', a: 1, b: 2, equal: false },
      { name: 'equal objects', a: { x: 1, y: { z: 2 } }, b: { x: 1, y: { z: 2 } }, equal: true },
      { name: 'different arrays', a: [1, 2], b: [1, 3], equal: false },
    ];

    cases.forEach(({ name, a, b, equal }) => {
      it(name, () => {
        expect(deepEqual(a, b)).toBe(equal);
      });
    });
  });

  it('gets and sets values at nested paths', () => {
    const doc: Record<string, unknown> = {};
    setAtPath(doc, 'state.meta.turn', 4);
    expect(doc).toEqual({ state: { meta: { turn: 4 } } });
    expect(getAtPath(doc, 'state.meta.turn')).toBe(4);
    expect(getAtPath(doc, 'state.missing')).toBeUndefined();
  });
});

describe('StateManager', () => {
  it('merges baseline and overrides without mutating baseline', () => {
    const manager = new StateManager();
    const baseline = { stats: { health: 100, mana: 40 } };
    const overrides = { stats: { mana: 25 } };

    const result = manager.getEffectiveState(baseline, overrides);

    expect(result.effective).toEqual({ stats: { health: 100, mana: 25 } });
    expect(result.overriddenPaths).toEqual(['stats.mana']);
    expect(baseline.stats.mana).toBe(40);
  });

  it('throws StateValidationError when merge validation fails', () => {
    const manager = new StateManager({ validateOnMerge: true });
    const schema = z.object({ stats: z.object({ mana: z.number().min(0) }) });

    expect(() => manager.getEffectiveState({ stats: { mana: -1 } }, {}, { schema })).toThrow(
      StateValidationError
    );
  });

  it('applies patches and returns minimal diff overrides', () => {
    const manager = new StateManager();
    const baseline = { counter: 0 };
    const patches: Operation[] = [{ op: 'replace', path: '/counter', value: 3 }];

    const result = manager.applyPatches(baseline, {}, patches);

    expect(result.newEffective).toEqual({ counter: 3 });
    expect(result.newOverrides).toEqual({ counter: 3 });
    expect(result.modifiedPaths).toEqual(['counter']);
    expect(result.patchesApplied).toBe(1);
  });

  it('can return full state when minimal diff is disabled', () => {
    const manager = new StateManager();
    const baseline = { counter: 1 };
    const patches: Operation[] = [{ op: 'add', path: '/active', value: true }];

    const result = manager.applyPatches(baseline, {}, patches, { computeMinimalDiff: false });

    expect(result.newEffective).toEqual({ counter: 1, active: true });
    expect(result.newOverrides).toEqual({ counter: 1, active: true });
    expect(result.modifiedPaths).toEqual(['active']);
  });

  it('continues on patch errors when allowPartialFailure is true', () => {
    const manager = new StateManager();
    const baseline = { value: 1 };
    const patches: Operation[] = [
      { op: 'replace', path: '/value', value: 2 },
      { op: 'remove', path: '/missing' },
    ];

    const result = manager.applyPatches(baseline, {}, patches, { allowPartialFailure: true });

    expect(result.patchesApplied).toBe(1);
    expect(result.failedPatches ?? []).toHaveLength(1);
    expect(result.failedPatches?.[0]?.index).toBe(1);
    expect(result.newEffective).toEqual({ value: 2 });
  });

  it('validates patches when requested', () => {
    const manager = new StateManager({ validatePatches: true });
    const baseline = { value: 1 };
    const patches: Operation[] = [{ op: 'replace', path: 'value', value: 2 }];

    expect(() => manager.applyPatches(baseline, {}, patches)).toThrow(PatchValidationError);
  });

  it('enforces slice registration constraints', () => {
    const manager = new StateManager();
    const schema = z.object({ value: z.number() });

    manager.registerSlice({ key: 'alpha', schema, defaultState: { value: 1 } });

    expect(() =>
      manager.registerSlice({ key: 'alpha', schema, defaultState: { value: 1 } })
    ).toThrow(SliceRegistrationError);
    expect(() =>
      manager.registerSlice({
        key: 'custom',
        schema,
        defaultState: { value: 1 },
        mergeStrategy: 'custom',
      })
    ).toThrow(SliceRegistrationError);
  });

  it('supports slice replace strategy', () => {
    const manager = new StateManager();
    const schema = z.object({ score: z.number(), level: z.number() });

    manager.registerSlice({
      key: 'replaceable',
      schema,
      defaultState: { score: 0, level: 1 },
      mergeStrategy: 'replace',
    });

    const result = manager.getEffectiveStateForSlice(
      'replaceable',
      { score: 1, level: 2 },
      { score: 9 }
    );

    expect(result.effective).toEqual({ score: 9, level: 2 });
    expect(result.overriddenPaths).toEqual(['score']);
  });

  it('validates slice patches with schema', () => {
    const manager = new StateManager();
    const schema = z.object({ value: z.number().min(0) });

    manager.registerSlice({ key: 'beta', schema, defaultState: { value: 1 } });

    expect(() =>
      manager.applyPatchesToSlice('beta', undefined, {}, [
        { op: 'replace', path: '/value', value: -5 },
      ])
    ).toThrow(StateValidationError);
  });

  it('applies multi-slice patches and aggregates results', () => {
    const manager = new StateManager();
    const schema = z.object({ count: z.number() });
    manager.registerSlice({ key: 'alpha', schema, defaultState: { count: 0 } });

    const patches: Record<string, Operation[]> = {
      alpha: [{ op: 'replace', path: '/count', value: 2 }],
    };

    const result = manager.applyMultiSlicePatches(
      { alpha: { baseline: { count: 0 }, overrides: {} } },
      patches
    );

    expect(result.allSucceeded).toBe(true);
    expect(result.totalPatchesApplied).toBe(1);
    const alphaResult = result.results['alpha'];
    expect(alphaResult).toBeDefined();
    expect(alphaResult?.newOverrides).toEqual({ count: 2 });
  });

  it('captures failures for unregistered slices in multi-slice patches', () => {
    const manager = new StateManager();
    const patches: Record<string, Operation[]> = {
      ghost: [{ op: 'replace', path: '/value', value: 1 }],
    };

    const result = manager.applyMultiSlicePatches({}, patches);

    expect(result.allSucceeded).toBe(false);
    expect(result.failedSlices).toEqual(['ghost']);
    const ghostResult = result.results['ghost'];
    expect(ghostResult).toBeDefined();
    expect(ghostResult?.failedPatches ?? []).toHaveLength(1);
    expect(ghostResult?.patchesApplied).toBe(0);
  });

  it('validates slice state without throwing', () => {
    const manager = new StateManager();
    const schema = z.object({ value: z.number().min(1) });
    manager.registerSlice({ key: 'gamma', schema, defaultState: { value: 1 } });

    const result = manager.validateSlice('gamma', { value: 0 });

    expect(result.success).toBe(false);
    const errors = result.errors ?? [];
    expect(errors[0]?.path).toBe('value');
  });
});
