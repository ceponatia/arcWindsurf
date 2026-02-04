/**
 * Simulation Hooks
 *
 * Integrates the simulation system with turn processing.
 * Migrated from packages/api/src/services/simulation-hooks.ts
 */
import type {
  HookNpcInfo,
  TurnHookInput,
  TurnHookResult,
  PeriodChangeHookInput,
  PeriodChangeHookResult,
  LocationChangeHookInput,
  LocationChangeHookResult,
  TimeSkipHookInput,
  TimeSkipHookResult,
} from '@minimal-rpg/schemas';

export type {
  HookNpcInfo,
  TurnHookInput,
  TurnHookResult,
  PeriodChangeHookInput,
  PeriodChangeHookResult,
  LocationChangeHookInput,
  LocationChangeHookResult,
  TimeSkipHookInput,
  TimeSkipHookResult,
};

// Logic for these hooks will depend on the bus and db implementations
// in the final refactored architecture.
