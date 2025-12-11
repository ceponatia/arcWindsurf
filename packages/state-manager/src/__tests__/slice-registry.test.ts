import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  StateManager,
  SliceNotFoundError,
  SliceRegistrationError,
  type StateSlice,
  type StatePatches,
} from '../index.js';

// =============================================================================
// Test Schemas
// =============================================================================

const ProximityStateSchema = z.object({
  engagements: z.record(
    z.string(),
    z.object({
      npcId: z.string(),
      bodyPart: z.string(),
      senseType: z.enum(['look', 'touch', 'smell', 'taste', 'hear']),
      intensity: z.enum(['casual', 'focused', 'intimate']),
      startedAt: z.number(),
      lastActiveAt: z.number(),
    })
  ),
  npcProximity: z.record(z.string(), z.enum(['distant', 'near', 'close', 'intimate'])),
});

type ProximityState = z.infer<typeof ProximityStateSchema>;

const InventoryStateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
    })
  ),
  capacity: z.number(),
});

type InventoryState = z.infer<typeof InventoryStateSchema>;

// =============================================================================
// Slice Registration Tests
// =============================================================================

describe('StateManager Slice Registry', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();
  });

  describe('registerSlice', () => {
    it('should register a slice successfully', () => {
      const slice: StateSlice<ProximityState> = {
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
        mergeStrategy: 'deep',
      };

      manager.registerSlice(slice);

      expect(manager.hasSlice('proximity')).toBe(true);
      expect(manager.getSlice('proximity')).toEqual(slice);
    });

    it('should throw when registering duplicate slice key', () => {
      const slice: StateSlice<ProximityState> = {
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
      };

      manager.registerSlice(slice);

      expect(() => manager.registerSlice(slice)).toThrow(SliceRegistrationError);
      expect(() => manager.registerSlice(slice)).toThrow('already registered');
    });

    it('should throw when custom merge strategy has no customMerge function', () => {
      const slice: StateSlice<ProximityState> = {
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
        mergeStrategy: 'custom',
        // Missing customMerge function
      };

      expect(() => manager.registerSlice(slice)).toThrow(SliceRegistrationError);
      expect(() => manager.registerSlice(slice)).toThrow('customMerge');
    });

    it('should allow custom merge strategy with customMerge function', () => {
      const slice: StateSlice<ProximityState> = {
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
        mergeStrategy: 'custom',
        customMerge: (baseline, overrides) => ({ ...baseline, ...overrides }) as ProximityState,
      };

      manager.registerSlice(slice);
      expect(manager.hasSlice('proximity')).toBe(true);
    });
  });

  describe('unregisterSlice', () => {
    it('should unregister an existing slice', () => {
      manager.registerSlice({
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
      });

      expect(manager.unregisterSlice('proximity')).toBe(true);
      expect(manager.hasSlice('proximity')).toBe(false);
    });

    it('should return false for non-existent slice', () => {
      expect(manager.unregisterSlice('nonexistent')).toBe(false);
    });
  });

  describe('getRegisteredSliceKeys', () => {
    it('should return empty array when no slices registered', () => {
      expect(manager.getRegisteredSliceKeys()).toEqual([]);
    });

    it('should return all registered slice keys', () => {
      manager.registerSlice({
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
      });

      manager.registerSlice({
        key: 'inventory',
        schema: InventoryStateSchema,
        defaultState: { items: [], capacity: 100 },
      });

      const keys = manager.getRegisteredSliceKeys();
      expect(keys).toContain('proximity');
      expect(keys).toContain('inventory');
      expect(keys).toHaveLength(2);
    });
  });
});

// =============================================================================
// Slice-Aware Operations Tests
// =============================================================================

describe('StateManager Slice-Aware Operations', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();

    manager.registerSlice<ProximityState>({
      key: 'proximity',
      schema: ProximityStateSchema,
      defaultState: { engagements: {}, npcProximity: {} },
      mergeStrategy: 'deep',
    });

    manager.registerSlice<InventoryState>({
      key: 'inventory',
      schema: InventoryStateSchema,
      defaultState: { items: [], capacity: 100 },
      mergeStrategy: 'deep',
    });
  });

  describe('getEffectiveStateForSlice', () => {
    it('should use slice default state when baseline not provided', () => {
      const result = manager.getEffectiveStateForSlice<ProximityState>('proximity');

      expect(result.effective).toEqual({ engagements: {}, npcProximity: {} });
    });

    it('should merge baseline with overrides using deep strategy', () => {
      const baseline: ProximityState = {
        engagements: {},
        npcProximity: { taylor: 'distant' },
      };

      const overrides = {
        npcProximity: { taylor: 'close' as const },
      };

      const result = manager.getEffectiveStateForSlice<ProximityState>(
        'proximity',
        baseline,
        overrides
      );

      expect(result.effective.npcProximity['taylor']).toBe('close');
    });

    it('should throw SliceNotFoundError for unregistered slice', () => {
      expect(() => manager.getEffectiveStateForSlice('nonexistent')).toThrow(SliceNotFoundError);
    });

    it('should use replace strategy when configured', () => {
      manager.unregisterSlice('proximity');
      manager.registerSlice<ProximityState>({
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
        mergeStrategy: 'replace',
      });

      const baseline: ProximityState = {
        engagements: {},
        npcProximity: { taylor: 'distant', alex: 'near' },
      };

      const overrides = {
        npcProximity: { taylor: 'close' as const },
      };

      const result = manager.getEffectiveStateForSlice<ProximityState>(
        'proximity',
        baseline,
        overrides
      );

      // Replace strategy replaces at object level, not deep merge
      expect(result.effective.npcProximity).toEqual({ taylor: 'close' });
    });

    it('should use custom merge when configured', () => {
      manager.unregisterSlice('proximity');
      manager.registerSlice<ProximityState>({
        key: 'proximity',
        schema: ProximityStateSchema,
        defaultState: { engagements: {}, npcProximity: {} },
        mergeStrategy: 'custom',
        customMerge: (baseline, overrides) => {
          // Custom logic: always set intensity to 'intimate' for any engagement
          const result = { ...baseline };
          if (overrides.engagements) {
            result.engagements = { ...result.engagements };
            for (const [key, engagement] of Object.entries(overrides.engagements)) {
              if (engagement) {
                // Cast to full engagement type since we know it's complete from overrides
                result.engagements[key] = {
                  ...(engagement as ProximityState['engagements'][string]),
                  intensity: 'intimate',
                };
              }
            }
          }
          return result;
        },
      });

      const baseline: ProximityState = {
        engagements: {},
        npcProximity: {},
      };

      const overrides: Partial<ProximityState> = {
        engagements: {
          'taylor:hair:smell': {
            npcId: 'taylor',
            bodyPart: 'hair',
            senseType: 'smell' as const,
            intensity: 'casual' as const,
            startedAt: 1,
            lastActiveAt: 1,
          },
        },
      };

      const result = manager.getEffectiveStateForSlice<ProximityState>(
        'proximity',
        baseline,
        overrides
      );

      // Custom merge should have changed intensity to 'intimate'
      expect(result.effective.engagements['taylor:hair:smell']?.intensity).toBe('intimate');
    });
  });

  describe('applyPatchesToSlice', () => {
    it('should apply patches to a registered slice', () => {
      const baseline: ProximityState = {
        engagements: {},
        npcProximity: {},
      };

      const patches = [
        {
          op: 'add' as const,
          path: '/npcProximity/taylor',
          value: 'close',
        },
      ];

      const result = manager.applyPatchesToSlice<ProximityState>(
        'proximity',
        baseline,
        {},
        patches
      );

      expect(result.newEffective.npcProximity['taylor']).toBe('close');
      expect(result.patchesApplied).toBe(1);
    });

    it('should use slice default when baseline not provided', () => {
      const patches = [
        {
          op: 'add' as const,
          path: '/npcProximity/taylor',
          value: 'near',
        },
      ];

      const result = manager.applyPatchesToSlice<ProximityState>(
        'proximity',
        undefined,
        {},
        patches
      );

      expect(result.newEffective.npcProximity['taylor']).toBe('near');
    });

    it('should throw SliceNotFoundError for unregistered slice', () => {
      expect(() => manager.applyPatchesToSlice('nonexistent', {}, {}, [])).toThrow(
        SliceNotFoundError
      );
    });
  });

  describe('validateSlice', () => {
    it('should validate valid state', () => {
      const state: ProximityState = {
        engagements: {},
        npcProximity: { taylor: 'close' },
      };

      const result = manager.validateSlice<ProximityState>('proximity', state);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(state);
    });

    it('should reject invalid state', () => {
      const invalidState = {
        engagements: {},
        npcProximity: { taylor: 'invalid-value' },
      };

      const result = manager.validateSlice('proximity', invalidState);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should throw SliceNotFoundError for unregistered slice', () => {
      expect(() => manager.validateSlice('nonexistent', {})).toThrow(SliceNotFoundError);
    });
  });
});

// =============================================================================
// Multi-Slice Patch Tests
// =============================================================================

describe('StateManager applyMultiSlicePatches', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();

    manager.registerSlice<ProximityState>({
      key: 'proximity',
      schema: ProximityStateSchema,
      defaultState: { engagements: {}, npcProximity: {} },
    });

    manager.registerSlice<InventoryState>({
      key: 'inventory',
      schema: InventoryStateSchema,
      defaultState: { items: [], capacity: 100 },
    });
  });

  it('should apply patches to multiple slices', () => {
    const sliceStates = {
      proximity: {
        baseline: { engagements: {}, npcProximity: {} } as ProximityState,
        overrides: {},
      },
      inventory: {
        baseline: { items: [], capacity: 100 } as InventoryState,
        overrides: {},
      },
    };

    const patches: StatePatches = {
      proximity: [{ op: 'add', path: '/npcProximity/taylor', value: 'close' }],
      inventory: [{ op: 'add', path: '/items/-', value: { id: '1', name: 'Key', quantity: 1 } }],
    };

    const result = manager.applyMultiSlicePatches(sliceStates, patches);

    expect(result.allSucceeded).toBe(true);
    expect(result.totalPatchesApplied).toBe(2);

    const proximityResult = result.results['proximity'];
    expect((proximityResult?.newEffective as ProximityState).npcProximity['taylor']).toBe('close');

    const inventoryResult = result.results['inventory'];
    expect((inventoryResult?.newEffective as InventoryState).items).toHaveLength(1);
  });

  it('should skip slices with no patches', () => {
    const sliceStates = {
      proximity: {
        baseline: { engagements: {}, npcProximity: {} } as ProximityState,
        overrides: {},
      },
    };

    const patches: StatePatches = {
      proximity: [],
      inventory: [],
    };

    const result = manager.applyMultiSlicePatches(sliceStates, patches);

    expect(result.allSucceeded).toBe(true);
    expect(result.totalPatchesApplied).toBe(0);
    expect(Object.keys(result.results)).toHaveLength(0);
  });

  it('should handle patches for unregistered slices gracefully', () => {
    const sliceStates = {
      custom: {
        baseline: { value: 0 },
        overrides: {},
      },
    };

    const patches: StatePatches = {
      custom: [{ op: 'replace', path: '/value', value: 42 }],
    };

    const result = manager.applyMultiSlicePatches(sliceStates, patches);

    expect(result.allSucceeded).toBe(true);
    expect(result.totalPatchesApplied).toBe(1);
    expect((result.results['custom']?.newEffective as { value: number }).value).toBe(42);
  });

  it('should use registered slice defaults when sliceState not provided', () => {
    const patches: StatePatches = {
      proximity: [{ op: 'add', path: '/npcProximity/taylor', value: 'near' }],
    };

    const result = manager.applyMultiSlicePatches({}, patches);

    expect(result.allSucceeded).toBe(true);
    const proximityResult = result.results['proximity'];
    expect((proximityResult?.newEffective as ProximityState).npcProximity['taylor']).toBe('near');
  });

  it('should track failed slices when patches fail', () => {
    const sliceStates = {
      proximity: {
        baseline: { engagements: {}, npcProximity: {} } as ProximityState,
        overrides: {},
      },
    };

    const patches: StatePatches = {
      proximity: [
        // This patch will fail - trying to replace a non-existent path
        { op: 'replace', path: '/nonexistent/path', value: 'fail' },
      ],
    };

    const result = manager.applyMultiSlicePatches(sliceStates, patches);

    expect(result.allSucceeded).toBe(false);
    expect(result.failedSlices).toContain('proximity');
    expect(result.results['proximity']?.failedPatches).toBeDefined();
  });

  it('should continue processing other slices when one fails', () => {
    const sliceStates = {
      proximity: {
        baseline: { engagements: {}, npcProximity: {} } as ProximityState,
        overrides: {},
      },
      inventory: {
        baseline: { items: [], capacity: 100 } as InventoryState,
        overrides: {},
      },
    };

    const patches: StatePatches = {
      proximity: [{ op: 'replace', path: '/nonexistent', value: 'fail' }],
      inventory: [{ op: 'add', path: '/items/-', value: { id: '1', name: 'Key', quantity: 1 } }],
    };

    const result = manager.applyMultiSlicePatches(sliceStates, patches);

    expect(result.allSucceeded).toBe(false);
    expect(result.failedSlices).toContain('proximity');
    expect(result.failedSlices).not.toContain('inventory');

    // Inventory should have succeeded
    expect((result.results['inventory']?.newEffective as InventoryState).items).toHaveLength(1);
    expect(result.totalPatchesApplied).toBe(1);
  });
});
